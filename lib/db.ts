import 'server-only'
import { Pool, types, type QueryResult, type QueryResultRow, type PoolClient } from 'pg'

// Acceso a Postgres (Supabase) con SQL directo — sin ORM (ver PROJECT.md §2).
// Este módulo es server-only: nunca debe terminar en el bundle del navegador.

// Por defecto `pg` devuelve numeric/bigint como string. En este sistema los montos
// son pesos y las cuentas se hacen sumando, así que los parseamos a number acá.
types.setTypeParser(1700, (v) => (v === null ? null : Number.parseFloat(v))) // numeric
types.setTypeParser(20, (v) => (v === null ? null : Number.parseInt(v, 10))) // int8

// Fechas/horas como string (no `Date`), para que el resto del código las trate
// igual que cuando venían por JSON. `date` y `time` quedan tal cual las manda
// Postgres ('YYYY-MM-DD', 'HH:MM:SS'); los timestamps se normalizan a ISO.
types.setTypeParser(1082, (v) => v) // date
types.setTypeParser(1083, (v) => v) // time
types.setTypeParser(1266, (v) => v) // timetz
types.setTypeParser(1114, (v) => new Date(v.replace(' ', 'T') + 'Z').toISOString()) // timestamp (asumimos UTC)
types.setTypeParser(1184, (v) => new Date(v).toISOString()) // timestamptz

declare global {
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida. Revisá .env.local (ver SETUP.md §5).')
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Supabase exige TLS; el certificado del pooler no siempre encadena a una CA local.
    ssl: { rejectUnauthorized: false },
  })
}

// En dev, Next recarga módulos en cada cambio: guardamos el pool en `global`
// para no abrir una conexión nueva por cada hot-reload.
export const pool: Pool = global._pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') global._pgPool = pool

/**
 * Ejecuta una query SQL directa.
 *
 *   const { rows } = await query<Persona>('select * from persona where id = $1', [id])
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params)
}

/**
 * Ejecutor de queries: lo cumplen tanto el pool/`query` de arriba como el
 * `PoolClient` que recibe `tx()`. Los repos lo aceptan para poder participar
 * de una transacción o correr sueltos.
 */
export type Db = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>
}

export const db: Db = { query }

/**
 * Ejecuta `fn` dentro de una transacción: commit si resuelve, rollback si lanza.
 * Usar para toda operación que toca más de una fila y tiene que ser atómica
 * (cobrar una cuota, saldar una cuenta corriente, dar de alta un abono, etc.).
 *
 *   await tx(async (db) => {
 *     await db.query('insert into movimiento ...')
 *     await db.query('update cuota set estado = $1 ...', ['pagada'])
 *   })
 */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}
