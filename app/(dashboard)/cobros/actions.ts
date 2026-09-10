'use server'

import { revalidatePath } from 'next/cache'
import { marcarCuotasVencidas } from '@/lib/services/cuota'
import { correrTareasProgramadas, type ResultadoTareas } from '@/lib/services/tareas-programadas'
import { ok, fail, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

function revalidar() {
  revalidatePath('/cobros')
  revalidatePath('/dashboard')
}

export async function marcarVencidasAction(): Promise<ActionResult<{ marcadas: number }>> {
  if (!(await staffPuede(['admin', 'cobranzas']))) return fail('No tenés permiso para esta acción')
  try {
    const marcadas = await marcarCuotasVencidas()
    revalidar()
    return ok({ marcadas })
  } catch (err) {
    return fromDbError(err)
  }
}

/** Corre a mano las mismas tareas que el cron diario. */
export async function correrTareasAction(): Promise<ActionResult<ResultadoTareas>> {
  if (!(await staffPuede(['admin', 'cobranzas']))) return fail('No tenés permiso para esta acción')
  try {
    const resultado = await correrTareasProgramadas()
    revalidar()
    return ok(resultado)
  } catch (err) {
    return fromDbError(err)
  }
}
