-- Up Migration

-- ============================================================================
-- movimiento pasa a ser un LIBRO MAYOR con dos clases de fila:
--   clase='cargo'  -> una obligación. direccion='ingreso' (nos deben) o 'egreso'
--                     (debemos). `saldo` = monto todavía sin saldar.
--   clase='pago'   -> una cancelación. `medio_pago` seteado. `saldo` = parte del
--                     pago que quedó sin imputar (a favor / a cuenta).
-- Una `imputacion` vincula un pago con un cargo de la misma dirección.
-- ============================================================================

alter table movimiento
  add column clase text not null default 'cargo' check (clase in ('cargo', 'pago')),
  add column saldo numeric(10,2) not null default 0,
  add column vence_el date,
  add column anulado boolean not null default false;

alter table movimiento alter column medio_pago drop not null;

alter table movimiento drop constraint movimiento_tipo_check;
alter table movimiento add constraint movimiento_tipo_check
  check (tipo in ('cuota', 'alquiler', 'venta', 'pago_staff', 'ajuste', 'pago'));

alter table movimiento drop constraint movimiento_estado_check;
alter table movimiento add constraint movimiento_estado_check
  check (estado in ('pendiente', 'parcial', 'saldado', 'pagado'));

-- Backfill de las filas existentes (todas son cargos con el modelo viejo):
update movimiento set
  clase = 'cargo',
  saldo = case when estado = 'pendiente' then monto else 0 end,
  estado = case when estado = 'pendiente' then 'pendiente' else 'saldado' end;

create index movimiento_persona_clase_idx on movimiento (persona_id, clase) where not anulado;

-- ============================================================================
create table imputacion (
  id uuid primary key default gen_random_uuid(),
  pago_id  uuid not null references movimiento(id) on delete cascade,
  cargo_id uuid not null references movimiento(id) on delete cascade,
  monto numeric(10,2) not null check (monto > 0),
  creado_en timestamptz not null default now()
);
create index imputacion_cargo_idx on imputacion (cargo_id);
create index imputacion_pago_idx on imputacion (pago_id);

-- ============================================================================
-- Plan de pago: financiación de una deuda del socio en N cuotas.
create table plan_pago (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references persona(id),
  descripcion text not null,
  total numeric(10,2) not null check (total > 0),
  cant_cuotas int not null check (cant_cuotas between 1 and 60),
  estado text not null default 'vigente' check (estado in ('vigente', 'completado', 'cancelado')),
  creado_por uuid references usuario_staff(id),
  creado_en timestamptz not null default now()
);

-- ============================================================================
-- cuota = calendario de devengamiento. Cada cuota genera su `movimiento` cargo.
alter table cuota
  add column plan_pago_id uuid references plan_pago(id),
  add column concepto text,
  add column movimiento_id uuid references movimiento(id);

-- Las cuotas de un plan de pago no tienen período mensual.
alter table cuota alter column periodo drop not null;
alter table cuota drop constraint cuota_persona_id_periodo_key;
create unique index cuota_persona_periodo_uniq on cuota (persona_id, periodo) where periodo is not null;

alter table cuota drop constraint cuota_estado_check;
alter table cuota add constraint cuota_estado_check
  check (estado in ('pendiente', 'parcial', 'pagada', 'vencida'));

-- Down Migration

alter table cuota drop constraint cuota_estado_check;
alter table cuota add constraint cuota_estado_check
  check (estado in ('pendiente', 'pagada', 'vencida'));
drop index cuota_persona_periodo_uniq;
alter table cuota add constraint cuota_persona_id_periodo_key unique (persona_id, periodo);
alter table cuota alter column periodo set not null;
alter table cuota drop column movimiento_id, drop column concepto, drop column plan_pago_id;

drop table plan_pago;
drop table imputacion;

drop index movimiento_persona_clase_idx;
update movimiento set estado = case when estado = 'saldado' then 'pagado' else 'pendiente' end;
alter table movimiento drop constraint movimiento_estado_check;
alter table movimiento add constraint movimiento_estado_check
  check (estado in ('pendiente', 'pagado'));
alter table movimiento drop constraint movimiento_tipo_check;
alter table movimiento add constraint movimiento_tipo_check
  check (tipo in ('cuota', 'alquiler', 'venta', 'pago_staff'));
alter table movimiento alter column medio_pago set not null;
alter table movimiento drop column anulado, drop column vence_el, drop column saldo, drop column clase;
