# Análisis y Arquitectura — Software para Complejo Deportivo

## 0. Redefinición del alcance real

Lo que describís no es "un sistema de cuotas con reservas" — es un **sistema de gestión operativa de un complejo** que tiene tres capas que interactúan entre sí:

1. **Control de acceso** (quién entra y sale del predio)
2. **Alquiler y administración de canchas** (fútbol, pádel, y lo que sumen a futuro)
3. **Gestión de personas y cobros** (socios, no-socios, empleados, profesores)

La clave de todo el análisis es esta: **un complejo grande no falla por falta de funcionalidades, falla por mal diseño de los datos base**. Si las entidades de `Persona`, `Espacio` (cancha) y `Movimiento` (pago/acceso/reserva) están bien pensadas desde el día 1, podés agregar módulos sin reescribir nada. Si no, cada funcionalidad nueva rompe la anterior. Por eso el foco inicial va ahí, no en features.

## 1. Qué necesita en realidad (análisis a fondo, módulo por módulo)

### 1.1 Control de acceso (entrada/salida)
Esto es lo nuevo respecto a lo que hablamos antes, y tiene varias formas de resolverse — no necesariamente con torniquetes:

| Opción | Costo/complejidad | Cuándo conviene |
|---|---|---|
| Check-in manual por recepción (buscar socio, marcar entrada) | Baja | Para arrancar, complejos medianos |
| QR dinámico (app o carnet impreso) escaneado por tablet en recepción | Media | Buen equilibrio costo/profesionalismo |
| Tarjeta RFID/NFC + lector en molinete | Alta (hardware) | Complejos grandes con flujo constante, presupuesto para hardware |
| Biometría | Alta, y fricción legal (datos biométricos) | Rara vez se justifica, evitar salvo pedido explícito |

**Recomendación**: arrancar con QR (el socio tiene un carnet digital con QR único, recepción lo escanea con la cámara de una tablet/celu). Es profesional, barato, y no depende de instalar hardware físico. El molinete físico se puede sumar después sin cambiar el modelo de datos, porque el "evento de acceso" ya está modelado igual.

Esto también resuelve control de morosos: si intentás escanear el QR de alguien con cuota vencida, el sistema puede alertar a recepción en el momento (no bloquear automáticamente — dejar que decida el humano).

### 1.2 Canchas (fútbol + pádel + lo que venga)
No modelar "cancha de pádel" y "cancha de fútbol" como cosas distintas — modelar **`Espacio`** genérico con un tipo, precio por hora, y capacidad. Así cuando sumen canchas de vóley, tenis, o lo que sea, no hay que tocar código, solo agregar una fila.

Cosas que en complejos grandes casi siempre terminan necesitando y conviene prever desde el modelo (aunque no se construyan todavía):
- **Alquiler de accesorios** (paletas, pelotas, pecheras) — ítems separados de la reserva
- **Turnos fijos/abonados** (el mismo cliente reserva la misma cancha, mismo día/hora, todas las semanas) — esto es distinto a una reserva suelta y si no se piensa desde el modelo se vuelve un dolor de cabeza
- **Bloqueo por mantenimiento** (cancha en refacción)
- **Overbooking** — dos personas reservando el mismo horario al mismo tiempo (requiere transacciones atómicas en la base, no es un detalle menor)

### 1.3 Personas
No todas las personas son "socios". En un complejo grande normalmente hay:
- Socios (pagan cuota, tienen beneficios)
- No-socios / invitados (pagan por uso puntual, sin cuota)
- Empleados (recepción, mantenimiento, profesores)
- Profesores/entrenadores (dan clases, pueden tener comisión por alumno)

Modelar esto desde el principio como **`Persona` con un rol**, en vez de tablas separadas para cada tipo, evita duplicar lógica de "buscar por DNI", "historial de pagos", etc.

### 1.4 Cobros
Mismo criterio: no separar "cuota" de "alquiler de cancha" de "venta de accesorio" como conceptos distintos en el sistema — todos son un **`Movimiento` de cobro** con un tipo y un origen. Esto es lo que te permite después sacar un reporte de "ingresos totales del mes" sin tener que sumar cinco tablas distintas a mano.

### 1.5 Lo que probablemente no pensaste pero un complejo grande termina necesitando
- **Buffet/kiosco** (venta de bebidas, snacks) — un mini punto de venta
- **Clases y torneos** (inscripciones, cupos)
- **Reportes de ocupación por franja horaria** — para saber qué horarios conviene subir de precio
- **Facturación** (boleta/factura, sobre todo si crecen y AFIP empieza a pedir cuentas)
- **Multi-usuario con roles** (recepción no debería poder borrar pagos, solo el admin)

