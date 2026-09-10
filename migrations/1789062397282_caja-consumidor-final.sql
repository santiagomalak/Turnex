-- Up Migration

-- Ventas de kiosco al mostrador (sin socio): todo `movimiento` necesita una
-- persona, así que usamos una persona ficticia "Consumidor Final". Su id queda
-- en `configuracion` para que la app la resuelva.
with nueva as (
  insert into persona (nombre, apellido, dni, rol, estado)
  values ('Consumidor', 'Final', null, 'invitado', 'activo')
  returning id
)
insert into configuracion (clave, valor, descripcion)
select 'caja.consumidor_final_id', to_jsonb(id::text),
       'Persona ficticia para las ventas de kiosco al mostrador (sin socio)'
from nueva;

-- Down Migration

delete from persona where id = (
  select trim(both '"' from valor::text)::uuid
  from configuracion where clave = 'caja.consumidor_final_id'
);
delete from configuracion where clave = 'caja.consumidor_final_id';
