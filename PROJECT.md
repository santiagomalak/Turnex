# Sistema de gestión — Complejo deportivo

Documento maestro del proyecto. Contiene el alcance, las decisiones de arquitectura ya tomadas, el modelo de datos completo y el roadmap. Es la referencia para no perder el criterio al empezar a codear.

---

## 1. Alcance

Software de gestión operativa para un complejo deportivo grande, que cubre:

1. **Control de acceso** — entrada y salida de personas del predio (vía QR)
2. **Canchas** — alquiler y administración de canchas de fútbol, pádel y otros deportes a futuro
3. **Personas y cobros** — socios, no-socios, staff, profesores, y todos los cobros asociados (cuotas, alquileres, ventas)

**Principio de diseño**: el sistema no falla por falta de funcionalidades, falla por mal diseño del modelo de datos base. Todo el resto de las decisiones parte de tener bien definidas 5 entidades centrales (ver sección 3).

**Prioridad**: pensado para reescalar (más canchas, más sedes, más medios de pago) pero simple de mantener con un equipo chico. Se prioriza un monolito bien modularizado por sobre microservicios.

---

## 2. Stack definido

| Capa | Tecnología | Decisión |
|---|---|---|
| Frontend + Backend | Next.js (App Router) + TypeScript | Un solo repo |
| Base de datos | PostgreSQL (Supabase) | Transacciones atómicas (crítico para evitar overbooking), Auth y RLS integrados |
| Acceso a datos | **SQL directo** (librería `pg`) + `node-pg-migrate` para migraciones | Sin ORM (Prisma descartado) — control total del SQL, consistente con experiencia previa en BigQuery |
| Pagos | MercadoPago SDK (fase 2) + registro manual multi-medio desde el MVP | Ver sección 5 |
| Auth y permisos | Supabase Auth + Row Level Security (RLS) | Ver sección 4 |
| Reportes/analytics | dbt (sobre los datos ya cargados en Postgres) | Solo para transformar datos históricos en tablas de reporte — no para el backend transaccional |

---

## 3. Modelo de datos

Cinco entidades centrales. Todo lo demás del sistema es una combinación de estas piezas.

- **Persona** — cualquier humano: socio, invitado, staff o profesor, distinguidos por rol
- **Espacio** — cualquier cancha (fútbol, pádel, u otro deporte a futuro)
- **Reserva** — une una Persona a un Espacio para una fecha/hora
- **Movimiento** — cualquier cobro: cuota, alquiler o venta
- **AccesoLog** — registro de entrada/salida del predio

### 3.1 Esquema SQL (DDL)

```sql
-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- Personas: socios, invitados, staff, profesores
create table persona (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    apellido text not null,
    dni text unique,
    email text,
    telefono text,
    rol text not null check (rol in ('socio', 'invitado', 'staff', 'profesor')),
    estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'moroso')),
    fecha_alta timestamptz not null default now()
);

-- Planes de membresía (aplican a personas con rol = 'socio')
create table plan_membresia (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    precio_mensual numeric(10,2) not null,
    incluye_canchas boolean not null default false,
    descuento_porcentaje numeric(5,2) default 0
);

alter table persona
    add column plan_membresia_id uuid references plan_membresia(id);

-- Espacios: canchas de cualquier deporte
create table espacio (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    tipo text not null check (tipo in ('futbol', 'padel')),
    precio_por_hora numeric(10,2) not null,
    estado text not null default 'activa' check (estado in ('activa', 'mantenimiento'))
);

-- Reservas: une persona + espacio en el tiempo
create table reserva (
    id uuid primary key default gen_random_uuid(),
    espacio_id uuid not null references espacio(id),
    persona_id uuid not null references persona(id),
    fecha date not null,
    hora_inicio time not null,
    hora_fin time not null,
    estado text not null default 'pendiente_pago'
        check (estado in ('confirmada', 'cancelada', 'pendiente_pago')),
    precio numeric(10,2) not null,
    sena_pagada boolean not null default false,
    creado_en timestamptz not null default now(),
    -- evita reservas dobles del mismo espacio en el mismo horario
    exclude using gist (
        espacio_id with =,
        tsrange(
            (fecha + hora_inicio)::timestamp,
            (fecha + hora_fin)::timestamp
        ) with &&
    ) where (estado != 'cancelada')
);

-- Cuotas mensuales de membresía
create table cuota (
    id uuid primary key default gen_random_uuid(),
    persona_id uuid not null references persona(id),
    periodo date not null, -- primer día del mes correspondiente
    monto numeric(10,2) not null,
    estado text not null default 'pendiente'
        check (estado in ('pendiente', 'pagada', 'vencida')),
    fecha_vencimiento date not null,
    unique (persona_id, periodo)
);

-- Movimientos: todo cobro (cuota, alquiler o venta), multi-medio de pago
create table movimiento (
    id uuid primary key default gen_random_uuid(),
    persona_id uuid not null references persona(id),
    cuota_id uuid references cuota(id),
    reserva_id uuid references reserva(id),
    tipo text not null check (tipo in ('cuota', 'alquiler', 'venta')),
    monto numeric(10,2) not null,
    medio_pago text not null
        check (medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico')),
    comprobante_url text,
    registrado_por uuid references usuario_staff(id),
    fecha timestamptz not null default now()
);

-- Log de acceso: entrada y salida por QR
create table acceso_log (
    id uuid primary key default gen_random_uuid(),
    persona_id uuid not null references persona(id),
    hora_entrada timestamptz not null default now(),
    hora_salida timestamptz,
    registrado_por uuid references usuario_staff(id)
);

-- Usuarios del staff (empleados con login al sistema)
create table usuario_staff (
    id uuid primary key default gen_random_uuid(),
    persona_id uuid references persona(id),
    email text unique not null,
    rol text not null check (rol in ('admin', 'recepcion', 'cobranzas', 'profesor')),
    activo boolean not null default true
);
```

