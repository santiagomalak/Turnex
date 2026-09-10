'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { logoutSocioAction } from '../login/actions'

const items = [
  { href: '/portal', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/portal/cuenta', label: 'Mi cuenta', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/portal/reservar', label: 'Reservar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/portal/carnet', label: 'Carnet', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM8 10h8M8 14h4' },
]

export function PortalNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map((it) => {
          const active = pathname === it.href
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-1 py-2 text-xs ${
                active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={it.icon} />
              </svg>
              {it.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function LogoutSocio() {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(() => logoutSocioAction())}
      disabled={pending}
      className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
    >
      {pending ? 'Saliendo…' : 'Salir'}
    </button>
  )
}
