'use client'

import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/Toaster'
import { CommandPalette } from '@/components/CommandPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <CommandPalette />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Turnex</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">Demo Mode</span>
              <kbd className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">⌘K</kbd>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </>
  )
}