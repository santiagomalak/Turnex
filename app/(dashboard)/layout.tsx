import { requireStaff } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { LogoutButton } from '@/components/LogoutButton';

const rolLabel: Record<string, string> = {
  admin: 'Administración',
  recepcion: 'Recepción',
  cobranzas: 'Cobranzas',
  profesor: 'Profesor',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={staff.rol} />
      <main className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Turnex</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-zinc-900 dark:text-white leading-tight">
                {staff.nombre ?? staff.email}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">
                {rolLabel[staff.rol] ?? staff.rol}
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
