'use server'

import { revalidatePath } from 'next/cache'
import {
  buscarParaAcceso,
  registrarEntrada,
  registrarSalida,
  type ResultadoBusqueda,
} from '@/lib/services/acceso'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const ROLES = ['admin', 'recepcion'] as const

export async function buscarPersonaAction(valor: string): Promise<ActionResult<ResultadoBusqueda>> {
  if (!(await staffPuede(ROLES))) return fail('No tenés permiso para esta acción')
  const res = await buscarParaAcceso(valor)
  return ok(res)
}

export async function entradaAction(personaId: string): Promise<ActionResult> {
  const staff = await staffPuede(ROLES)
  if (!staff) return fail('No tenés permiso para esta acción')
  try {
    await registrarEntrada(personaId, staff.staffId)
    revalidatePath('/accesos')
    revalidatePath('/dashboard')
    return ok()
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Error al registrar la entrada')
  }
}

export async function salidaAction(personaId: string): Promise<ActionResult> {
  const staff = await staffPuede(ROLES)
  if (!staff) return fail('No tenés permiso para esta acción')
  try {
    await registrarSalida(personaId)
    revalidatePath('/accesos')
    revalidatePath('/dashboard')
    return ok()
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Error al registrar la salida')
  }
}
