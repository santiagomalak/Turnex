'use client'

import { useTransition } from 'react'
import { logoutAction } from '@/app/login/actions'

export function LogoutButton() {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(() => logoutAction())}
      disabled={pending}
      className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors disabled:opacity-50"
    >
      {pending ? 'Saliendo…' : 'Salir'}
    </button>
  )
}
