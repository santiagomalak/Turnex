import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
      // Los módulos de lib/ importan 'server-only' para que Next.js falle si
      // se cuelan al bundle del cliente. Bajo Vitest (fuera de Next) esa
      // importación tira siempre - la resolvemos al no-op real del paquete
      // (el mismo que usa Next del lado del servidor).
      'server-only': path.resolve(import.meta.dirname, 'node_modules/server-only/empty.js'),
    },
  },
})
