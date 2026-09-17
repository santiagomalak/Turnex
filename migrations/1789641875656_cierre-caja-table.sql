-- Up Migration

-- Tabla para registro de cierres de caja diarios
create table cierre_caja (
    id uuid primary key default gen_random_uuid(),
    fecha date not null,
    staff_id uuid not null references usuario_staff(id),
    total_general numeric(12,2) not null default 0,
    total_efectivo numeric(12,2) not null default 0,
    total_transferencia numeric(12,2) not null default 0,
    total_mercadopago numeric(12,2) not null default 0,
    total_modo numeric(12,2) not null default 0,
    total_debito_automatico numeric(12,2) not null default 0,
    movimientos_count integer not null default 0,
    accesos_count integer not null default 0,
    reservas_count integer not null default 0,
    detalle_medios jsonb,
    detalle_tipos jsonb,
    diferencia_efectivo numeric(12,2) default 0,
    observaciones text,
    creado_en timestamptz not null default now(),
    unique (fecha, staff_id)
);

-- Índices
create index idx_cierre_caja_fecha on cierre_caja (fecha desc);
create index idx_cierre_caja_staff on cierre_caja (staff_id);

-- RLS
alter table cierre_caja enable row level security;

-- Admin y cobranzas: todo
create policy cierre_admin_cobranzas_all on cierre_caja
  for all to authenticated
  using (
    exists (
      select 1 from usuario_staff u
      where u.auth_user_id = auth.uid()
        and u.activo = true
        and u.rol in ('admin', 'cobranzas')
    )
  )
  with check (
    exists (
      select 1 from usuario_staff u
      where u.auth_user_id = auth.uid()
        and u.activo = true
        and u.rol in ('admin', 'cobranzas')
    )
  );

-- Recepción: solo leer
create policy cierre_recepcion_read on cierre_caja
  for select to authenticated
  using (
    exists (
      select 1 from usuario_staff u
      where u.auth_user_id = auth.uid()
        and u.activo = true
        and u.rol = 'recepcion'
    )
  );

-- Down Migration

drop table if exists cierre_caja;