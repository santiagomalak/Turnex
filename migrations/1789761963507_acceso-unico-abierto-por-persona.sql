-- Up Migration

-- El chequeo de "no tiene un ingreso abierto" antes de insertar (lib/services/acceso.ts)
-- es un check-then-insert sin lock: dos requests concurrentes (doble tap en el kiosco,
-- QR escaneado dos veces) pueden pasar el chequeo antes de que ninguna haya insertado
-- todavía, dejando dos filas "abiertas" para la misma persona (la salida solo cierra
-- la más reciente, la otra queda huérfana para siempre). Este índice hace que el
-- segundo insert falle a nivel de base (23505) en vez de corromper el estado.
create unique index acceso_log_una_abierta_por_persona
  on acceso_log (persona_id)
  where hora_salida is null;

-- Down Migration

drop index if exists acceso_log_una_abierta_por_persona;