'use server'

import { revalidatePath } from 'next/cache'
import { parseVenta, registrarVenta } from '@/lib/services/caja'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const PUEDE = ['admin', 'recepcion', 'cobranzas'] as const

export type VentaInput = {
  persona_id: string | null
  medio_pago: string | null
  items: { concepto: string; precio: string; cantidad: string }[]
}

export async function registrarVentaAction(
  input: VentaInput
): Promise<ActionResult<{ total: number; fiado: boolean }>> {
  const staff = await staffPuede(PUEDE)
  if (!staff) return fail('No tenés permiso para esta acción')

  const parsed = parseVenta({
    persona_id: input.persona_id || null,
    medio_pago: input.medio_pago || null,
    items: input.items,
  })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const res = await registrarVenta(parsed.data, staff.staffId)
    revalidatePath('/caja')
    revalidatePath('/dashboard')
    return ok({ total: res.total, fiado: res.fiado })
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}
