'use server'

import { revalidatePath } from 'next/cache'
import { parsePersona, crearPersona, editarPersona, eliminarPersona } from '@/lib/services/persona'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')

function readForm(formData: FormData) {
  return {
    nombre: formData.get('nombre'),
    apellido: formData.get('apellido'),
    dni: formData.get('dni'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    rol: formData.get('rol'),
    estado: formData.get('estado'),
    plan_membresia_id: formData.get('plan_membresia_id'),
  }
}

export async function guardarPersonaAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'recepcion']))) return SIN_PERMISO
  const id = (formData.get('id') as string) || null
  const parsed = parsePersona(readForm(formData))
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    if (id) await editarPersona(id, parsed.data)
    else await crearPersona(parsed.data)
  } catch (err) {
    return fromDbError(err)
  }

  revalidatePath('/personas')
  return ok()
}

export async function eliminarPersonaAction(id: string): Promise<ActionResult> {
  if (!(await staffPuede(['admin']))) return SIN_PERMISO
  try {
    await eliminarPersona(id)
  } catch (err) {
    return fromDbError(err)
  }
  revalidatePath('/personas')
  return ok()
}
