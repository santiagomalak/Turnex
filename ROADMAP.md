# Roadmap — Turnex (reconstrucción sobre base sólida)

> Plan de trabajo acordado el 2026-09-09. Reemplaza en la práctica a la tabla de pasos
> de `PLAN_DESARROLLO.md` §2. `PROJECT.md` sigue siendo la referencia de arquitectura y
> modelo de datos (se actualiza a medida que se implementa).

## Objetivo

Sistema mínimo viable para la apertura del complejo: gestión de socios y cuentas
corrientes, reservas de canchas (incl. turnos fijos), control de acceso y kiosco/caja,
con portal para el socio. Preparado para MercadoPago y multi-cliente, sin construirlos aún.

## Decisiones tomadas (no volver a discutir)

| Tema | Decisión |
|---|---|
| Arquitectura | Server-side: datos y lógica en Route Handlers / Server Actions con `pg` (transaccional). Nada de acceso a DB desde el navegador. |
| Auth | Supabase Auth (email/password). Staff con roles + portal del socio. |
| Base de datos | Supabase bajo cuenta personal por ahora. Al cerrar con el cliente se migra a un proyecto propio del cliente (todo el schema vive en migraciones para que sea portable). |
| Cobros | Registro manual multi-medio. MercadoPago = fase posterior (el modelo ya queda listo). |
| Reserva de cancha | **Socio**: reserva cuando quiere (portal o recepción), sin pago por adelantado — el alquiler va a su cuenta corriente. **No socio**: solo recepción carga la reserva y cobra el **100%** en el momento; no hay reserva online para no socios (hasta MercadoPago). El % de pago del no socio queda configurable (default 100). |
| Landing pública | Página simple: presentación del complejo, deportes/canchas, disponibilidad de horarios, y CTAs "Soy socio" (portal) / "Reservar" (contacto WhatsApp/teléfono). Sin carga de reserva online por ahora. |
| Turnos fijos / abonados | Sí, desde el MVP. |
| Recargo por mora | Configurable, apagado por defecto (queda a criterio del dueño). |
| Alta de socios | Doble vía: los crea administración **y** auto-registro por el portal (queda pendiente de aprobación). Beneficios de socio (descuentos, sorteos) = más adelante. |
| Datos del complejo | Se arranca con canchas/planes/precios/horarios de ejemplo, todos editables desde la app. |

## Fases

Cada fase se construye, se prueba (`tsc` + `build` + prueba manual), se commitea, y se
confirma con el usuario antes de pasar a la siguiente.

**Estado (2026-09-10):** Fases 0–7 implementadas. Pendientes: **4b** (landing pública,
se dejó para el final) y **8** (hardening + deploy productivo — falta pasar el
`DATABASE_URL` de Vercel al Session Pooler de Supabase y activar la protección de
contraseñas filtradas).

### Fase 0 — Fundaciones (sin features nuevas visibles)
- `lib/db.ts` endurecido (SSL, pool acotado, helper de transacción).
- Capa `lib/repos/*` (SQL puro, `server-only`) + `lib/services/*` (reglas de negocio).
- Tabla `configuracion` (clave/valor) + `lib/config.ts`.
- Migrar las páginas del dashboard a Server Components + Server Actions. Borrar `lib/store-supabase.ts`.
- **Referencia de patrón: módulo Personas migrado primero.**

### Fase 1 — Auth + roles
- Supabase Auth, `proxy.ts` que protege `/(dashboard)` (staff) y `/portal` (socio).
- `lib/auth.ts`: `getSession`, `requireStaff(roles)`, `requireSocio`.
- Login, logout, usuario actual en el header, nav según rol.
- Seed de usuarios (admin / recepción / cobranzas) y un socio demo.

### Fase 2 — Personas · Socios · Planes
- CRUD de personas y de `plan_membresia` server-side, con validación.
- Alta de socio desde administración: asigna plan y genera la primera cuota.
- Estado `pendiente_aprobacion`; token QR por persona.

### Fase 3 — Cuentas corrientes (núcleo)
- Migración: `movimiento` como libro mayor (cargo con `saldo_pendiente`, `tipo='pago'`),
  tabla `imputacion` (pago ↔ cargo), `plan_pago`, `cuota.pagado`.
- Servicio de cuenta corriente: registrar cargo, registrar pago (parcial/total/a cuenta),
  saldo y estado de cuenta con *aging* (0-30 / 31-60 / +60).
- Generación de cuotas del mes + marcar vencidas (función SQL + acción manual).
- Pantalla "Ficha de socio / Cuenta corriente". Refactor de la pantalla de Cobros.

### Fase 4 — Reservas · Calendario · Turnos fijos
- Migración `reserva` (estados, tipo suelta/fija, origen, monto de pago) + tabla `abono`.
- Socio: reserva sin pago adelantado → el alquiler queda como cargo en su cuenta corriente.
- No socio: solo recepción, cobra el 100% al confirmar (medio de pago a elección).
- Calendario visual por cancha; alta de reserva desde el calendario.
- Turnos fijos: alta de abono → genera reservas semanales + cuota mensual.

### Fase 4b — Landing pública
- Página `/` pública (fuera del dashboard): presentación, deportes y canchas,
  grilla de disponibilidad de horarios (lectura), CTA "Soy socio" → portal y
  "Reservar" → contacto (WhatsApp/teléfono configurable).
- El dashboard pasa a `/panel` o `/app`; la raíz queda para la landing.

### Fase 5 — Control de acceso (QR / DNI)
- Carnet con QR (portal + imprimible). Check-in por cámara o DNI.
- Alerta de deuda vencida real al ingresar (no el campo `estado` a mano).
- Panel "personas dentro del predio" en vivo.

### Fase 6 — Kiosco · Caja diaria
- Venta rápida (concepto libre o mini-catálogo), fiado a cuenta corriente.
- Cierre de caja: ingresos del día por medio de pago, egresos, saldo.

### Fase 7 — Portal del socio
- `/portal`: estado de cuenta, cuotas, carnet QR, reservar cancha.
- Auto-registro → `pendiente_aprobacion` → aprobación desde administración.

### Fase 8 — Hardening + deploy
- RLS en todas las tablas, revisión de policies, security review.
- Automatización (pg_cron o Vercel Cron): generar cuotas, marcar vencidas, liberar holds.
- Variables en Vercel, seed de demo coherente, guía de operación.
