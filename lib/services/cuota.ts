import 'server-only'
import type { PoolClient } from 'pg'
import { tx } from '@/lib/db'
import * as cuotaRepo from '@/lib/repos/cuota'
import * as mov from '@/lib/repos/movimiento'
import { getConfigNumber } from '@/lib/config'

export const listarCuotas = cuotaRepo.listCuotas
export const marcarCuotasVencidas = cuotaRepo.marcarVencidas

type Db = Pick<PoolClient, 'query'>

/** Primer día del mes actual como 'YYYY-MM-01'. */
export function periodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Crea una cuota y su cargo en la cuenta corriente, y los vincula.
 * Es el patrón común de la cuota de membresía, la de abono y la de un plan de pago.
 */
export async function crearCuotaConCargo(
  db: Db,
  data: {
    personaId: string
    periodo: string | null
    monto: number
    concepto: string
    venceEl: string
    registradoPor: string | null
    planPagoId?: string | null
    abonoId?: string | null
  }
): Promise<{ cuotaId: string; cargoId: string }> {
  const cuota = await cuotaRepo.insertCuota(
    {
      personaId: data.personaId,
      periodo: data.periodo,
      monto: data.monto,
      fechaVencimiento: data.venceEl,
      concepto: data.concepto,
      planPagoId: data.planPagoId ?? null,
      abonoId: data.abonoId ?? null,
    },
    db
  )
  const cargo = await mov.insertCargo(
    {
      personaId: data.personaId,
      direccion: 'ingreso',
      tipo: 'cuota',
      monto: data.monto,
      concepto: data.concepto,
      venceEl: data.venceEl,
      cuotaId: cuota.id,
      registradoPor: data.registradoPor,
    },
    db
  )
  await cuotaRepo.setCuotaMovimiento(cuota.id, cargo.id, db)
  return { cuotaId: cuota.id, cargoId: cargo.id }
}

async function diasParaVencer(): Promise<number> {
  const n = await getConfigNumber('cuota.dias_para_vencer')
  return Number.isFinite(n) ? n : 10
}

/**
 * Genera las cuotas de membresía del período para los socios activos con plan
 * activo que todavía no la tienen.
 */
export async function generarCuotasDelMes(
  periodo: string,
  registradoPor: string | null
): Promise<{ generadas: number }> {
  const venceEl = sumarDias(periodo, await diasParaVencer())
  const pendientes = await cuotaRepo.sociosSinCuotaDelPeriodo(periodo)

  let generadas = 0
  for (const s of pendientes) {
    await tx((db) =>
      crearCuotaConCargo(db, {
        personaId: s.persona_id,
        periodo,
        monto: s.monto,
        concepto: s.concepto,
        venceEl,
        registradoPor,
      })
    )
    generadas++
  }
  return { generadas }
}

/**
 * Genera la cuota mensual de cada abono activo que todavía no la tiene para el período.
 */
export async function renovarCuotasDeAbonos(
  periodo: string,
  registradoPor: string | null
): Promise<{ generadas: number }> {
  const venceEl = sumarDias(periodo, await diasParaVencer())
  const pendientes = await cuotaRepo.abonosSinCuotaDelPeriodo(periodo)

  let generadas = 0
  for (const a of pendientes) {
    if (a.monto <= 0) continue
    await tx((db) =>
      crearCuotaConCargo(db, {
        personaId: a.persona_id,
        periodo,
        monto: a.monto,
        concepto: `${a.concepto} — ${periodo.slice(0, 7)}`,
        venceEl,
        registradoPor,
        abonoId: a.abono_id,
      })
    )
    generadas++
  }
  return { generadas }
}
