'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { loginSocioAction } from './actions'

export function LoginSocioForm() {
  const [state, formAction, pending] = useActionState(loginSocioAction, null)
  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && <Alert variant="danger">{state.error}</Alert>}
      <Input label="Email" name="email" type="email" placeholder="tu@email.com" required autoFocus />
      <Input label="Contraseña" name="password" type="password" required />
      <Button type="submit" loading={pending} className="w-full">
        Entrar
      </Button>
    </form>
  )
}
