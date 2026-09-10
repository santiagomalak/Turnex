import 'server-only'
import { query } from '@/lib/db'
import type { Espacio } from '@/lib/types'

const COLS = 'id, nombre, tipo, precio_por_hora, estado, sector'

export async function listEspacios(opts?: { soloActivas?: boolean }): Promise<Espacio[]> {
  const { rows } = await query<Espacio>(
    `select ${COLS} from espacio
     ${opts?.soloActivas ? "where estado = 'activa'" : ''}
     order by coalesce(sector, ''), nombre`
  )
  return rows
}

export async function getEspacio(id: string): Promise<Espacio | null> {
  const { rows } = await query<Espacio>(`select ${COLS} from espacio where id = $1`, [id])
  return rows[0] ?? null
}

export type EspacioInput = {
  nombre: string
  tipo: Espacio['tipo']
  precio_por_hora: number
  estado: Espacio['estado']
  sector: string | null
}

export async function insertEspacio(data: EspacioInput): Promise<Espacio> {
  const { rows } = await query<Espacio>(
    `insert into espacio (nombre, tipo, precio_por_hora, estado, sector)
     values ($1, $2, $3, $4, $5)
     returning ${COLS}`,
    [data.nombre, data.tipo, data.precio_por_hora, data.estado, data.sector]
  )
  return rows[0]
}

export async function updateEspacio(id: string, data: EspacioInput): Promise<Espacio | null> {
  const { rows } = await query<Espacio>(
    `update espacio set nombre = $2, tipo = $3, precio_por_hora = $4, estado = $5, sector = $6
     where id = $1
     returning ${COLS}`,
    [id, data.nombre, data.tipo, data.precio_por_hora, data.estado, data.sector]
  )
  return rows[0] ?? null
}

export async function countReservasFuturas(id: string): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `select count(*)::int as n from reserva
     where espacio_id = $1 and fecha >= current_date and estado <> 'cancelada'`,
    [id]
  )
  return rows[0].n
}

export async function deleteEspacio(id: string): Promise<void> {
  await query('delete from espacio where id = $1', [id])
}
