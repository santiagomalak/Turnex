'use server'

import { revalidatePath } from 'next/cache'
import { parseAbono, crearAbono, setAbonoEstado } from '@/lib/services/abono'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')

export async function crearAbonoAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ reservasCreadas: number; reservasConflicto: number }>> {
  const staff = await staffPuede(['admin', 'recepcion'])
  if (!staff) return SIN_PERMISO

  const parsed = parseAbono({
    persona_id: formData.get('persona_id'),
    espacio_id: formData.get('espacio_id'),
    dia_semana: formData.get('dia_semana'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    precio_mensual: formData.get('precio_mensual'),
    vigente_desde: formData.get('vigente_desde'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const res = await crearAbono(parsed.data, staff.staffId)
    revalidatePath('/abonos')
    revalidatePath('/reservas')
    return ok({ reservasCreadas: res.reservasCreadas, reservasConflicto: res.reservasConflicto })
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}

export async function cambiarEstadoAbonoAction(
  id: string,
  estado: 'activo' | 'pausado' | 'cancelado'
): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'recepcion']))) return SIN_PERMISO
  try {
    await setAbonoEstado(id, estado)
    revalidatePath('/abonos')
    return ok()
  } catch (err) {
    return fromDbError(err)
  }
}
