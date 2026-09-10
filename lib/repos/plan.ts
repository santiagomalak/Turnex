import 'server-only'
import { query } from '@/lib/db'
import type { PlanMembresia } from '@/lib/types'

const COLS = 'id, nombre, precio_mensual, incluye_canchas, descuento_porcentaje, activo'

export async function listPlanes(opts?: { soloActivos?: boolean }): Promise<PlanMembresia[]> {
  const { rows } = await query<PlanMembresia>(
    `select ${COLS} from plan_membresia
     ${opts?.soloActivos ? 'where activo' : ''}
     order by activo desc, precio_mensual`
  )
  return rows
}

export async function getPlan(id: string): Promise<PlanMembresia | null> {
  const { rows } = await query<PlanMembresia>(`select ${COLS} from plan_membresia where id = $1`, [id])
  return rows[0] ?? null
}

export type PlanInput = {
  nombre: string
  precio_mensual: number
  incluye_canchas: boolean
  descuento_porcentaje: number
  activo: boolean
}

export async function insertPlan(data: PlanInput): Promise<PlanMembresia> {
  const { rows } = await query<PlanMembresia>(
    `insert into plan_membresia (nombre, precio_mensual, incluye_canchas, descuento_porcentaje, activo)
     values ($1, $2, $3, $4, $5)
     returning ${COLS}`,
    [data.nombre, data.precio_mensual, data.incluye_canchas, data.descuento_porcentaje, data.activo]
  )
  return rows[0]
}

export async function updatePlan(id: string, data: PlanInput): Promise<PlanMembresia | null> {
  const { rows } = await query<PlanMembresia>(
    `update plan_membresia set
       nombre = $2, precio_mensual = $3, incluye_canchas = $4,
       descuento_porcentaje = $5, activo = $6
     where id = $1
     returning ${COLS}`,
    [id, data.nombre, data.precio_mensual, data.incluye_canchas, data.descuento_porcentaje, data.activo]
  )
  return rows[0] ?? null
}

export async function countSociosConPlan(id: string): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `select count(*)::int as n from persona where plan_membresia_id = $1`,
    [id]
  )
  return rows[0].n
}

export async function deletePlan(id: string): Promise<void> {
  await query('delete from plan_membresia where id = $1', [id])
}
