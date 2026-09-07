import { Pool, type QueryResultRow } from "pg";

// Conexión a Postgres (Supabase) vía SQL directo con `pg` — sin ORM.
// En dev, Next.js recarga módulos en cada cambio; guardamos el pool en
// `global` para no abrir una conexión nueva por cada hot-reload.

declare global {
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definida. Revisá .env.local (ver SETUP.md sección 5)."
    );
  }

  return new Pool({ connectionString });
}

export const pool = global._pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

/**
 * Ejecuta una query SQL directa contra Postgres.
 *
 * Uso:
 *   const { rows } = await query<Persona>("select * from persona where id = $1", [id]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}
