'use server'

import { revalidatePath } from 'next/cache'
import { parseReserva, crearReserva, cancelarReserva, marcarEstadoReserva } from '@/lib/services/reserva'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')

function revalidar() {
  revalidatePath('/reservas')
  revalidatePath('/dashboard')
}

export async function crearReservaAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ precio: number; cobrado: boolean; aCuentaCorriente: boolean }>> {
  const staff = await staffPuede(['admin', 'recepcion'])
  if (!staff) return SIN_PERMISO

  const parsed = parseReserva({
    espacio_id: formData.get('espacio_id'),
    persona_id: formData.get('persona_id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    cobrar_ahora: formData.get('cobrar_ahora'),
    medio_pago: formData.get('medio_pago') || undefined,
    notas: formData.get('notas'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const res = await crearReserva(parsed.data, staff.staffId)
    revalidar()
    return ok({ precio: res.precio, cobrado: res.cobrado, aCuentaCorriente: res.aCuentaCorriente })
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}

export async function cancelarReservaAction(id: string): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'recepcion']))) return SIN_PERMISO
  try {
    await cancelarReserva(id)
    revalidar()
    return ok()
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}

export async function marcarEstadoReservaAction(
  id: string,
  estado: 'cumplida' | 'ausente' | 'confirmada'
): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'recepcion']))) return SIN_PERMISO
  try {
    await marcarEstadoReserva(id, estado)
    revalidar()
    return ok()
  } catch (err) {
    return fromDbError(err)
  }
}
