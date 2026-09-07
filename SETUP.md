# SETUP.md — Todo lo necesario antes de arrancar

Checklist de instalación y configuración. Hacelo en orden — cada sección depende de la anterior.

---

## 1. Software a instalar en tu máquina

| Herramienta | Para qué | Link |
|---|---|---|
| **Node.js** (versión LTS, 20.x o superior) | Corre Next.js y todo el proyecto | https://nodejs.org |
| **Git** | Control de versiones del proyecto | https://git-scm.com |
| **VSCode** | El editor donde vas a trabajar | https://code.visualstudio.com |
| **Extensión Claude Code** (en VSCode) | Para trabajar con ayuda de IA sobre el código real | Se instala desde el marketplace de extensiones de VSCode, buscando "Claude Code" |

Verificá que quedaron instalados corriendo esto en una terminal:
```bash
node -v
git --version
```

---

## 2. Cuentas a crear (antes de tocar código)

| Cuenta | Para qué | Nota |
|---|---|---|
| **Supabase** (supabase.com) | Base de datos Postgres + Auth | Plan gratuito alcanza para arrancar |
| **MercadoPago Developers** (mercadopago.com.ar/developers) | Credenciales de test para integrar pagos | Recién se usa en la fase de pagos online, pero conviene crearla ya |
| **GitHub** (opcional pero recomendado) | Backup del código y versionado | Podés trabajar sin esto, pero perdés historial si algo se rompe |

En Supabase, al crear el proyecto anotá (los vas a necesitar en el paso 4):
- Project URL
- API Key (`anon` key)
- Connection string de Postgres (Project Settings → Database)

---

## 3. Crear la carpeta y el proyecto base

En una terminal, ubicate donde quieras crear la carpeta del proyecto y corré:

```bash
npx create-next-app@latest complejo-deportivo --typescript --app --tailwind --eslint
cd complejo-deportivo
```

Cuando pregunte por configuración adicional, podés aceptar los valores por defecto — los vamos a ir ajustando desde Claude Code.

---

## 4. Dependencias del proyecto (acceso a datos sin ORM)

Dentro de la carpeta del proyecto:

```bash
npm install pg node-pg-migrate qrcode dotenv
npm install -D @types/pg @types/qrcode
```

Qué es cada una:
- `pg` — cliente de Postgres para correr SQL directo
- `node-pg-migrate` — manejo de migraciones de la base de datos
- `qrcode` — generación de los QR de acceso
- `dotenv` — carga de variables de entorno
- `@types/*` — tipado de TypeScript para las librerías anteriores

---

## 5. Variables de entorno

Creá un archivo `.env.local` en la raíz del proyecto (este archivo **nunca se sube a git**):

```
DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_db
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
MERCADOPAGO_ACCESS_TOKEN=tu-token-de-test
```

Reemplazá cada valor con lo que anotaste en el paso 2. Verificá que `.env.local` esté en el `.gitignore` (Next.js lo agrega solo, pero confirmalo).

---

## 6. Poner los documentos de contexto en la raíz del repo

Copiá estos tres archivos a la raíz de `complejo-deportivo/`:
- `PROJECT.md`
- `PLAN_DESARROLLO.md`
- `SETUP.md` (este archivo)

Así cualquier sesión de Claude Code arranca con el contexto completo del proyecto sin que tengas que repetirlo cada vez.

---

## 7. Primer comando para correr con Claude Code

Abrí la carpeta del proyecto en VSCode, abrí Claude Code, y como primer pedido decile algo como:

> "Leé PROJECT.md y PLAN_DESARROLLO.md. Vamos a hacer el paso 0 y 1 del plan: confirmar la conexión a Postgres y crear la migración inicial con las tablas del modelo de datos."

A partir de ahí seguís la tabla de pasos de `PLAN_DESARROLLO.md`, uno por uno.

---

## Checklist rápido antes de arrancar

- [ ] Node.js y Git instalados
- [ ] VSCode + extensión Claude Code instalados
- [ ] Cuenta de Supabase creada, con URL/keys/connection string anotadas
- [ ] Cuenta de MercadoPago Developers creada
- [ ] Proyecto Next.js creado (`create-next-app`)
- [ ] Dependencias instaladas (`pg`, `node-pg-migrate`, `qrcode`, `dotenv`)
- [ ] `.env.local` cargado y confirmado en `.gitignore`
- [ ] `PROJECT.md` y `PLAN_DESARROLLO.md` copiados a la raíz del repo
