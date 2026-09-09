-- Up Migration

-- Vínculo entre las cuentas de Supabase Auth (auth.users) y las entidades del
-- dominio. El staff entra al dashboard; el socio (a futuro) al portal.
-- Se deja como uuid simple (sin FK a auth.users) para que el schema sea portable
-- a otro proyecto de Supabase sin depender del orden de creación de auth.users.
alter table usuario_staff add column auth_user_id uuid unique;
alter table persona add column auth_user_id uuid unique;

-- Down Migration

alter table persona drop column auth_user_id;
alter table usuario_staff drop column auth_user_id;
