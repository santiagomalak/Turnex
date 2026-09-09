import 'server-only'
import { query } from '@/lib/db'
import type { PlanMembresia } from '@/lib/types-supabase'

const COLS = 'id, nombre, precio_mensual, incluye_canchas, descuento_porcentaje'

export async function listPlanes(): Promise<PlanMembresia[]> {
  const { rows } = await query<PlanMembresia>(
    `select ${COLS} from plan_membresia order by precio_mensual`
  )
  return rows
}

export async function getPlan(id: string): Promise<PlanMembresia | null> {
  const { rows } = await query<PlanMembresia>(
    `select ${COLS} from plan_membresia where id = $1`,
    [id]
  )
  return rows[0] ?? null
}
