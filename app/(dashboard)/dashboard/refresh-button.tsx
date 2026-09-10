'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'

export function RefreshButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => start(() => router.refresh())}>
      Actualizar
    </Button>
  )
}
