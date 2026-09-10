'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { registroSocioAction } from './actions'

export function RegistroSocioForm() {
  const [state, formAction, pending] = useActionState(registroSocioAction, null)
  const fe = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors && <Alert variant="danger">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nombre" name="nombre" error={fe?.nombre} required />
        <Input label="Apellido" name="apellido" error={fe?.apellido} required />
      </div>
      <Input label="DNI" name="dni" inputMode="numeric" placeholder="30123456" error={fe?.dni} required />
      <Input label="Email" name="email" type="email" placeholder="tu@email.com" error={fe?.email} required />
      <Input label="Teléfono (opcional)" name="telefono" error={fe?.telefono} />
      <Input label="Contraseña" name="password" type="password" placeholder="mínimo 8 caracteres" error={fe?.password} required />
      <Button type="submit" loading={pending} className="w-full">
        Crear cuenta
      </Button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Tu cuenta queda pendiente de aprobación. Recepción la activa y te asigna un plan.
      </p>
    </form>
  )
}
