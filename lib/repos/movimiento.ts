import 'server-only'
import { query, db as defaultDb, type Db } from '@/lib/db'
import type { Movimiento, DireccionMov, TipoMov, MedioPago } from '@/lib/types-supabase'

const COLS = `id, persona_id, cuota_id, reserva_id, clase, tipo, monto, saldo,
  medio_pago, comprobante_url, registrado_por, fecha, vence_el, estado, direccion,
  concepto, anulado`

const prefixed = (alias: string) =>
  COLS.split(',')
    .map((c) => `${alias}.${c.trim()}`)
    .join(', ')

export async function listMovimientosPersona(personaId: string): Promise<Movimiento[]> {
  const { rows } = await query<Movimiento>(
    `select ${COLS} from movimiento
     where persona_id = $1 and not anulado
     order by fecha desc, id`,
    [personaId]
  )
  return rows
}

export async function listCargosAbiertos(
  personaId: string,
  direccion: DireccionMov
): Promise<Movimiento[]> {
  const { rows } = await query<Movimiento>(
    `select ${COLS} from movimiento
     where persona_id = $1 and clase = 'cargo' and direccion = $2
       and saldo > 0 and not anulado
     order by coalesce(vence_el, fecha::date), fecha`,
    [personaId, direccion]
  )
  return rows
}

export async function getMovimiento(id: string, db: Db = defaultDb): Promise<Movimiento | null> {
  const { rows } = await db.query<Movimiento>(`select ${COLS} from movimiento where id = $1`, [id])
  return rows[0] ?? null
}

export async function lockMovimiento(id: string, db: Db): Promise<Movimiento | null> {
  const { rows } = await db.query<Movimiento>(
    `select ${COLS} from movimiento where id = $1 for update`,
    [id]
  )
  return rows[0] ?? null
}

export type CargoInput = {
  personaId: string
  direccion: DireccionMov
  tipo: TipoMov
  monto: number
  concepto: string | null
  venceEl: string | null
  cuotaId?: string | null
  reservaId?: string | null
  registradoPor: string | null
  fecha?: string
}

export async function insertCargo(data: CargoInput, db: Db = defaultDb): Promise<Movimiento> {
  const { rows } = await db.query<Movimiento>(
    `insert into movimiento
       (persona_id, clase, tipo, monto, saldo, direccion, concepto, vence_el,
        cuota_id, reserva_id, registrado_por, fecha, estado)
     values ($1, 'cargo', $2, $3, $3, $4, $5, $6, $7, $8, $9, coalesce($10, now()), 'pendiente')
     returning ${COLS}`,
    [
      data.personaId,
      data.tipo,
      data.monto,
      data.direccion,
      data.concepto,
      data.venceEl,
      data.cuotaId ?? null,
      data.reservaId ?? null,
      data.registradoPor,
      data.fecha ?? null,
    ]
  )
  return rows[0]
}

export type PagoInput = {
  personaId: string
  direccion: DireccionMov
  monto: number
  medioPago: MedioPago
  concepto: string | null
  comprobanteUrl: string | null
  registradoPor: string | null
  fecha?: string
}

export async function insertPago(data: PagoInput, db: Db): Promise<Movimiento> {
  const { rows } = await db.query<Movimiento>(
    `insert into movimiento
       (persona_id, clase, tipo, monto, saldo, direccion, medio_pago, concepto,
        comprobante_url, registrado_por, fecha, estado)
     values ($1, 'pago', 'pago', $2, $2, $3, $4, $5, $6, $7, coalesce($8, now()), 'pagado')
     returning ${COLS}`,
    [
      data.personaId,
      data.monto,
      data.direccion,
      data.medioPago,
      data.concepto,
      data.comprobanteUrl,
      data.registradoPor,
      data.fecha ?? null,
    ]
  )
  return rows[0]
}

export async function aplicarImputacion(
  pagoId: string,
  cargoId: string,
  monto: number,
  db: Db
): Promise<void> {
  await db.query(`insert into imputacion (pago_id, cargo_id, monto) values ($1, $2, $3)`, [
    pagoId,
    cargoId,
    monto,
  ])
  await db.query(
    `update movimiento
       set saldo = saldo - $2,
           estado = case when saldo - $2 <= 0 then 'saldado' else 'parcial' end
     where id = $1`,
    [cargoId, monto]
  )
  await db.query(`update movimiento set saldo = saldo - $2 where id = $1`, [pagoId, monto])
}

export async function marcarAnulado(id: string, db: Db = defaultDb): Promise<void> {
  await db.query(`update movimiento set anulado = true where id = $1`, [id])
}

export type MovimientoConPersona = Movimiento & { nombre: string; apellido: string }

export async function historial(limite = 100): Promise<MovimientoConPersona[]> {
  const { rows } = await query<MovimientoConPersona>(
    `select ${prefixed('m')}, p.nombre, p.apellido
     from movimiento m
     join persona p on p.id = m.persona_id
     where not m.anulado
     order by m.fecha desc
     limit $1`,
    [limite]
  )
  return rows
}
