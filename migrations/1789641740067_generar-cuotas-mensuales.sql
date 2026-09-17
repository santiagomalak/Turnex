-- Up Migration

-- Habilitar extensión pg_cron si no existe
create extension if not exists pg_cron;

-- Función para generar cuotas mensuales automáticamente
create or replace function generar_cuotas_mensuales()
returns void
language plpgsql
security definer
as $$
declare
  v_periodo date;
  v_fecha_vencimiento date;
  v_hoy date := current_date;
  v_mes_actual date := date_trunc('month', current_date)::date;
  v_socio record;
  v_plan record;
  v_cuota_existente boolean;
begin
  -- Solo ejecutar el día 1 de cada mes (seguridad adicional)
  if extract(day from v_hoy) <> 1 then
    raise notice 'generar_cuotas_mensuales: no es día 1, saliendo';
    return;
  end if;

  v_periodo := v_mes_actual;
  v_fecha_vencimiento := v_mes_actual + interval '10 days';

  -- Recorrer todos los socios activos con plan de membresía
  for v_socio in
    select p.id, p.plan_membresia_id
    from persona p
    where p.rol = 'socio'
      and p.estado = 'activo'
      and p.plan_membresia_id is not null
  loop
    -- Obtener datos del plan
    select precio_mensual into v_plan
    from plan_membresia
    where id = v_socio.plan_membresia_id;

    if v_plan is null then
      continue;
    end if;

    -- Verificar si ya existe cuota para este socio y período
    select exists(
      select 1 from cuota
      where persona_id = v_socio.id
        and periodo = v_periodo
    ) into v_cuota_existente;

    if not v_cuota_existente then
      insert into cuota (persona_id, periodo, monto, estado, fecha_vencimiento)
      values (v_socio.id, v_periodo, v_plan.precio_mensual, 'pendiente', v_fecha_vencimiento);
      
      raise notice 'Cuota generada: socio=%, periodo=%, monto=%', v_socio.id, v_periodo, v_plan.precio_mensual;
    else
      raise notice 'Cuota ya existe: socio=%, periodo=%', v_socio.id, v_periodo;
    end if;
  end loop;

  raise notice 'generar_cuotas_mensuales: completado para periodo %', v_periodo;
end;
$$;

-- Programar ejecución automática: día 1 de cada mes a las 02:00 AM
-- Nota: pg_cron usa UTC, ajustar según zona horaria si necesario
-- Para Argentina (UTC-3): 02:00 UTC = 23:00 día anterior hora local
-- Usamos 05:00 UTC = 02:00 AM hora Argentina
select cron.schedule(
  'cuotas-mensuales',
  '0 5 1 * *',  -- 05:00 UTC = 02:00 AM Argentina (UTC-3)
  $$ select generar_cuotas_mensuales(); $$
);

-- Verificar que el job se creó
-- select * from cron.job where jobname = 'cuotas-mensuales';

-- Down Migration

-- Eliminar job programado
select cron.unschedule('cuotas-mensuales');

-- Eliminar función
drop function if exists generar_cuotas_mensuales();