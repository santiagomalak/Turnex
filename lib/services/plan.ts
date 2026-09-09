import { z } from 'zod'
import * as repo from '@/lib/repos/plan'

const numero = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'))
  return NaN
}
const boolCheckbox = (v: unknown) => v === 'on' || v === 'true' || v === true

export const planSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(60),
  precio_mensual: z.preprocess(numero, z.number().nonnegative('El precio no puede ser negativo')),
  descuento_porcentaje: z.preprocess(
    numero,
    z.number().min(0, 'Mínimo 0').max(100, 'Máximo 100')
  ),
  incluye_canchas: z.preprocess(boolCheckbox, z.boolean()),
  activo: z.preprocess(boolCheckbox, z.boolean()),
})

export type PlanParsed = z.output<typeof planSchema>

export function parsePlan(input: unknown) {
  return planSchema.safeParse(input)
}

export const listarPlanes = repo.listPlanes

export async function crearPlan(data: PlanParsed) {
  return repo.insertPlan(data)
}

export async function editarPlan(id: string, data: PlanParsed) {
  const actual = await repo.getPlan(id)
  if (!actual) throw new Error('El plan no existe')
  return repo.updatePlan(id, data)
}

export async function eliminarPlan(id: string) {
  const enUso = await repo.countSociosConPlan(id)
  if (enUso > 0) {
    // No se borra un plan con socios: se desactiva.
    const actual = await repo.getPlan(id)
    if (!actual) return
    await repo.updatePlan(id, { ...actual, activo: false })
    return { desactivado: true, socios: enUso }
  }
  await repo.deletePlan(id)
  return { desactivado: false }
}
