'use client'

import { Button } from '@/components/ui/Button'

export function PrintButton() {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      Imprimir
    </Button>
  )
}
