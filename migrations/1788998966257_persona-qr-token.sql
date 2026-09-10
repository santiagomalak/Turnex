-- Up Migration

-- Identificador estable para el carnet con QR (no expone el id interno).
alter table persona add column qr_token uuid not null default gen_random_uuid();
create unique index persona_qr_token_uniq on persona (qr_token);

-- Down Migration

drop index persona_qr_token_uniq;
alter table persona drop column qr_token;
