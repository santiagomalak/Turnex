'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSocio } from '@/lib/auth'
import { fail, type ActionResult } from '@/lib/action-result'

export async function loginSocioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return fail('Ingresá email y contraseña')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return fail('Email o contraseña incorrectos')

  if (!(await getCurrentSocio())) {
    await supabase.auth.signOut()
    return fail('Esta cuenta no es de un socio')
  }
  redirect('/portal')
}

export async function logoutSocioAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portal/login')
}
