-- Up Migration

-- Turnos fijos / abonados: el mismo cliente, misma cancha, mismo día y hora,
-- todas las semanas, con un abono mensual.
create table abono (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references persona(id),
  espacio_id uuid not null references espacio(id),
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fin time not null,
  precio_mensual numeric(10,2) not null check (precio_mensual >= 0),
  vigente_desde date not null,
  vigente_hasta date,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'cancelado')),
  creado_por uuid references usuario_staff(id),
  creado_en timestamptz not null default now()
);

-- reserva: origen, quién la cargó, el movimiento del alquiler, y el abono si aplica.
alter table reserva
  add column origen text not null default 'recepcion'
    check (origen in ('recepcion', 'portal', 'abono')),
  add column abono_id uuid references abono(id),
  add column creada_por uuid references usuario_staff(id),
  add column movimiento_id uuid references movimiento(id),
  add column notas text;

alter table reserva drop constraint reserva_estado_check;
alter table reserva add constraint reserva_estado_check
  check (estado in ('confirmada', 'pendiente_pago', 'cancelada', 'cumplida', 'ausente'));

-- Down Migration

alter table reserva drop constraint reserva_estado_check;
alter table reserva add constraint reserva_estado_check
  check (estado in ('confirmada', 'cancelada', 'pendiente_pago'));
alter table reserva
  drop column notas,
  drop column movimiento_id,
  drop column creada_por,
  drop column abono_id,
  drop column origen;
drop table abono;
