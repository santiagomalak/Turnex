'use server'

import { revalidatePath } from 'next/cache'
import { parseEspacio, crearEspacio, editarEspacio, eliminarEspacio } from '@/lib/services/espacio'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')

function readForm(fd: FormData) {
  return {
    nombre: fd.get('nombre'),
    tipo: fd.get('tipo'),
    estado: fd.get('estado'),
    precio_por_hora: fd.get('precio_por_hora'),
    sector: fd.get('sector'),
  }
}

export async function guardarEspacioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'recepcion']))) return SIN_PERMISO
  const id = (formData.get('id') as string) || null
  const parsed = parseEspacio(readForm(formData))
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    if (id) await editarEspacio(id, parsed.data)
    else await crearEspacio(parsed.data)
  } catch (err) {
    return fromDbError(err)
  }
  revalidatePath('/espacios')
  return ok()
}

export async function eliminarEspacioAction(id: string): Promise<ActionResult<{ mensaje: string }>> {
  if (!(await staffPuede(['admin']))) return SIN_PERMISO
  try {
    const res = await eliminarEspacio(id)
    if (res.bloqueado) {
      return fail(`La cancha tiene ${res.reservas} reserva(s) a futuro. Cancelalas o pasala a mantenimiento en vez de borrarla.`)
    }
    revalidatePath('/espacios')
    return ok({ mensaje: 'Cancha eliminada.' })
  } catch (err) {
    return fromDbError(err)
  }
}
