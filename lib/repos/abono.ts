import 'server-only'
import { query, db as defaultDb, type Db } from '@/lib/db'
import type { Abono } from '@/lib/types'

const COLS = `id, persona_id, espacio_id, dia_semana, hora_inicio, hora_fin,
  precio_mensual, vigente_desde, vigente_hasta, estado, creado_por, creado_en`

export type AbonoConDetalle = Abono & {
  persona_nombre: string
  persona_apellido: string
  espacio_nombre: string
}

export async function listAbonos(): Promise<AbonoConDetalle[]> {
  const { rows } = await query<AbonoConDetalle>(
    `select ${COLS.split(',').map((c) => 'a.' + c.trim()).join(', ')},
            p.nombre as persona_nombre, p.apellido as persona_apellido,
            e.nombre as espacio_nombre
     from abono a
     join persona p on p.id = a.persona_id
     join espacio e on e.id = a.espacio_id
     order by a.estado, a.dia_semana, a.hora_inicio`
  )
  return rows
}

export async function getAbono(id: string, db: Db = defaultDb): Promise<Abono | null> {
  const { rows } = await db.query<Abono>(`select ${COLS} from abono where id = $1`, [id])
  return rows[0] ?? null
}

export async function insertAbono(
  data: {
    personaId: string
    espacioId: string
    diaSemana: number
    horaInicio: string
    horaFin: string
    precioMensual: number
    vigenteDesde: string
    creadoPor: string | null
  },
  db: Db = defaultDb
): Promise<Abono> {
  const { rows } = await db.query<Abono>(
    `insert into abono
       (persona_id, espacio_id, dia_semana, hora_inicio, hora_fin, precio_mensual,
        vigente_desde, creado_por)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${COLS}`,
    [
      data.personaId,
      data.espacioId,
      data.diaSemana,
      data.horaInicio,
      data.horaFin,
      data.precioMensual,
      data.vigenteDesde,
      data.creadoPor,
    ]
  )
  return rows[0]
}

export async function setAbonoEstado(id: string, estado: Abono['estado']): Promise<void> {
  await query(`update abono set estado = $2 where id = $1`, [id, estado])
}
