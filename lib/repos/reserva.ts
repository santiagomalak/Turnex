import 'server-only'
import { query, db as defaultDb, type Db } from '@/lib/db'
import type { Reserva, EstadoReserva } from '@/lib/types-supabase'

const COLS = `id, espacio_id, persona_id, fecha, hora_inicio, hora_fin, estado, precio,
  sena_pagada, creado_en, origen, abono_id, creada_por, movimiento_id, notas`

const prefixed = (alias: string) =>
  COLS.split(',')
    .map((c) => `${alias}.${c.trim()}`)
    .join(', ')

export type ReservaConDetalle = Reserva & {
  persona_nombre: string
  persona_apellido: string
  persona_rol: string
  espacio_nombre: string
  espacio_tipo: string
}

export async function listReservas(filtro: {
  desde: string
  hasta: string
  espacioId?: string
  personaId?: string
}): Promise<ReservaConDetalle[]> {
  const params: unknown[] = [filtro.desde, filtro.hasta]
  const where = ['r.fecha >= $1', 'r.fecha <= $2']
  if (filtro.espacioId) {
    params.push(filtro.espacioId)
    where.push(`r.espacio_id = $${params.length}`)
  }
  if (filtro.personaId) {
    params.push(filtro.personaId)
    where.push(`r.persona_id = $${params.length}`)
  }
  const { rows } = await query<ReservaConDetalle>(
    `select ${prefixed('r')},
            p.nombre as persona_nombre, p.apellido as persona_apellido, p.rol as persona_rol,
            e.nombre as espacio_nombre, e.tipo as espacio_tipo
     from reserva r
     join persona p on p.id = r.persona_id
     join espacio e on e.id = r.espacio_id
     where ${where.join(' and ')}
     order by r.fecha, r.hora_inicio`,
    params
  )
  return rows
}

export async function getReserva(id: string, db: Db = defaultDb): Promise<Reserva | null> {
  const { rows } = await db.query<Reserva>(`select ${COLS} from reserva where id = $1`, [id])
  return rows[0] ?? null
}

export type ReservaInput = {
  espacioId: string
  personaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: EstadoReserva
  precio: number
  senaPagada: boolean
  origen: 'recepcion' | 'portal' | 'abono'
  abonoId?: string | null
  creadaPor: string | null
  notas?: string | null
}

export async function insertReserva(data: ReservaInput, db: Db = defaultDb): Promise<Reserva> {
  const { rows } = await db.query<Reserva>(
    `insert into reserva
       (espacio_id, persona_id, fecha, hora_inicio, hora_fin, estado, precio,
        sena_pagada, origen, abono_id, creada_por, notas)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning ${COLS}`,
    [
      data.espacioId,
      data.personaId,
      data.fecha,
      data.horaInicio,
      data.horaFin,
      data.estado,
      data.precio,
      data.senaPagada,
      data.origen,
      data.abonoId ?? null,
      data.creadaPor,
      data.notas ?? null,
    ]
  )
  return rows[0]
}

export async function setReservaMovimiento(
  reservaId: string,
  movimientoId: string | null,
  db: Db
): Promise<void> {
  await db.query(`update reserva set movimiento_id = $2 where id = $1`, [reservaId, movimientoId])
}

export async function setReservaEstado(
  id: string,
  estado: EstadoReserva,
  db: Db = defaultDb
): Promise<void> {
  await db.query(`update reserva set estado = $2 where id = $1`, [id, estado])
}

export async function marcarSenaPagada(id: string, db: Db = defaultDb): Promise<void> {
  await db.query(`update reserva set sena_pagada = true, estado = 'confirmada' where id = $1`, [id])
}
