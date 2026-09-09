import { z } from 'zod'
import * as repo from '@/lib/repos/espacio'

const TIPOS = ['futbol', 'padel', 'tenis', 'voley', 'beach_voley', 'otro'] as const
const ESTADOS = ['activa', 'mantenimiento'] as const

const numero = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'))
  return NaN
}
const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

export const espacioSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(60),
  tipo: z.enum(TIPOS),
  estado: z.enum(ESTADOS),
  precio_por_hora: z.preprocess(numero, z.number().positive('El precio debe ser mayor a 0')),
  sector: z.preprocess(emptyToNull, z.string().max(60).nullable()),
})

export type EspacioParsed = z.output<typeof espacioSchema>

export function parseEspacio(input: unknown) {
  return espacioSchema.safeParse(input)
}

export const listarEspacios = repo.listEspacios
export const obtenerEspacio = repo.getEspacio

export async function crearEspacio(data: EspacioParsed) {
  return repo.insertEspacio(data)
}

export async function editarEspacio(id: string, data: EspacioParsed) {
  const actual = await repo.getEspacio(id)
  if (!actual) throw new Error('La cancha no existe')
  return repo.updateEspacio(id, data)
}

export async function eliminarEspacio(id: string) {
  const futuras = await repo.countReservasFuturas(id)
  if (futuras > 0) {
    return { bloqueado: true as const, reservas: futuras }
  }
  await repo.deleteEspacio(id)
  return { bloqueado: false as const }
}
