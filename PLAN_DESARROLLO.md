# Plan de ejecución — Sistema de gestión del complejo deportivo

Este documento define **quién hace qué** y en qué orden, para trabajar el proyecto desde VSCode con ayuda de Claude Code. Es un complemento de `PROJECT.md` (que tiene el modelo de datos y las decisiones de arquitectura) — este archivo es el plan de trabajo.

---

## 1. División de responsabilidades

### Lo que se resuelve con ayuda de IA (código, en VSCode)
- Escribir el schema SQL completo y las migraciones
- Armar la estructura del proyecto Next.js + TypeScript
- Escribir las queries SQL (altas, reservas, cobros, check-in)
- Armar las pantallas (recepción, calendario de canchas, dashboard)
- Escribir las policies de RLS
- Armar el lector de QR y la generación de carnets
- Integrar el SDK de MercadoPago
- Escribir los reportes en dbt
- Documentación técnica del código

### Lo que corre por tu cuenta (no delegable)
- **Crear las cuentas**: Supabase, MercadoPago (como comercio), dominio, hosting (Vercel)
- **Guardar y cargar las credenciales/API keys reales** — nunca se comparten en el chat ni se suben al repo; van en variables de entorno (`.env`, que no se sube a git)
- **La relación comercial con el complejo**: reunión de relevamiento real (cuántas canchas tienen, precios actuales, cómo cobran hoy), la propuesta comercial, la firma/acuerdo
- **Datos reales del complejo** para cargar al sistema (lista de socios existentes, precios reales, horarios de apertura)
- **Probar el sistema en la operación real** — vos (o el staff del complejo) tenés que usarlo con casos reales y avisar qué no funciona como esperaban
- **Decisiones de negocio** — precios de planes, política de cancelación de reservas, qué pasa con los morosos
- **Trámites legales/impositivos** si el complejo pide factura (AFIP) — eso no es código, es un trámite contable

---

## 2. Orden de trabajo (siguiendo el roadmap de `PROJECT.md`)

Cada paso es una sesión de trabajo con Claude Code en VSCode. La idea es pedir un paso a la vez, revisar el resultado, y recién ahí avanzar al siguiente — no pedir "hacé todo el sistema" de una.

| Paso | Qué se construye | Qué necesitás tener listo antes |
|---|---|---|
| 0 | Proyecto Next.js inicializado + conexión a Postgres | Cuenta de Supabase creada, connection string a mano |
| 1 | Migración con las tablas de `PROJECT.md` (persona, espacio, reserva, movimiento, acceso_log, usuario_staff) | — |
| 2 | CRUD de personas y espacios (altas/bajas/ediciones) | — |
| 3 | Reserva manual + registro de cobro | — |
| 4 | Check-in por QR + alerta de morosidad | — |
| 5 | Roles y policies de RLS | Definidos los usuarios reales del staff |
| 6 | Calendario visual de disponibilidad | — |
| 7 | Reportes (dbt) | Datos reales cargados para que el reporte tenga sentido |
| 8 | Integración MercadoPago | Cuenta de MercadoPago como comercio ya creada |
| 9 | Kiosco/productos (si lo suman al alcance) | — |

---

## 3. Setup en VSCode

1. Creá una carpeta para el proyecto y abrila en VSCode
2. Poné `PROJECT.md` y este archivo (`PLAN_DESARROLLO.md`) en la raíz del repo — son el contexto que necesita cualquier sesión de trabajo para no perder las decisiones ya tomadas
3. Instalá la extensión de **Claude Code** en VSCode (es la herramienta pensada exactamente para este flujo: trabajar en el editor con ayuda de IA sobre los archivos reales del proyecto)
4. En cada sesión, arrancá pidiendo que lea `PROJECT.md` y este plan antes de tocar código, así cualquier sugerencia respeta el modelo de datos y el stack que ya definimos (Postgres + SQL directo, sin Prisma)
5. Andá paso a paso según la tabla de la sección 2 — pedí un paso, probalo, recién ahí seguís

---

## 4. Qué llevar a cada sesión de trabajo

Para que el trabajo en VSCode sea eficiente, antes de pedir un paso nuevo tené a mano:
- Qué paso de la tabla estás por hacer
- Cualquier dato real que ese paso necesite (ver columna "qué necesitás tener listo")
- Si algo del paso anterior no funcionó como esperabas, anotalo para corregirlo antes de seguir
