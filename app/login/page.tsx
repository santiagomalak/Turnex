import { redirect } from 'next/navigation'
import { getCurrentStaff } from '@/lib/auth'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  if (await getCurrentStaff()) redirect('/dashboard')
  const { next } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Turnex</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Panel de gestión</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  )
}
