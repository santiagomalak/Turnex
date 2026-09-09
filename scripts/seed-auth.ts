/**
 * Crea las cuentas de Supabase Auth para el staff (y un socio demo) y las
 * vincula con usuario_staff / persona.
 *
 *   node --conditions=react-server --env-file=.env.local --import tsx scripts/seed-auth.ts
 *   (o: npm run seed:auth)
 *
 * Password por defecto: 'turnex1234' (override con SEED_PASSWORD). Solo para demo.
 */
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { query } from '@/lib/db'

const PASSWORD = process.env.SEED_PASSWORD || 'turnex1234'

async function ensureUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<User> {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw listErr
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD })
    console.log(`  ~ ${email} (ya existía, contraseña reseteada)`)
    return existing
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  console.log(`  + ${email} (creado)`)
  return data.user
}

async function main() {
  const admin = createAdminClient()

  console.log('Staff:')
  const staff = await query<{ id: string; email: string }>('select id, email from usuario_staff')
  for (const s of staff.rows) {
    const user = await ensureUser(admin, s.email)
    await query('update usuario_staff set auth_user_id = $1 where id = $2', [user.id, s.id])
  }

  console.log('Socio demo:')
  const socioRow = (
    await query<{ id: string; nombre: string; apellido: string }>(
      "select id, nombre, apellido from persona where rol = 'socio' order by apellido limit 1"
    )
  ).rows[0]
  if (socioRow) {
    const email = 'socio@turnex.com'
    const user = await ensureUser(admin, email)
    await query('update persona set auth_user_id = $1 where id = $2', [user.id, socioRow.id])
    console.log(`    vinculado a ${socioRow.nombre} ${socioRow.apellido}`)
  }

  console.log(`\nListo. Contraseña de todas las cuentas: ${PASSWORD}`)
  console.log('Ingresá en /login con:')
  for (const s of staff.rows) console.log(`  - ${s.email}`)
  console.log('  - socio@turnex.com  (portal, cuando esté)')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
