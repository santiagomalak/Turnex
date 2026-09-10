import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSocio } from '@/lib/auth'
import { getConfig } from '@/lib/config'
import { LoginSocioForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function PortalLoginPage() {
  if (await getCurrentSocio()) redirect('/portal')
  const complejo = await getConfig<string>('complejo.nombre')

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{complejo ?? 'Complejo Deportivo'}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Portal del socio</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <LoginSocioForm />
        </div>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4">
          ¿No tenés cuenta?{' '}
          <Link href="/portal/registro" className="text-zinc-900 dark:text-white font-medium hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