No hace falta construir todo esto ahora — pero si el modelo de datos los contempla desde el día 1 (aunque el módulo no exista todavía), evitás reescribir todo cuando el complejo crezca. Esa es la diferencia entre "escalable" y "hecho para tirar".

## 2. Simplicidad de uso vs. robustez — cómo se logran las dos

Esto es lo que más termina rompiendo estos proyectos: se confunde "robusto" con "complicado de usar", y "simple de usar" con "hecho con poco criterio técnico". Son ejes independientes:

- **Robusto/escalable** = decisiones de arquitectura (modelo de datos bien pensado, transacciones seguras, código organizado en módulos)
- **Simple de usar** = decisiones de UI/UX (pantallas con pocos pasos, roles bien definidos, sin jerga técnica)

Se puede tener ambas si el backend está bien pensado y el frontend se diseña para el usuario real (recepcionista sin conocimientos técnicos), no para vos como desarrollador.

## 3. Stack recomendado (revisado para este alcance)

Mantengo la base que hablamos porque sigue siendo la correcta, pero la justifico ahora contra este alcance más grande:

| Capa | Tecnología | Por qué sigue siendo la elección correcta acá |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + TypeScript** | Un solo repo — importante para "simple de mantener" con un complejo grande pero equipo chico (vos) |
| Base de datos | **PostgreSQL (Supabase)** | Soporta transacciones atómicas (crítico para evitar overbooking de canchas), y realtime nativo (útil para que el calendario de canchas se actualice solo en pantalla de recepción) |
| ORM | **Prisma** | El modelo de datos bien tipado es la base de todo este análisis — Prisma fuerza a definir las relaciones (`Persona`, `Espacio`, `Movimiento`) de forma explícita |
| Pagos | **MercadoPago SDK** | Estándar en Argentina |
| Control de acceso | **QR generado por el sistema + lectura por cámara web/tablet** | No requiere hardware especializado, escala a molinete después sin tocar el modelo |
| Roles/permisos | **Supabase Auth con Row Level Security** | Así recepción, admin y profesores ven solo lo que les corresponde, sin lógica extra en el frontend |

**Por qué NO conviene microservicios ni una arquitectura más "enterprise" acá**: con un equipo de una persona, la complejidad operativa de microservicios (deploys separados, comunicación entre servicios) te va a hacer más lento sin ningún beneficio real hasta que el complejo tenga múltiples sedes con equipos separados administrándolas. Un monolito bien modularizado en carpetas (`/socios`, `/canchas`, `/accesos`, `/cobros`) te da el mismo orden sin el costo operativo. Esto **sí** escala: Next.js + Postgres maneja sin problema miles de socios y reservas diarias.

## 4. Documentación: qué construir primero (orden de prioridad real)

### Fase 0 — Modelo de datos (esto es lo que hay que hacer ya, antes de cualquier pantalla)
Definir en Prisma: `Persona`, `Espacio`, `Reserva`, `Movimiento`, `AccesoLog`, `Usuario`. Esto es la base de todo — si esto está bien, el resto es "solo" construir pantallas.

### Fase 1 — MVP operativo (lo mínimo para que el complejo ya pueda usarlo)
1. Alta de personas (socios y no-socios) con DNI y estado de cuenta
2. Alta de espacios (canchas) con precio por hora
3. Reserva manual de cancha (recepción carga la reserva)
4. Registro de cobro (cuota o alquiler suelto)
5. Check-in por QR o búsqueda manual

### Fase 2 — Lo que da valor operativo real
6. Calendario visual de disponibilidad de canchas (evita reservas dobles)
7. Turnos fijos/abonados
8. Alertas de morosidad en el check-in
9. Reportes de ingresos y ocupación

### Fase 3 — Escala y profesionalización
10. Pagos online (MercadoPago) para que el socio pague sin ir a recepción
11. App/portal del socio (reservar y pagar desde el celular)
12. Facturación
13. Buffet/kiosco como módulo aparte

### Fase 4 — Si el complejo crece a más sedes
14. Multi-sede (agregar `complejo_id` a todo, ya lo soporta el modelo si se pensó bien desde la Fase 0)

## 5. Próximo paso concreto

Con esto ya podemos pasar al **modelo de datos en Prisma** (Fase 0) — es lo único que hay que tener perfecto antes de escribir la primera pantalla. ¿Arrancamos con eso?
