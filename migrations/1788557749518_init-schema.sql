-- Up Migration

-- Extensiones
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

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

-- Usuarios del staff (empleados con login al sistema)
-- Nota: se crea antes de movimiento/acceso_log porque ambas la referencian
-- (PROJECT.md §3.1 la declara al final; acá se reordena para que el DDL sea válido)
create table usuario_staff (
    id uuid primary key default gen_random_uuid(),
    persona_id uuid references persona(id),
    email text unique not null,
    rol text not null check (rol in ('admin', 'recepcion', 'cobranzas', 'profesor')),
    activo boolean not null default true
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

-- Down Migration

drop table if exists acceso_log;
drop table if exists movimiento;
drop table if exists usuario_staff;
drop table if exists cuota;
drop table if exists reserva;
drop table if exists espacio;
alter table if exists persona drop column if exists plan_membresia_id;
drop table if exists plan_membresia;
drop table if exists persona;
