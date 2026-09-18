'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth'
import { fail, type ActionResult } from '@/lib/action-result'

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')

  if (!email || !password) return fail('Ingresá email y contraseña')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return fail('Email o contraseña incorrectos')

  const staff = await getCurrentStaff()
  if (!staff) {
    await supabase.auth.signOut()
    return fail('Esta cuenta no tiene acceso al panel de gestión')
  }

  const isSafeNext = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && !next.startsWith('/login')
  redirect(isSafeNext ? next : '/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
