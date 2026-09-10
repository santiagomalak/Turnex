import 'server-only'
import { z } from 'zod'
import { tx, query } from '@/lib/db'
import { crearCuotaConCargo } from '@/lib/services/cuota'
import type { PlanPago } from '@/lib/types'

const numero = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'))
  return NaN
}

export const planPagoSchema = z.object({
  descripcion: z.string().trim().min(1, 'Describí la deuda que se financia').max(120),
  total: z.preprocess(numero, z.number().positive('El total debe ser mayor a 0')),
  cant_cuotas: z.preprocess(numero, z.number().int().min(1, 'Mínimo 1 cuota').max(60, 'Máximo 60')),
  primer_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

export type PlanPagoParsed = z.output<typeof planPagoSchema>

export function parsePlanPago(input: unknown) {
  return planPagoSchema.safeParse(input)
}

function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + n, d))
  return base.toISOString().slice(0, 10)
}

/**
 * Crea un plan de pago: divide `total` en `cant_cuotas` cuotas mensuales, y
 * carga cada una a la cuenta corriente de la persona con su vencimiento.
 */
export async function crearPlanPago(
  personaId: string,
  data: PlanPagoParsed,
  registradoPor: string | null
): Promise<PlanPago> {
  const cuota = Math.round((data.total / data.cant_cuotas) * 100) / 100
  const montos = Array.from({ length: data.cant_cuotas }, (_, i) =>
    i === data.cant_cuotas - 1
      ? Math.round((data.total - cuota * (data.cant_cuotas - 1)) * 100) / 100
      : cuota
  )

  return tx(async (db) => {
    const { rows } = await db.query<PlanPago>(
      `insert into plan_pago (persona_id, descripcion, total, cant_cuotas, creado_por)
       values ($1, $2, $3, $4, $5)
       returning id, persona_id, descripcion, total, cant_cuotas, estado, creado_por, creado_en`,
      [personaId, data.descripcion, data.total, data.cant_cuotas, registradoPor]
    )
    const plan = rows[0]

    for (let i = 0; i < data.cant_cuotas; i++) {
      await crearCuotaConCargo(db, {
        personaId,
        periodo: null,
        monto: montos[i],
        concepto: `${data.descripcion} (${i + 1}/${data.cant_cuotas})`,
        venceEl: addMonths(data.primer_vencimiento, i),
        registradoPor,
        planPagoId: plan.id,
      })
    }
    return plan
  })
}

export async function listarPlanesPago(personaId: string): Promise<PlanPago[]> {
  const { rows } = await query<PlanPago>(
    `select id, persona_id, descripcion, total, cant_cuotas, estado, creado_por, creado_en
     from plan_pago where persona_id = $1 order by creado_en desc`,
    [personaId]
  )
  return rows
}
