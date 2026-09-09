import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'

// Data Access Layer de autenticación/autorización.
// Regla: toda página, Server Action y Route Handler que toca datos sensibles
// verifica la sesión acá, cerca de la data — no solo en el layout ni en proxy.ts.

export type StaffRol = 'admin' | 'recepcion' | 'cobranzas' | 'profesor'

export type SesionStaff = {
  authUserId: string
  staffId: string
  email: string
  rol: StaffRol
  nombre: string | null
}

export type SesionSocio = {
  authUserId: string
  personaId: string
  nombre: string
  estado: string
}

/** Usuario de Supabase Auth de la request actual (o null). Cacheado por request. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/** Staff logueado y activo, con su rol. null si no hay sesión o no es staff. */
export const getCurrentStaff = cache(async (): Promise<SesionStaff | null> => {
  const user = await getAuthUser()
  if (!user) return null
  const { rows } = await query<{
    staff_id: string
    email: string
    rol: StaffRol
    activo: boolean
    nombre: string | null
    apellido: string | null
  }>(
    `select u.id as staff_id, u.email, u.rol, u.activo, p.nombre, p.apellido
     from usuario_staff u
     left join persona p on p.id = u.persona_id
     where u.auth_user_id = $1`,
    [user.id]
  )
  const r = rows[0]
  if (!r || !r.activo) return null
  return {
    authUserId: user.id,
    staffId: r.staff_id,
    email: r.email,
    rol: r.rol,
    nombre: r.nombre ? `${r.nombre} ${r.apellido ?? ''}`.trim() : null,
  }
})

/** Para páginas/layouts: exige staff (y opcionalmente un rol). Redirige si no. */
export async function requireStaff(roles?: StaffRol[]): Promise<SesionStaff> {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  if (roles && !roles.includes(staff.rol)) redirect('/sin-acceso')
  return staff
}

/** Para Server Actions: devuelve el staff o null (sin redirigir). */
export async function staffPuede(roles?: StaffRol[]): Promise<SesionStaff | null> {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (roles && !roles.includes(staff.rol)) return null
  return staff
}

/** Socio logueado (portal). null si no hay sesión o el usuario no es un socio. */
export const getCurrentSocio = cache(async (): Promise<SesionSocio | null> => {
  const user = await getAuthUser()
  if (!user) return null
  const { rows } = await query<{
    id: string
    nombre: string
    apellido: string
    estado: string
  }>(`select id, nombre, apellido, estado from persona where auth_user_id = $1`, [user.id])
  const r = rows[0]
  if (!r) return null
  return {
    authUserId: user.id,
    personaId: r.id,
    nombre: `${r.nombre} ${r.apellido}`.trim(),
    estado: r.estado,
  }
}
)

export async function requireSocio(): Promise<SesionSocio> {
  const socio = await getCurrentSocio()
  if (!socio) redirect('/portal/login')
  return socio
}
