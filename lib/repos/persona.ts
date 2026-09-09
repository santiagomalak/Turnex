import 'server-only'
import { query } from '@/lib/db'
import type { Persona, RolPersona, EstadoPersona } from '@/lib/types-supabase'

// Acceso a datos de `persona` — SQL puro, sin lógica de negocio.

const COLS =
  'id, nombre, apellido, dni, email, telefono, rol, estado, fecha_alta, plan_membresia_id'

export async function listPersonas(filtro?: {
  rol?: RolPersona
  estado?: EstadoPersona
  busqueda?: string
}): Promise<Persona[]> {
  const where: string[] = []
  const params: unknown[] = []

  if (filtro?.rol) {
    params.push(filtro.rol)
    where.push(`rol = $${params.length}`)
  }
  if (filtro?.estado) {
    params.push(filtro.estado)
    where.push(`estado = $${params.length}`)
  }
  if (filtro?.busqueda?.trim()) {
    params.push(`%${filtro.busqueda.trim()}%`)
    where.push(
      `(nombre ilike $${params.length} or apellido ilike $${params.length} or dni ilike $${params.length})`
    )
  }

  const { rows } = await query<Persona>(
    `select ${COLS} from persona
     ${where.length ? `where ${where.join(' and ')}` : ''}
     order by apellido, nombre`,
    params
  )
  return rows
}

export async function getPersona(id: string): Promise<Persona | null> {
  const { rows } = await query<Persona>(`select ${COLS} from persona where id = $1`, [id])
  return rows[0] ?? null
}

export async function getPersonaByDni(dni: string): Promise<Persona | null> {
  const { rows } = await query<Persona>(`select ${COLS} from persona where dni = $1`, [dni])
  return rows[0] ?? null
}

export type PersonaInput = {
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  telefono: string | null
  rol: RolPersona
  estado: EstadoPersona
  plan_membresia_id: string | null
}

export async function insertPersona(data: PersonaInput): Promise<Persona> {
  const { rows } = await query<Persona>(
    `insert into persona (nombre, apellido, dni, email, telefono, rol, estado, plan_membresia_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${COLS}`,
    [
      data.nombre,
      data.apellido,
      data.dni,
      data.email,
      data.telefono,
      data.rol,
      data.estado,
      data.plan_membresia_id,
    ]
  )
  return rows[0]
}

export async function updatePersona(id: string, data: PersonaInput): Promise<Persona | null> {
  const { rows } = await query<Persona>(
    `update persona set
       nombre = $2, apellido = $3, dni = $4, email = $5, telefono = $6,
       rol = $7, estado = $8, plan_membresia_id = $9
     where id = $1
     returning ${COLS}`,
    [
      id,
      data.nombre,
      data.apellido,
      data.dni,
      data.email,
      data.telefono,
      data.rol,
      data.estado,
      data.plan_membresia_id,
    ]
  )
  return rows[0] ?? null
}

export async function deletePersona(id: string): Promise<void> {
  await query('delete from persona where id = $1', [id])
}
