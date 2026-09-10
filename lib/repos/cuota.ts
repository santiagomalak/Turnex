import 'server-only'
import { query, db as defaultDb, type Db } from '@/lib/db'
import type { Cuota, EstadoCuota } from '@/lib/types'

const COLS =
  'id, persona_id, periodo, monto, estado, fecha_vencimiento, plan_pago_id, abono_id, concepto, movimiento_id'

const prefixed = (alias: string) =>
  COLS.split(',')
    .map((c) => `${alias}.${c.trim()}`)
    .join(', ')

export async function listCuotas(filtro?: {
  personaId?: string
  estados?: EstadoCuota[]
}): Promise<Cuota[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (filtro?.personaId) {
    params.push(filtro.personaId)
    where.push(`persona_id = $${params.length}`)
  }
  if (filtro?.estados?.length) {
    params.push(filtro.estados)
    where.push(`estado = any($${params.length})`)
  }
  const { rows } = await query<Cuota>(
    `select ${COLS} from cuota
     ${where.length ? `where ${where.join(' and ')}` : ''}
     order by fecha_vencimiento, id`,
    params
  )
  return rows
}

export async function getCuota(id: string, db: Db = defaultDb): Promise<Cuota | null> {
  const { rows } = await db.query<Cuota>(`select ${COLS} from cuota where id = $1`, [id])
  return rows[0] ?? null
}

/** Socios activos con plan activo que todavía no tienen cuota para ese período. */
export async function sociosSinCuotaDelPeriodo(
  periodo: string
): Promise<{ persona_id: string; monto: number; concepto: string }[]> {
  const { rows } = await query<{ persona_id: string; monto: number; concepto: string }>(
    `select p.id as persona_id,
            pm.precio_mensual as monto,
            'Cuota ' || to_char($1::date, 'MM/YYYY') as concepto
     from persona p
     join plan_membresia pm on pm.id = p.plan_membresia_id
     where p.rol = 'socio' and p.estado = 'activo' and pm.activo
       and not exists (
         select 1 from cuota c
         where c.persona_id = p.id and c.periodo = $1::date and c.abono_id is null
       )`,
    [periodo]
  )
  return rows
}

export async function insertCuota(
  data: {
    personaId: string
    periodo: string | null
    monto: number
    fechaVencimiento: string
    concepto: string | null
    planPagoId?: string | null
    abonoId?: string | null
  },
  db: Db = defaultDb
): Promise<Cuota> {
  const { rows } = await db.query<Cuota>(
    `insert into cuota (persona_id, periodo, monto, fecha_vencimiento, concepto, plan_pago_id, abono_id, estado)
     values ($1, $2, $3, $4, $5, $6, $7, 'pendiente')
     returning ${COLS}`,
    [
      data.personaId,
      data.periodo,
      data.monto,
      data.fechaVencimiento,
      data.concepto,
      data.planPagoId ?? null,
      data.abonoId ?? null,
    ]
  )
  return rows[0]
}

/** Abonos activos que todavía no tienen cuota para `periodo`. */
export async function abonosSinCuotaDelPeriodo(periodo: string): Promise<
  { abono_id: string; persona_id: string; monto: number; concepto: string }[]
> {
  const { rows } = await query<{ abono_id: string; persona_id: string; monto: number; concepto: string }>(
    `select a.id as abono_id, a.persona_id, a.precio_mensual as monto,
            'Abono ' || e.nombre || ' (' ||
              (array['dom','lun','mar','mié','jue','vie','sáb'])[a.dia_semana + 1] || ' ' ||
              to_char(a.hora_inicio, 'HH24:MI') || ')' as concepto
     from abono a
     join espacio e on e.id = a.espacio_id
     where a.estado = 'activo'
       and (a.vigente_hasta is null or a.vigente_hasta >= $1::date)
       and not exists (select 1 from cuota c where c.abono_id = a.id and c.periodo = $1::date)`,
    [periodo]
  )
  return rows
}

export async function setCuotaMovimiento(
  cuotaId: string,
  movimientoId: string,
  db: Db
): Promise<void> {
  await db.query(`update cuota set movimiento_id = $2 where id = $1`, [cuotaId, movimientoId])
}

export async function setCuotaEstado(
  cuotaId: string,
  estado: EstadoCuota,
  db: Db = defaultDb
): Promise<void> {
  await db.query(`update cuota set estado = $2 where id = $1`, [cuotaId, estado])
}

export type CuotaConPersona = Cuota & {
  nombre: string
  apellido: string
  saldo: number
}

export async function listCuotasPendientesConPersona(): Promise<CuotaConPersona[]> {
  const { rows } = await query<CuotaConPersona>(
    `select ${prefixed('c')},
            p.nombre, p.apellido,
            coalesce(m.saldo, c.monto) as saldo
     from cuota c
     join persona p on p.id = c.persona_id
     left join movimiento m on m.id = c.movimiento_id and not m.anulado
     where c.estado in ('pendiente', 'parcial', 'vencida')
     order by c.fecha_vencimiento, p.apellido`
  )
  return rows
}

/** Pasa a 'vencida' las cuotas pendientes/parciales cuyo vencimiento ya pasó. */
export async function marcarVencidas(): Promise<number> {
  const { rowCount } = await query(
    `update cuota set estado = 'vencida'
     where estado in ('pendiente', 'parcial') and fecha_vencimiento < current_date`
  )
  return rowCount ?? 0
}