> Nota: `movimiento` y `acceso_log` referencian `usuario_staff` antes de que la tabla exista en el orden del archivo — al migrar, crear `usuario_staff` antes o usar `alter table ... add constraint` al final.

---

## 4. Roles y permisos (RLS)

Cada usuario del staff tiene su propio login — nunca credenciales compartidas, para poder auditar quién hizo qué.

| Rol | Ve | Puede hacer | No puede hacer |
|---|---|---|---|
| **admin** | Todo | Todo, incluida configuración | — |
| **recepción** | Personas, calendario, estado de cuotas | Cargar reservas, registrar cobros, check-in/out | Borrar pagos, ver reportes financieros completos, cambiar precios |
| **cobranzas** | Estado de cuenta, historial de pagos | Registrar/editar pagos | Cargar reservas, ver logs de acceso |
| **profesor** | Su propio calendario | Confirmar asistencia a sus clases | Ver cobros o datos de otros profesores |
| **socio** (portal futuro) | Su propio estado de cuenta y reservas | Reservar y pagar su propio uso | Ver datos de otros socios |

Ejemplo de policy RLS en Postgres (recepción no puede borrar movimientos):

```sql
alter table movimiento enable row level security;

create policy recepcion_solo_insertar on movimiento
    for insert
    to authenticated
    with check (
        (select rol from usuario_staff where id = auth.uid()) in ('recepcion', 'cobranzas', 'admin')
    );

create policy solo_admin_borra on movimiento
    for delete
    to authenticated
    using (
        (select rol from usuario_staff where id = auth.uid()) = 'admin'
    );
```

---

## 5. Estrategia de cobros

El modelo de datos soporta **todos los medios desde el día 1** (`medio_pago` ya incluye efectivo, transferencia, MercadoPago, MODO, débito automático) — pero la integración se hace en fases:

- **MVP**: todos los medios están disponibles como registro manual (recepción anota cómo pagó)
- **Fase 2**: integración automática de MercadoPago (checkout online, webhook de confirmación)
- **Fase 3**: MODO y/o débito automático bancario, cuando el volumen de socios lo justifique

---

## 6. Roadmap de construcción

1. **Modelo de datos** — crear las tablas de la sección 3
2. **Alta de personas y espacios** — CRUD básico
3. **Reserva y cobro manual** — carga desde recepción, sin pago online todavía
4. **Check-in por QR** — carnet digital, escaneo en recepción, alerta de morosidad (sin bloqueo automático)
5. **Calendario visual de canchas** — disponibilidad por espacio/franja, turnos fijos
6. **Reportes y pagos online** — dashboard de ingresos/ocupación (vía dbt sobre los datos) + integración MercadoPago

---

## 7. Próximo paso

Con este documento como base, el siguiente paso es correr la migración inicial (sección 3.1) contra una instancia de Supabase y empezar por el módulo de alta de personas y espacios (paso 2 del roadmap).
