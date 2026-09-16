import { requireStaff } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/Toaster'
import { CommandPalette } from '@/components/CommandPalette'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff()

  return (
    <>
      <Toaster />
      <CommandPalette />
      <div className="flex h-screen overflow-hidden">
        <Sidebar rol={staff.rol} nombre={staff.nombre ?? undefined} />
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Turnex</h1>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{staff.nombre ?? staff.email}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{staff.rol}</p>
              </div>
              <form action="/api/logout" method="POST">
                <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Salir
                </button>
              </form>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </>
  )
}