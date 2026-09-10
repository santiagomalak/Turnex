import 'server-only'
import { z } from 'zod'
import * as personaRepo from '@/lib/repos/persona'
import { getPlan } from '@/lib/repos/plan'
import { estadoDeCuenta } from '@/lib/services/cuenta-corriente'
import { listCuotas } from '@/lib/repos/cuota'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Persona, PlanMembresia } from '@/lib/types'

const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

export const registroSocioSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(80),
  apellido: z.string().trim().min(1, 'Apellido requerido').max(80),
  dni: z.string().trim().regex(/^\d{7,8}$/, 'DNI inválido (7 u 8 dígitos)'),
  email: z.string().trim().email('Email inválido').max(120),
  telefono: z.preprocess(emptyToNull, z.string().max(30).nullable()),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres').max(72),
})

export type RegistroSocioParsed = z.output<typeof registroSocioSchema>

export function parseRegistroSocio(input: unknown) {
  return registroSocioSchema.safeParse(input)
}

/**
 * Auto-registro de un socio desde el portal. Crea el usuario de Auth y la
 * persona (rol socio, estado pendiente_aprobacion). Si ya existe una persona
 * con ese DNI y sin cuenta, la vincula en vez de crear una nueva.
 */
export async function registrarSolicitudSocio(
  data: RegistroSocioParsed
): Promise<{ yaExistiaPersona: boolean }> {
  const existente = await personaRepo.getPersonaByDni(data.dni)
  if (existente?.auth_user_id) {
    throw new Error('Ya hay una cuenta con ese DNI. Si es tuya, iniciá sesión.')
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      throw new Error('Ya hay una cuenta con ese email.')
    }
    throw new Error('No se pudo crear la cuenta. Probá de nuevo.')
  }
  const authUserId = created.user.id

  try {
    if (existente) {
      await personaRepo.vincularAuthUser(existente.id, authUserId)
      return { yaExistiaPersona: true }
    }
    await personaRepo.insertSocioAutoRegistrado({
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      telefono: data.telefono,
      authUserId,
    })
    return { yaExistiaPersona: false }
  } catch (err) {
    // Si falla el alta de la persona, borro el usuario de Auth para no dejar huérfanos.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
    throw err
  }
}

// ---------------------------------------------------------------------------

export type DatosPortal = {
  persona: Persona
  plan: PlanMembresia | null
  cuenta: Awaited<ReturnType<typeof estadoDeCuenta>>
  cuotas: Awaited<ReturnType<typeof listCuotas>>
}

export async function datosPortal(personaId: string): Promise<DatosPortal> {
  const persona = await personaRepo.getPersona(personaId)
  if (!persona) throw new Error('No se encontró tu ficha')
  const [plan, cuenta, cuotas] = await Promise.all([
    persona.plan_membresia_id ? getPlan(persona.plan_membresia_id) : Promise.resolve(null),
    estadoDeCuenta(personaId),
    listCuotas({ personaId }),
  ])
  return { persona, plan, cuenta, cuotas }
}

export const getPersonaPortal = personaRepo.getPersona
