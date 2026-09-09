'use server'

import { revalidatePath } from 'next/cache'
import { generarCuotasDelMes, marcarCuotasVencidas, periodoActual } from '@/lib/services/cuota'
import { ok, fail, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

export async function generarCuotasAction(
  periodo: string
): Promise<ActionResult<{ generadas: number }>> {
  const staff = await staffPuede(['admin', 'cobranzas'])
  if (!staff) return fail('No tenés permiso para esta acción')
  if (!/^\d{4}-\d{2}-01$/.test(periodo)) return fail('Período inválido')
  try {
    const res = await generarCuotasDelMes(periodo, staff.staffId)
    revalidatePath('/cobros')
    revalidatePath('/dashboard')
    return ok(res)
  } catch (err) {
    return fromDbError(err)
  }
}

export async function marcarVencidasAction(): Promise<ActionResult<{ marcadas: number }>> {
  if (!(await staffPuede(['admin', 'cobranzas']))) return fail('No tenés permiso para esta acción')
  try {
    const marcadas = await marcarCuotasVencidas()
    revalidatePath('/cobros')
    revalidatePath('/dashboard')
    return ok({ marcadas })
  } catch (err) {
    return fromDbError(err)
  }
}

export async function periodoActualAction(): Promise<string> {
  return periodoActual()
}
