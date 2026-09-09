-- Up Migration

-- Parámetros de negocio editables desde la app, para no hardcodear reglas
-- (%, días de vencimiento, horas de hold de reservas, recargo por mora, etc.).
create table configuracion (
    clave       text primary key,
    valor       jsonb not null,
    descripcion text not null,
    actualizado_en timestamptz not null default now()
);

insert into configuracion (clave, valor, descripcion) values
  ('reserva.sena_porcentaje',       '50',    'Porcentaje de seña que se cobra al reservar una cancha'),
  ('reserva.hold_horas_no_socio',   '2',     'Horas que se reserva provisoriamente un turno de un NO socio antes de liberarlo si no paga la seña'),
  ('reserva.socio_reserva_directo', 'true',  'Si un socio puede confirmar una reserva sin pagar la seña por adelantado (el saldo va a su cuenta corriente)'),
  ('cuota.dia_generacion',          '1',     'Día del mes en que se generan las cuotas de membresía'),
  ('cuota.dias_para_vencer',        '10',    'Días desde la generación hasta el vencimiento de la cuota'),
  ('mora.habilitada',               'false', 'Si se aplica recargo por mora a las cuotas vencidas'),
  ('mora.porcentaje_mensual',       '10',    'Porcentaje mensual de recargo sobre el saldo vencido (si mora.habilitada)'),
  ('complejo.nombre',               '"Complejo Deportivo"', 'Nombre del complejo, se muestra en carnets y comprobantes');

-- Down Migration

drop table configuracion;
