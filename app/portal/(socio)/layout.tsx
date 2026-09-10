import { requireSocio } from '@/lib/auth'
import { getConfig } from '@/lib/config'
import { PortalNav, LogoutSocio } from './portal-nav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const socio = await requireSocio()
  const complejo = await getConfig<string>('complejo.nombre')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{complejo ?? 'Complejo'}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{socio.nombre}</p>
          </div>
          <LogoutSocio />
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-5">{children}</main>
      <PortalNav />
    </div>
  )
}
