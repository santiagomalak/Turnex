-- Up Migration

-- Los socios que se auto-registran por el portal quedan en 'pendiente_aprobacion'
-- hasta que administración los revisa y les asigna un plan.
alter table persona drop constraint persona_estado_check;
alter table persona add constraint persona_estado_check
    check (estado in ('activo', 'inactivo', 'moroso', 'pendiente_aprobacion'));

-- Down Migration

alter table persona drop constraint persona_estado_check;
alter table persona add constraint persona_estado_check
    check (estado in ('activo', 'inactivo', 'moroso'));
