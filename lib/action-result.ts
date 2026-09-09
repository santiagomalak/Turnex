import type { ZodError } from 'zod'

// Resultado estándar de un Server Action. La UI decide qué mostrar según `ok`.
export type ActionFail = {
  ok: false
  error: string
  fieldErrors?: Record<string, string>
}

export type ActionOk<T> = { ok: true; data: T }

export type ActionResult<T = undefined> = ActionOk<T> | ActionFail

export function ok(): ActionResult<undefined>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionFail {
  return { ok: false, error, fieldErrors }
}

/** Convierte un ZodError en `fieldErrors` (un mensaje por campo). */
export function fromZodError(err: ZodError): ActionFail {
  const fieldErrors: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { ok: false, error: 'Revisá los datos del formulario', fieldErrors }
}

/** Mapea errores conocidos de Postgres a mensajes en castellano. */
export function fromDbError(err: unknown): ActionFail {
  const e = err as { code?: string; constraint?: string; detail?: string }
  switch (e.code) {
    case '23505': // unique_violation
      return fail('Ya existe un registro con esos datos', dupField(e.constraint))
    case '23503': // foreign_key_violation
      return fail('El registro está relacionado con otros datos y no se puede completar la operación')
    case '23514': // check_violation
      return fail('Alguno de los valores no es válido')
    case '23P01': // exclusion_violation (reserva superpuesta)
      return fail('Ese horario ya está reservado para esa cancha')
    default:
      console.error('DB error no mapeado:', err)
      return fail('Ocurrió un error al guardar. Intentá de nuevo.')
  }
}

function dupField(constraint?: string): Record<string, string> | undefined {
  if (!constraint) return undefined
  if (constraint.includes('dni')) return { dni: 'Ya hay una persona con este DNI' }
  if (constraint.includes('email')) return { email: 'Ya hay un registro con este email' }
  return undefined
}
