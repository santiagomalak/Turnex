'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="system"
      closeButton
      toastOptions={{
        duration: 4000,
      }}
    />
  )
}