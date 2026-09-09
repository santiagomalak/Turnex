'use server'

import { revalidatePath } from 'next/cache'
import { parsePersona, crearPersona, editarPersona, eliminarPersona } from '@/lib/services/persona'
import { ok, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
// TODO (Fase 1): await requireStaff(['admin', 'recepcion']) al inicio de cada action.

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
  try {
    await eliminarPersona(id)
  } catch (err) {
    return fromDbError(err)
  }
  revalidatePath('/personas')
  return ok()
}
