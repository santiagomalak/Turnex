'use server'

import { staffPuede } from '@/lib/auth'
import { listPersonas } from '@/lib/repos/persona'
import { listEspacios } from '@/lib/repos/espacio'
import { listReservas } from '@/lib/repos/reserva'
import { listCuotasPendientesConPersona } from '@/lib/repos/cuota'
import { hoyArgentina } from '@/lib/format'

export type BusquedaGlobal = {
  personas: Array<{ id: string; nombre: string; apellido: string; rol: string; estado: string; dni: string | null }>
  espacios: Array<{ id: string; nombre: string; tipo: string; precioPorHora: number; estado: string }>
  reservasHoy: Array<{
    id: string
    horaInicio: string
    horaFin: string
    estado: string
    personaNombre: string
    personaApellido: string
    espacioNombre: string
  }>
  cuotasPendientes: Array<{ id: string; periodo: string | null; monto: number; estado: string; nombre: string; apellido: string }>
}

/** Datos para el buscador global (⌘K). Cualquier staff logueado puede usarlo. */
export async function buscarGlobalAction(): Promise<BusquedaGlobal | null> {
  const staff = await staffPuede()
  if (!staff) return null

  const hoy = hoyArgentina()
  const [personas, espacios, reservasHoy, cuotasPendientes] = await Promise.all([
    listPersonas(),
    listEspacios(),
    listReservas({ desde: hoy, hasta: hoy }),
    listCuotasPendientesConPersona(),
  ])

  return {
    personas: personas.slice(0, 20).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      rol: p.rol,
      estado: p.estado,
      dni: p.dni,
    })),
    espacios: espacios.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      precioPorHora: e.precio_por_hora,
      estado: e.estado,
    })),
    reservasHoy: reservasHoy.slice(0, 15).map((r) => ({
      id: r.id,
      horaInicio: r.hora_inicio,
      horaFin: r.hora_fin,
      estado: r.estado,
      personaNombre: r.persona_nombre,
      personaApellido: r.persona_apellido,
      espacioNombre: r.espacio_nombre,
    })),
    cuotasPendientes: cuotasPendientes.slice(0, 15).map((c) => ({
      id: c.id,
      periodo: c.periodo,
      monto: c.monto,
      estado: c.estado,
      nombre: c.nombre,
      apellido: c.apellido,
    })),
  }
}
