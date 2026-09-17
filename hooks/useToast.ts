'use client'

import { toast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading'

interface ToastOptions {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

export function useToast() {
  const notify = (type: ToastType, message: string, options?: ToastOptions) => {
    const baseOptions = {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 4000,
    }

    switch (type) {
      case 'success':
        return toast.success(message, baseOptions)
      case 'error':
        return toast.error(message, baseOptions)
      case 'info':
        return toast.info(message, baseOptions)
      case 'warning':
        return toast.warning(message, baseOptions)
      case 'loading':
        return toast.loading(message, baseOptions)
    }
  }

  const promise = <T,>(promise: Promise<T>, messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: Error) => string)
  }) => {
    return toast.promise(promise, messages)
  }

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId)
  }

  return {
    success: (message: string, options?: ToastOptions) => notify('success', message, options),
    error: (message: string, options?: ToastOptions) => notify('error', message, options),
    info: (message: string, options?: ToastOptions) => notify('info', message, options),
    warning: (message: string, options?: ToastOptions) => notify('warning', message, options),
    loading: (message: string, options?: ToastOptions) => notify('loading', message, options),
    promise,
    dismiss,
  }
}

export { toast }