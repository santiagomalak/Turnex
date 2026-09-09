import 'server-only'
import { tx } from '@/lib/db'
import * as cuotaRepo from '@/lib/repos/cuota'
import * as mov from '@/lib/repos/movimiento'
import { getConfigNumber } from '@/lib/config'

export const listarCuotas = cuotaRepo.listCuotas
export const marcarCuotasVencidas = cuotaRepo.marcarVencidas

/** Primer día del mes actual como 'YYYY-MM-01'. */
export function periodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Genera las cuotas de membresía del período para los socios activos con plan
 * activo que todavía no la tienen. Cada cuota crea su cargo en la cuenta corriente.
 */
export async function generarCuotasDelMes(
  periodo: string,
  registradoPor: string | null
): Promise<{ generadas: number }> {
  const diasParaVencer = await getConfigNumber('cuota.dias_para_vencer')
  const vencimiento = sumarDias(periodo, Number.isFinite(diasParaVencer) ? diasParaVencer : 10)
  const pendientes = await cuotaRepo.sociosSinCuotaDelPeriodo(periodo)

  let generadas = 0
  for (const s of pendientes) {
    await tx(async (db) => {
      const cuota = await cuotaRepo.insertCuota(
        {
          personaId: s.persona_id,
          periodo,
          monto: s.monto,
          fechaVencimiento: vencimiento,
          concepto: s.concepto,
        },
        db
      )
      const cargo = await mov.insertCargo(
        {
          personaId: s.persona_id,
          direccion: 'ingreso',
          tipo: 'cuota',
          monto: s.monto,
          concepto: s.concepto,
          venceEl: vencimiento,
          cuotaId: cuota.id,
          registradoPor,
        },
        db
      )
      await cuotaRepo.setCuotaMovimiento(cuota.id, cargo.id, db)
    })
    generadas++
  }
  return { generadas }
}
