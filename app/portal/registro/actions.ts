'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseRegistroSocio, registrarSolicitudSocio } from '@/lib/services/socio'
import { fail, fromZodError, type ActionResult } from '@/lib/action-result'

export async function registroSocioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseRegistroSocio({
    nombre: formData.get('nombre'),
    apellido: formData.get('apellido'),
    dni: formData.get('dni'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    password: formData.get('password'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    await registrarSolicitudSocio(parsed.data)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'No se pudo completar el registro')
  }

  // Ya queda logueado; el portal muestra "pendiente de aprobación".
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  })
  redirect('/portal')
}
