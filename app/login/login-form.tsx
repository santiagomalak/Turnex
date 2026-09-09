'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { loginAction } from './actions'

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state && !state.ok && <Alert variant="danger">{state.error}</Alert>}

      <Input label="Email" name="email" type="email" placeholder="vos@turnex.com" required autoFocus />
      <Input label="Contraseña" name="password" type="password" required />

      <Button type="submit" loading={pending} className="w-full">
        Entrar
      </Button>
    </form>
  )
}
