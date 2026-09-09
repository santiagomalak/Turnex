-- Up Migration

-- El complejo real tiene padel, tenis, voley y beach voley (y sumara mas deportes).
-- La migracion inicial solo permitia ('futbol', 'padel'), asi que crear una cancha
-- de tenis/voley fallaba con error de check constraint (y el seed fallaba en esas filas).
alter table espacio drop constraint espacio_tipo_check;
alter table espacio add constraint espacio_tipo_check
    check (tipo in ('futbol', 'padel', 'tenis', 'voley', 'beach_voley', 'otro'));

-- Down Migration

-- Solo se puede volver atras si no quedaron filas con los tipos nuevos.
alter table espacio drop constraint espacio_tipo_check;
alter table espacio add constraint espacio_tipo_check
    check (tipo in ('futbol', 'padel'));
