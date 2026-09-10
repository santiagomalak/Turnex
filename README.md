# Turnex

Sistema de gestión para un complejo deportivo: **socios y cuentas corrientes, cuotas,
reservas de canchas, turnos fijos (abonos), control de acceso y cobros**.

Pensado para que lo use el staff (administración, recepción, cobranzas) desde el día de
apertura, y crecer sin reescribir: portal del socio, kiosco/caja y MercadoPago vienen
después.

Plan por fases y estado: **[`ROADMAP.md`](ROADMAP.md)**. Modelo de datos y decisiones de
arquitectura: **[`PROJECT.md`](PROJECT.md)**.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js 16 (App Router) + TypeScript, un solo repo |
| Base de datos | PostgreSQL (Supabase) |
| Acceso a datos | SQL directo con `pg` — **sin ORM**. `node-pg-migrate` para migraciones |
| Auth | Supabase Auth (email/password) + Row Level Security |
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
# Postgres de Supabase — Settings → Database → Connection string (URI)
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.TU_REF.supabase.co:5432/postgres

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
| `admin@turnex.com` | Administración | Todo |
| `recepcion@turnex.com` | Recepción | Todo menos Planes |
| `cobranzas@turnex.com` | Cobranzas | Dashboard, Personas, Cobros |
| `socio@turnex.com` | Socio (portal, próximamente) | — |

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción / correrlo |
| `npm run lint` | ESLint |
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

El proyecto ya está enlazado (`.vercel/`). Para publicarlo:

1. **Variables de entorno** (una vez) — desde la raíz del proyecto, con la CLI logueada:

   ```bash
   for k in DATABASE_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
            SUPABASE_SECRET_KEY CRON_SECRET; do
     v=$(grep "^$k=" .env.local | cut -d= -f2-)
     printf '%s' "$v" | vercel env add "$k" production
   done
   ```

   (o cargalas a mano en Vercel → Project → Settings → Environment Variables)

2. **Deploy**:

   ```bash
   vercel --prod
   ```

3. **Post-deploy en Supabase**:
   - Authentication → Policies → activar **"Leaked password protection"**
   - Si el tráfico crece, cambiar `DATABASE_URL` a la conexión *pooler en modo sesión*
     (Supabase → Database → Connection pooling)

> Cuando el complejo confirme el acuerdo, la idea es crear un proyecto de Supabase
> **nuevo y separado** para producción. Todo el esquema vive en `migrations/`, así que
> migrar es correr `npm run migrate:up` contra la base nueva.

---

## Seguridad

- Todas las tablas tienen **RLS activada** sin policies: la app entra como el rol
  `postgres` (que saltea RLS), y cualquier acceso con la anon key contra la API de
  Supabase queda denegado.
- Cada Server Action verifica el rol antes de mutar (`staffPuede([...])`).
- `proxy.ts` redirige a login antes de renderizar cualquier página del panel.
