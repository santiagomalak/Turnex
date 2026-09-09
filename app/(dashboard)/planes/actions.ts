'use server'

import { revalidatePath } from 'next/cache'
import { parsePlan, crearPlan, editarPlan, eliminarPlan } from '@/lib/services/plan'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')

function readForm(fd: FormData) {
  return {
    nombre: fd.get('nombre'),
    precio_mensual: fd.get('precio_mensual'),
    descuento_porcentaje: fd.get('descuento_porcentaje'),
    incluye_canchas: fd.get('incluye_canchas'),
    activo: fd.get('activo'),
  }
}

export async function guardarPlanAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await staffPuede(['admin']))) return SIN_PERMISO
  const id = (formData.get('id') as string) || null
  const parsed = parsePlan(readForm(formData))
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    if (id) await editarPlan(id, parsed.data)
    else await crearPlan(parsed.data)
  } catch (err) {
    return fromDbError(err)
  }
  revalidatePath('/planes')
  return ok()
}

export async function eliminarPlanAction(id: string): Promise<ActionResult<{ mensaje: string }>> {
  if (!(await staffPuede(['admin']))) return SIN_PERMISO
  try {
    const res = await eliminarPlan(id)
    revalidatePath('/planes')
    return ok({
      mensaje: res?.desactivado
        ? `El plan tiene ${res.socios} socio(s), así que se desactivó en vez de borrarse.`
        : 'Plan eliminado.',
    })
  } catch (err) {
    return fromDbError(err)
  }
}
