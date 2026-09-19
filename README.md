# Turnex

Sistema de gestión para un complejo deportivo: **socios y cuentas corrientes, cuotas,
reservas de canchas, turnos fijos (abonos), control de acceso, cobros, caja diaria y
portal del socio**.

Pensado para que lo use el staff (administración, recepción, cobranzas) desde el día de
apertura, y crecer sin reescribir: la landing pública y MercadoPago vienen después.

Plan por fases, estado y backlog: **[`ROADMAP.md`](ROADMAP.md)**. Modelo de datos:
**[`migrations/`](migrations/)** (única fuente de verdad, aplicado con `node-pg-migrate`).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js 16 (App Router) + TypeScript, un solo repo |
| Base de datos | PostgreSQL (Supabase) |
| Acceso a datos | SQL directo con `pg` — **sin ORM**. `node-pg-migrate` para migraciones |
| Auth | Supabase Auth (email/password) |
| Validación | Zod |
| Deploy | Vercel (con Vercel Cron para las tareas diarias) |

**Todo el acceso a datos es server-side** (Server Components + Server Actions con `pg`).
El navegador nunca habla con la base directamente.

### Arquitectura del código

```
lib/
  db.ts            Pool de Postgres + helper tx() para transacciones
  auth.ts          DAL de auth: requireStaff(roles), staffPuede(roles), getCurrentSocio
  config.ts        Parámetros de negocio (tabla `configuracion`)
  repos/*          SQL puro, sin lógica (server-only)
  services/*       Reglas de negocio + validación con Zod
app/
  (dashboard)/*    Panel del staff. Cada módulo: page.tsx (server) + *-client.tsx + actions.ts
                   (personas, planes, espacios, reservas, abonos, cobros, caja, accesos)
  portal/*         Portal del socio: login/registro y (socio)/ con las páginas con sesión
                   (inicio, cuenta, carnet, reservar)
  api/cron/        Endpoint que dispara Vercel Cron
  carnet/[id]/     Carnet imprimible con QR (solo socios)
  login/           Login del staff
proxy.ts           Chequeo de sesión antes de renderizar (reemplaza a middleware en Next 16)
migrations/*       Migraciones SQL (node-pg-migrate)
```

Patrón de un módulo: la **página** es un Server Component que trae los datos por un
*service* y los pasa a un **client component** (tablas, modales); las mutaciones van por
**Server Actions** que validan, chequean el rol y llaman al *service*.

---

## Requisitos

- Node.js 20.9+ (probado con 22/24)
- Una cuenta de Supabase con un proyecto creado

## Puesta en marcha

```bash
git clone https://github.com/santiagomalak/Turnex.git
cd Turnex
npm install
```

Creá `.env.local` en la raíz (**no se sube a git**):

```dotenv
# Postgres de Supabase — Settings → Database → "Connect"
# Local (o cualquier red con IPv6): conexión directa
#   postgresql://postgres:TU_PASSWORD@db.TU_REF.supabase.co:5432/postgres
# Vercel u otra red IPv4: OBLIGATORIO el Session Pooler (la directa es IPv6-only)
#   postgresql://postgres.TU_REF:TU_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_URL=...

# Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://TU_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # o la anon key legacy

# Settings → API → Secret keys (privada, acceso server-side a Auth)
SUPABASE_SECRET_KEY=sb_secret_...

# Token para proteger el endpoint del cron. Generá uno con:
#   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
CRON_SECRET=...

# Opcional, todavía no se usa
MERCADOPAGO_ACCESS_TOKEN=
```

Aplicá las migraciones y cargá datos de demo:

```bash
npm run migrate:up      # crea el esquema
npm run seed            # datos de demo coherentes + usuarios de Auth
```

Arrancá el servidor:

```bash
npm run dev             # http://localhost:3000
```

### Usuarios de demo

`npm run seed` crea estas cuentas (contraseña **`turnex1234`**):

| Email | Rol | Ve |
|---|---|---|
| `admin@turnex.com` | Administración | Todo el panel |
| `recepcion@turnex.com` | Recepción | Todo menos Planes |
| `cobranzas@turnex.com` | Cobranzas | Dashboard, Personas, Cobros, Caja |
| `socio@turnex.com` | Socio | Portal del socio (`/portal`) |

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción / correrlo |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Vitest) — precios, cuenta corriente, fechas |
| `npx playwright test` | Tests E2E (Playwright) — requiere `npm run seed` primero |
| `npm run migrate:up` / `migrate:down` | Aplicar / revertir migraciones |
| `npm run migrate:create -- <nombre>` | Nueva migración SQL |
| `npm run seed` | Reset a un estado de demo coherente (idempotente) |

---

## Tareas programadas (cron)

Una vez por día, `GET /api/cron` (protegido con `CRON_SECRET`) corre:

1. Genera las cuotas de membresía del mes de cada socio activo
2. Genera la cuota mensual de cada abono (turno fijo) activo
3. Marca como vencidas las cuotas que pasaron el vencimiento
4. Extiende los turnos fijos para mantener ~8 semanas por delante

Todo es **idempotente**: correrlo de más no duplica nada. También se puede disparar a
mano desde **Cobros → "Actualizar cuotas del mes"**.

En Vercel lo agenda `vercel.json` (03:00 AR). Localmente se puede probar con:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```

---

## Deploy en Vercel

**En producción**: <https://turnex-gold.vercel.app> — auto-deploy en cada push a `main`.

Puesta a punto (ya hecha, queda como referencia):

1. **`DATABASE_URL` con el Session Pooler.** Vercel es IPv4-only y la conexión
   directa de Supabase (`db.<ref>.supabase.co`) es IPv6-only → hay que usar el pooler
   (`aws-0-sa-east-1.pooler.supabase.com:5432`, usuario `postgres.<ref>`).
   `bash scripts/usar-pooler.sh` hace el cambio en `.env.local` y en Vercel.

2. **El resto de las variables de entorno** (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`) cargadas en
   los tres entornos (Production, Preview, Development).

3. **Deployment Protection** — Settings → Deployment Protection → apagar el toggle
   "Require Log In" de *Vercel Authentication*.

4. **`btree_gist` en el schema `extensions`** (migración `move-btree-gist-a-extensions`).

5. **Pendiente (1 clic del dueño)**: en Supabase → Authentication → Providers → Email,
   activar **"Prevent use of leaked passwords"**.

> Cuando el complejo confirme el acuerdo, la idea es crear un proyecto de Supabase
> **nuevo y separado** para producción. Todo el esquema vive en `migrations/`, así que
> migrar es correr `npm run migrate:up` contra la base nueva.

---

## Seguridad

- Todo el acceso a datos pasa por `pg` server-side con el rol `postgres` — no hay
  ningún cliente Supabase corriendo en el navegador. La autorización se hace en capas
  de aplicación, no en RLS.
- Cada página del panel llama a `requireStaff(roles)` (`lib/auth.ts`) y cada Server
  Action / Route Handler que toca datos sensibles vuelve a verificar la sesión y el
  rol ahí mismo (`staffPuede([...])` / `requireStaff([...])`) — no solo en `proxy.ts`.
- `proxy.ts` redirige a login antes de renderizar cualquier página protegida (defensa
  en profundidad, no el único chequeo).
- Headers de seguridad (CSP, `X-Frame-Options`, etc.) en `next.config.ts`.
