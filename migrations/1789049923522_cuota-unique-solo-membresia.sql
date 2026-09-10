-- Up Migration

-- El índice único (persona_id, periodo) era para "una cuota de membresía por mes".
-- Ahora las cuotas de abono también tienen periodo, y una persona puede tener en
-- el mismo mes su cuota de socio Y la de su abono. El único que hay que evitar
-- es duplicar la de membresía, así que se restringe a esas.
drop index cuota_persona_periodo_uniq;
create unique index cuota_persona_periodo_uniq
  on cuota (persona_id, periodo)
  where periodo is not null and abono_id is null;

-- Down Migration

drop index cuota_persona_periodo_uniq;
create unique index cuota_persona_periodo_uniq
  on cuota (persona_id, periodo)
  where periodo is not null;
