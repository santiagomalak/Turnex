-- Up Migration

-- La cuota mensual de un abono (turno fijo) se modela igual que la de membresía:
-- una fila en `cuota` con su cargo. `abono_id` la vincula para poder renovarla
-- cada mes sin duplicar.
alter table cuota add column abono_id uuid references abono(id);
create index cuota_abono_periodo_idx on cuota (abono_id, periodo);

-- Down Migration

drop index cuota_abono_periodo_idx;
alter table cuota drop column abono_id;
