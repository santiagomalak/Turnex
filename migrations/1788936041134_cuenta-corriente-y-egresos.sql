-- Up Migration

-- Cuenta corriente (fiado) y egresos (pagos a staff/profesores) sobre movimiento:
--   estado    'pendiente' = fiado (venta) o deuda (pago_staff) aun no saldada; 'pagado' = de una
--   direccion 'ingreso' = cobro al complejo; 'egreso' = pago que hace el complejo (ej. a una profesora)
--   concepto  descripcion libre (ej. "1 coca", "comision clases septiembre") - antes no existia
alter table movimiento
    add column estado text not null default 'pagado' check (estado in ('pendiente', 'pagado')),
    add column direccion text not null default 'ingreso' check (direccion in ('ingreso', 'egreso')),
    add column concepto text;

-- tipo: se agrega 'pago_staff' para egresos a personas con rol staff/profesor
alter table movimiento drop constraint movimiento_tipo_check;
alter table movimiento add constraint movimiento_tipo_check
    check (tipo in ('cuota', 'alquiler', 'venta', 'pago_staff'));

-- medio_pago: se agrega 'fiado' para ventas de kiosco a credito, pendientes de cobro
alter table movimiento drop constraint movimiento_medio_pago_check;
alter table movimiento add constraint movimiento_medio_pago_check
    check (medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico', 'fiado'));

-- Down Migration

alter table movimiento drop constraint movimiento_medio_pago_check;
alter table movimiento add constraint movimiento_medio_pago_check
    check (medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico'));

alter table movimiento drop constraint movimiento_tipo_check;
alter table movimiento add constraint movimiento_tipo_check
    check (tipo in ('cuota', 'alquiler', 'venta'));

alter table movimiento
    drop column concepto,
    drop column direccion,
    drop column estado;
