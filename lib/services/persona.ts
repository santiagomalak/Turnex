import { z } from 'zod'
import * as repo from '@/lib/repos/persona'
import type { Persona } from '@/lib/types-supabase'

// Reglas de negocio de personas: validación + orquestación sobre el repo.

const ROLES = ['socio', 'invitado', 'staff', 'profesor'] as const
const ESTADOS = ['activo', 'inactivo', 'moroso', 'pendiente_aprobacion'] as const

/** '' o espacios -> null; string con contenido -> trim. */
const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const dniField = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{7,8}$/, 'DNI inválido (7 u 8 dígitos)')
    .nullable()
)

const emailField = z.preprocess(
  emptyToNull,
  z.string().email('Email inválido').max(120).nullable()
)

const telefonoField = z.preprocess(emptyToNull, z.string().max(30).nullable())

const planField = z.preprocess(emptyToNull, z.string().uuid().nullable())

export const personaSchema = z
  .object({
    nombre: z.string().trim().min(1, 'Nombre requerido').max(80),
    apellido: z.string().trim().min(1, 'Apellido requerido').max(80),
    dni: dniField,
    email: emailField,
    telefono: telefonoField,
    rol: z.enum(ROLES),
    estado: z.enum(ESTADOS),
    plan_membresia_id: planField,
  })
  .superRefine((data, ctx) => {
    // Un socio o invitado tiene que identificarse con DNI (se usa en el check-in).
    if ((data.rol === 'socio' || data.rol === 'invitado') && !data.dni) {
      ctx.addIssue({ path: ['dni'], code: 'custom', message: 'DNI requerido para socios e invitados' })
    }
    // El plan de membresía solo aplica a socios.
    if (data.rol !== 'socio' && data.plan_membresia_id) {
      ctx.addIssue({
        path: ['plan_membresia_id'],
        code: 'custom',
        message: 'Solo los socios pueden tener plan de membresía',
      })
    }
  })

export type PersonaParsed = z.output<typeof personaSchema>

export function parsePersona(input: unknown) {
  return personaSchema.safeParse(input)
}

export async function crearPersona(data: PersonaParsed): Promise<Persona> {
  return repo.insertPersona(data)
}

export async function editarPersona(id: string, data: PersonaParsed): Promise<Persona> {
  const actual = await repo.getPersona(id)
  if (!actual) throw new Error('La persona no existe')
  const actualizada = await repo.updatePersona(id, data)
  if (!actualizada) throw new Error('No se pudo actualizar la persona')
  return actualizada
}

export async function eliminarPersona(id: string): Promise<void> {
  await repo.deletePersona(id)
}

export const listarPersonas = repo.listPersonas
export const obtenerPersona = repo.getPersona
