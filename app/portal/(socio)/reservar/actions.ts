'use server'

import { revalidatePath } from 'next/cache'
import { requireSocio } from '@/lib/auth'
import { parseReserva, crearReserva } from '@/lib/services/reserva'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'

export async function reservarSocioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ precio: number }>> {
  const socio = await requireSocio()
  if (socio.estado === 'pendiente_aprobacion') {
    return fail('Tu cuenta todavía no está activa')
  }

  const parsed = parseReserva({
    espacio_id: formData.get('espacio_id'),
    persona_id: socio.personaId, // el socio solo reserva para sí mismo
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    cobrar_ahora: false, // sin pago online: va a la cuenta corriente
    notas: null,
  })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const res = await crearReserva(parsed.data, null, 'portal')
    revalidatePath('/portal/reservar')
    revalidatePath('/portal')
    return ok({ precio: res.precio })
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}
