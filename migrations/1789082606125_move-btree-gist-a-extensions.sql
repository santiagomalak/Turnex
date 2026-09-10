-- Up Migration

-- La init dejó `btree_gist` en el schema `public`; el resto de las extensiones
-- (pgcrypto, uuid-ossp, pg_stat_statements) viven en `extensions`. Moverla mantiene
-- `public` limpio y saca el warning "extension_in_public" del linter de Supabase.
--
-- La constraint de exclusión de reservas dobles (reserva_espacio_id_tsrange_excl)
-- sigue funcionando: el índice referencia las operator classes de btree_gist por OID,
-- no por nombre de schema. Probado con un rollback antes de escribir esto.

create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- Down Migration

alter extension btree_gist set schema public;
