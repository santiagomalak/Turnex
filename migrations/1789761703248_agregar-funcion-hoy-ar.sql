-- Up Migration

-- La sesión de Postgres corre en UTC (default de Supabase). `current_date` y
-- `now()::date` en UTC se adelantan un día entre las 21:00 y las 23:59 hora
-- Argentina (UTC-3) — justo el horario de más movimiento del complejo. Esta
-- función devuelve la fecha correcta en huso horario Argentina sin depender
-- de la configuración de sesión de cada conexión.
create or replace function hoy_ar() returns date as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date
$$ language sql stable;

-- Down Migration

drop function if exists hoy_ar();