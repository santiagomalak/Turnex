-- Up Migration

-- Toda la app accede a la base como el rol `postgres` (vía la librería `pg`),
-- que saltea RLS. RLS acá es defensa en profundidad: si alguien usa la anon key
-- contra la API de Supabase (PostgREST), sin policies no puede leer ni escribir
-- nada. El portal del socio (Fase 7) también será server-side, así que no hace
-- falta abrir ninguna tabla por ahora.

alter table persona          enable row level security;
alter table plan_membresia   enable row level security;
alter table espacio          enable row level security;
alter table reserva          enable row level security;
alter table cuota            enable row level security;
alter table movimiento       enable row level security;
alter table imputacion       enable row level security;
alter table plan_pago        enable row level security;
alter table abono            enable row level security;
alter table acceso_log       enable row level security;
alter table usuario_staff    enable row level security;
alter table configuracion    enable row level security;
alter table pgmigrations     enable row level security;

-- Down Migration

alter table pgmigrations     disable row level security;
alter table configuracion    disable row level security;
alter table usuario_staff    disable row level security;
alter table acceso_log       disable row level security;
alter table abono            disable row level security;
alter table plan_pago        disable row level security;
alter table imputacion       disable row level security;
alter table movimiento       disable row level security;
alter table cuota            disable row level security;
alter table reserva          disable row level security;
alter table espacio          disable row level security;
alter table plan_membresia   disable row level security;
alter table persona          disable row level security;
