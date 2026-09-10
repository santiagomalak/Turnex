import 'server-only'
import { query } from '@/lib/db'
import type { AccesoLog } from '@/lib/types'

const COLS = 'id, persona_id, hora_entrada, hora_salida, registrado_por'

export type AccesoConPersona = AccesoLog & {
  nombre: string
  apellido: string
  dni: string | null
  rol: string
}

export async function accesosAbiertos(): Promise<AccesoConPersona[]> {
  const { rows } = await query<AccesoConPersona>(
    `select ${COLS.split(',').map((c) => 'a.' + c.trim()).join(', ')},
            p.nombre, p.apellido, p.dni, p.rol
     from acceso_log a
     join persona p on p.id = a.persona_id
     where a.hora_salida is null
     order by a.hora_entrada desc`
  )
  return rows
}

export async function historialAccesos(filtro: {
  desde: string
  hasta: string
  personaId?: string
}): Promise<AccesoConPersona[]> {
  const params: unknown[] = [filtro.desde, filtro.hasta + ' 23:59:59']
  const where = ['a.hora_entrada >= $1', 'a.hora_entrada <= $2']
  if (filtro.personaId) {
    params.push(filtro.personaId)
    where.push(`a.persona_id = $${params.length}`)
  }
  const { rows } = await query<AccesoConPersona>(
    `select ${COLS.split(',').map((c) => 'a.' + c.trim()).join(', ')},
            p.nombre, p.apellido, p.dni, p.rol
     from acceso_log a
     join persona p on p.id = a.persona_id
     where ${where.join(' and ')}
     order by a.hora_entrada desc
     limit 300`,
    params
  )
  return rows
}

export async function accesoAbiertoDe(personaId: string): Promise<AccesoLog | null> {
  const { rows } = await query<AccesoLog>(
    `select ${COLS} from acceso_log where persona_id = $1 and hora_salida is null order by hora_entrada desc limit 1`,
    [personaId]
  )
  return rows[0] ?? null
}

export async function registrarEntrada(
  personaId: string,
  registradoPor: string | null
): Promise<AccesoLog> {
  const { rows } = await query<AccesoLog>(
    `insert into acceso_log (persona_id, registrado_por) values ($1, $2) returning ${COLS}`,
    [personaId, registradoPor]
  )
  return rows[0]
}

export async function registrarSalida(accesoId: string): Promise<void> {
  await query(`update acceso_log set hora_salida = now() where id = $1`, [accesoId])
}

export async function contarAccesosHoy(): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `select count(*)::int as n from acceso_log where hora_entrada::date = current_date`
  )
  return rows[0].n
}
