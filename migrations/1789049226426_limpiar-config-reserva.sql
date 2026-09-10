-- Up Migration

-- Claves de la idea original que quedaron sin uso: la regla de reserva se
-- definió como "socio reserva directo, va a cuenta corriente; no socio paga el
-- 100% al reservar (o recepción lo deja pendiente)". No hay seña parcial ni
-- hold-timeout, así que estas tres no las lee nadie.
delete from configuracion where clave in (
  'reserva.sena_porcentaje',
  'reserva.hold_horas_no_socio',
  'reserva.socio_reserva_directo'
);

-- Down Migration

insert into configuracion (clave, valor, descripcion) values
  ('reserva.sena_porcentaje',       '50',   'Porcentaje de seña que se cobra al reservar una cancha'),
  ('reserva.hold_horas_no_socio',   '2',    'Horas que se reserva provisoriamente un turno de un NO socio'),
  ('reserva.socio_reserva_directo', 'true', 'Si un socio puede confirmar una reserva sin pagar por adelantado');
