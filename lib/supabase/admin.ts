import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cliente con la secret key: acceso privilegiado a la API de Auth
// (crear usuarios, resetear contraseñas). Nunca debe llegar al navegador.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) {
    throw new Error('SUPABASE_SECRET_KEY no está definida (ver README / Supabase → Settings → API Keys → Secret key).')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
