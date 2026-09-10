import 'server-only'
import { cache } from 'react'
import { query } from '@/lib/db'

// Lectura de los parámetros de negocio de la tabla `configuracion`.
// Se cachea por request (React.cache) para no ir a la base en cada acceso.

export type ConfigKey =
  | 'cuota.dia_generacion'
  | 'cuota.dias_para_vencer'
  | 'mora.habilitada'
  | 'mora.porcentaje_mensual'
  | 'complejo.nombre'

const loadConfig = cache(async (): Promise<Record<string, unknown>> => {
  const { rows } = await query<{ clave: string; valor: unknown }>(
    'select clave, valor from configuracion'
  )
  return Object.fromEntries(rows.map((r) => [r.clave, r.valor]))
})

export async function getConfig<T = unknown>(clave: ConfigKey): Promise<T> {
  const all = await loadConfig()
  return all[clave] as T
}

export async function getConfigNumber(clave: ConfigKey): Promise<number> {
  return Number(await getConfig(clave))
}

export async function getConfigBool(clave: ConfigKey): Promise<boolean> {
  return (await getConfig(clave)) === true
}

export type ConfigItem = { clave: string; valor: unknown; descripcion: string }

export async function listConfig(): Promise<ConfigItem[]> {
  const { rows } = await query<ConfigItem>(
    'select clave, valor, descripcion from configuracion order by clave'
  )
  return rows
}
