import { existsSync } from 'node:fs'

// Los tests de integración (los que tocan la base real) necesitan DATABASE_URL
// y compañía. Usamos el loader nativo de Node en vez de instalar 'dotenv'
// como dependencia.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}
