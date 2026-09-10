'use server'

import { revalidatePath } from 'next/cache'
import { aprobarSocio, rechazarSocio } from '@/lib/services/socio'
import { ok, fail, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const PUEDE = ['admin', 'recepcion'] as const

function revalidar() {
  revalidatePath('/socios-pendientes')
  revalidatePath('/personas')
  revalidatePath('/dashboard')
}

export async function aprobarSocioAction(input: {
  personaId: string
  planId: string
  generarPrimeraCuota: boolean
}): Promise<ActionResult<{ cuotaGenerada: boolean }>> {
  const staff = await staffPuede(PUEDE)
  if (!staff) return fail('No tenés permiso para esta acción')
  if (!input.planId) return fail('Elegí un plan de membresía')

  try {
    const res = await aprobarSocio({
      personaId: input.personaId,
      planId: input.planId,
      generarPrimeraCuota: input.generarPrimeraCuota,
      registradoPor: staff.staffId,
    })
    revalidar()
    return ok(res)
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}

export async function rechazarSocioAction(personaId: string): Promise<ActionResult> {
  const staff = await staffPuede(PUEDE)
  if (!staff) return fail('No tenés permiso para esta acción')
  try {
    await rechazarSocio(personaId)
    revalidar()
    return ok()
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}
