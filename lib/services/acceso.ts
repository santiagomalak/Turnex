import 'server-only'
import * as repo from '@/lib/repos/acceso'
import { buscarPersonaParaAcceso } from '@/lib/repos/persona'
import { resumenDeudaPersona } from '@/lib/services/cuenta-corriente'
import type { Persona } from '@/lib/types-supabase'

export const personasDentro = repo.accesosAbiertos
export const historialAccesos = repo.historialAccesos
export const contarAccesosHoy = repo.contarAccesosHoy

export type ResultadoBusqueda =
  | { encontrada: false }
  | {
      encontrada: true
      persona: Persona
      dentro: boolean
      accesoAbiertoId: string | null
      deuda: { total: number; vencida: number }
    }

export async function buscarParaAcceso(valor: string): Promise<ResultadoBusqueda> {
  const persona = await buscarPersonaParaAcceso(valor)
  if (!persona) return { encontrada: false }
  const [abierto, deuda] = await Promise.all([
    repo.accesoAbiertoDe(persona.id),
    resumenDeudaPersona(persona.id),
  ])
  return {
    encontrada: true,
    persona,
    dentro: !!abierto,
    accesoAbiertoId: abierto?.id ?? null,
    deuda,
  }
}

export async function registrarEntrada(
  personaId: string,
  registradoPor: string | null
): Promise<void> {
  const abierto = await repo.accesoAbiertoDe(personaId)
  if (abierto) throw new Error('La persona ya tiene un ingreso abierto (registrá la salida primero)')
  await repo.registrarEntrada(personaId, registradoPor)
}

export async function registrarSalida(personaId: string): Promise<void> {
  const abierto = await repo.accesoAbiertoDe(personaId)
  if (!abierto) throw new Error('La persona no tiene un ingreso abierto')
  await repo.registrarSalida(abierto.id)
}
