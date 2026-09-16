-- RLS Policies para Turnex
-- Ejecutar en Supabase SQL Editor

-- 1. Habilitar RLS en todas las tablas
alter table persona enable row level security;
alter table plan_membresia enable row level security;
alter table espacio enable row level security;
alter table reserva enable row level security;
alter table cuota enable row level security;
alter table movimiento enable row level security;
alter table acceso_log enable row level security;
alter table usuario_staff enable row level security;

-- 2. Helper: función para obtener rol del staff actual
create or replace function current_staff_role() returns text as $$
  select u.rol
  from usuario_staff u
  join auth.users au on au.id = u.auth_user_id
  where u.auth_user_id = auth.uid()
    and u.activo = true
    and au.aud = 'authenticated'
  limit 1;
$$ language sql security definer;

-- 3. Helper: función para saber si es admin
create or replace function is_admin() returns boolean as $$
  select current_staff_role() = 'admin';
$$ language sql security definer;

-- 4. Helper: función para saber si es recepción o admin
create or replace function is_recepcion_or_admin() returns boolean as $$
  select current_staff_role() in ('admin', 'recepcion');
$$ language sql security definer;

-- 5. Helper: función para saber si es cobranzas o admin
create or replace function is_cobranzas_or_admin() returns boolean as $$
  select current_staff_role() in ('admin', 'cobranzas');
$$ language sql security definer;

-- ============================================
-- PERSONA
-- ============================================
-- Admin ve todo
create policy persona_admin_all on persona
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Recepción y cobranzas ven todo
create policy persona_recepcion_cobranzas_select on persona
  for select to authenticated
  using (is_recepcion_or_admin() or is_cobranzas_or_admin());

-- Recepción puede insertar/actualizar
create policy persona_recepcion_modify on persona
  for insert to authenticated
  with check (is_recepcion_or_admin());

create policy persona_recepcion_update on persona
  for update to authenticated
  using (is_recepcion_or_admin())
  with check (is_recepcion_or_admin());

-- Profesores solo ven sus propios datos (si tienen persona_id)
create policy profesor_own_persona on persona
  for select to authenticated
  using (
    exists (
      select 1 from usuario_staff u
      where u.auth_user_id = auth.uid()
        and u.rol = 'profesor'
        and u.persona_id = persona.id
    )
  );

-- ============================================
-- PLAN_MEMBRESIA
-- ============================================
create policy plan_admin_all on plan_membresia
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy plan_staff_read on plan_membresia
  for select to authenticated
  using (current_staff_role() is not null);

-- ============================================
-- ESPACIO
-- ============================================
create policy espacio_admin_all on espacio
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy espacio_recepcion_modify on espacio
  for all to authenticated
  using (is_recepcion_or_admin())
  with check (is_recepcion_or_admin());

create policy espacio_staff_read on espacio
  for select to authenticated
  using (current_staff_role() is not null);

-- ============================================
-- RESERVA
-- ============================================
-- Admin y recepción: todo
create policy reserva_admin_recepcion_all on reserva
  for all to authenticated
  using (is_admin() or current_staff_role() = 'recepcion')
  with check (is_admin() or current_staff_role() = 'recepcion');

-- Cobranzas: solo leer
create policy reserva_cobranzas_read on reserva
  for select to authenticated
  using (current_staff_role() = 'cobranzas');

-- Profesores: solo sus reservas
create policy reserva_profesor_own on reserva
  for select to authenticated
  using (
    exists (
      select 1 from usuario_staff u
      where u.auth_user_id = auth.uid()
        and u.rol = 'profesor'
        and u.persona_id = reserva.persona_id
    )
  );

-- ============================================
-- CUOTA
-- ============================================
-- Admin: todo
create policy cuota_admin_all on cuota
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Cobranzas: leer y actualizar (marcar pagada)
create policy cuota_cobranzas_modify on cuota
  for all to authenticated
  using (is_cobranzas_or_admin())
  with check (is_cobranzas_or_admin());

-- Recepción: leer
create policy cuota_recepcion_read on cuota
  for select to authenticated
  using (is_recepcion_or_admin());

-- ============================================
-- MOVIMIENTO
-- ============================================
-- Admin: todo
create policy movimiento_admin_all on movimiento
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Cobranzas y recepción: insertar y leer
create policy movimiento_cobranzas_recepcion on movimiento
  for all to authenticated
  using (is_cobranzas_or_admin() or current_staff_role() = 'recepcion')
  with check (is_cobranzas_or_admin() or current_staff_role() = 'recepcion');

-- ============================================
-- ACCESO_LOG
-- ============================================
-- Admin y recepción: todo (check-in/out)
create policy acceso_admin_recepcion_all on acceso_log
  for all to authenticated
  using (is_admin() or current_staff_role() = 'recepcion')
  with check (is_admin() or current_staff_role() = 'recepcion');

-- ============================================
-- USUARIO_STAFF
-- ============================================
-- Solo admin gestiona usuarios
create policy usuario_staff_admin_all on usuario_staff
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================
-- SOCIOS (PORTAL) - Policies para auth.users
-- ============================================
-- Los socios solo ven sus propios datos
create policy socio_own_persona on persona
  for select to authenticated
  using (
    exists (
      select 1 from auth.users au
      where au.id = auth.uid()
        and au.raw_user_meta_data->>'role' = 'socio'
        and au.id = persona.auth_user_id
    )
  );

create policy socio_own_reserva on reserva
  for select to authenticated
  using (
    exists (
      select 1 from auth.users au
      where au.id = auth.uid()
        and au.raw_user_meta_data->>'role' = 'socio'
        and au.id = reserva.auth_user_id
    )
  );

create policy socio_own_cuota on cuota
  for select to authenticated
  using (
    exists (
      select 1 from auth.users au
      where au.id = auth.uid()
        and au.raw_user_meta_data->>'role' = 'socio'
        and au.id = (select auth_user_id from persona where id = cuota.persona_id)
    )
  );

create policy socio_own_movimiento on movimiento
  for select to authenticated
  using (
    exists (
      select 1 from auth.users au
      where au.id = auth.uid()
        and au.raw_user_meta_data->>'role' = 'socio'
        and au.id = (select auth_user_id from persona where id = movimiento.persona_id)
    )
  );