-- Up Migration

-- Un plan se puede "retirar" sin borrarlo (mantiene la historia de cuotas).
alter table plan_membresia add column activo boolean not null default true;

-- El complejo ocupa +2 manzanas: agrupar las canchas por sector/zona.
alter table espacio add column sector text;

-- Down Migration

alter table espacio drop column sector;
alter table plan_membresia drop column activo;
