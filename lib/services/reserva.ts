import 'server-only'
import { z } from 'zod'
import { tx } from '@/lib/db'
import * as reservaRepo from '@/lib/repos/reserva'
import * as mov from '@/lib/repos/movimiento'
import { getPersona } from '@/lib/repos/persona'
import { getEspacio } from '@/lib/repos/espacio'
import { getPlan } from '@/lib/repos/plan'
import type { Persona, PlanMembresia } from '@/lib/types'

export const listarReservas = reservaRepo.listReservas

const hora = /^([01]\d|2[0-3]):[0-5]\d$/

export const reservaSchema = z
  .object({
    espacio_id: z.string().uuid('Elegí una cancha'),
    persona_id: z.string().uuid('Elegí una persona'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    hora_inicio: z.string().regex(hora, 'Hora inválida'),
    hora_fin: z.string().regex(hora, 'Hora inválida'),
    cobrar_ahora: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()),
    medio_pago: z
      .enum(['efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico'])
      .optional(),
    notas: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
      z.string().max(200).nullable()
    ),
  })
  .superRefine((d, ctx) => {
    if (d.hora_inicio >= d.hora_fin) {
      ctx.addIssue({ path: ['hora_fin'], code: 'custom', message: 'La hora de fin debe ser posterior al inicio' })
    }
  })

export type ReservaParsed = z.output<typeof reservaSchema>

export function parseReserva(input: unknown) {
  return reservaSchema.safeParse(input)
}

function horasEntre(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60
}

export function calcularPrecio(
  precioPorHora: number,
  horas: number,
  persona: Pick<Persona, 'rol'>,
  plan: PlanMembresia | null
): number {
  const base = precioPorHora * horas
  if (persona.rol !== 'socio' || !plan) return Math.round(base)
  if (plan.incluye_canchas) return 0
  if (plan.descuento_porcentaje > 0) return Math.round(base * (1 - plan.descuento_porcentaje / 100))
  return Math.round(base)
}

export type ResultadoReserva = {
  reservaId: string
  precio: number
  cobrado: boolean
  aCuentaCorriente: boolean
}

export async function crearReserva(
  data: ReservaParsed,
  registradoPor: string | null
): Promise<ResultadoReserva> {
  const persona = await getPersona(data.persona_id)
  if (!persona) throw new Error('La persona no existe')
  const espacio = await getEspacio(data.espacio_id)
  if (!espacio) throw new Error('La cancha no existe')
  if (espacio.estado !== 'activa') throw new Error('La cancha está en mantenimiento')
  if (data.fecha < new Date().toISOString().slice(0, 10)) {
    throw new Error('No se puede reservar una fecha pasada')
  }

  const plan = persona.plan_membresia_id ? await getPlan(persona.plan_membresia_id) : null
  const horas = horasEntre(data.hora_inicio, data.hora_fin)
  const precio = calcularPrecio(espacio.precio_por_hora, horas, persona, plan)
  const esSocio = persona.rol === 'socio'
  const concepto = `Alquiler ${espacio.nombre} ${data.fecha} ${data.hora_inicio}-${data.hora_fin}`

  // Socio: reserva confirmada, el alquiler va a su cuenta corriente.
  // No socio: recepción cobra el 100% ahora (salvo que marque "pendiente").
  const cobrarAhora = !esSocio && data.cobrar_ahora
  if (cobrarAhora && !data.medio_pago) throw new Error('Elegí el medio de pago')

  return tx(async (db) => {
    const reserva = await reservaRepo.insertReserva(
      {
        espacioId: data.espacio_id,
        personaId: data.persona_id,
        fecha: data.fecha,
        horaInicio: data.hora_inicio,
        horaFin: data.hora_fin,
        estado: esSocio || cobrarAhora ? 'confirmada' : 'pendiente_pago',
        precio,
        senaPagada: cobrarAhora,
        origen: 'recepcion',
        creadaPor: registradoPor,
        notas: data.notas,
      },
      db
    )

    if (precio > 0) {
      const cargo = await mov.insertCargo(
        {
          personaId: data.persona_id,
          direccion: 'ingreso',
          tipo: 'alquiler',
          monto: precio,
          concepto,
          venceEl: data.fecha,
          reservaId: reserva.id,
          registradoPor,
        },
        db
      )
      await reservaRepo.setReservaMovimiento(reserva.id, cargo.id, db)

      if (cobrarAhora) {
        const pago = await mov.insertPago(
          {
            personaId: data.persona_id,
            direccion: 'ingreso',
            monto: precio,
            medioPago: data.medio_pago!,
            concepto,
            comprobanteUrl: null,
            registradoPor,
          },
          db
        )
        await mov.aplicarImputacion(pago.id, cargo.id, precio, db)
      }
    }

    return {
      reservaId: reserva.id,
      precio,
      cobrado: cobrarAhora,
      aCuentaCorriente: precio > 0 && !cobrarAhora,
    }
  })
}

export async function cancelarReserva(id: string): Promise<void> {
  await tx(async (db) => {
    const reserva = await reservaRepo.getReserva(id, db)
    if (!reserva) throw new Error('La reserva no existe')
    if (['cancelada', 'cumplida', 'ausente'].includes(reserva.estado)) {
      throw new Error('Esta reserva ya no se puede cancelar')
    }
    await reservaRepo.setReservaEstado(id, 'cancelada', db)

    if (reserva.movimiento_id) {
      // Devolver lo pagado como saldo a favor y anular el cargo del alquiler.
      const { rows: imps } = await db.query<{ pago_id: string; monto: number }>(
        `select pago_id, monto from imputacion where cargo_id = $1`,
        [reserva.movimiento_id]
      )
      for (const imp of imps) {
        await db.query(`update movimiento set saldo = saldo + $2 where id = $1`, [
          imp.pago_id,
          imp.monto,
        ])
      }
      await db.query(`delete from imputacion where cargo_id = $1`, [reserva.movimiento_id])
      await mov.marcarAnulado(reserva.movimiento_id, db)
    }
  })
}

export async function marcarEstadoReserva(
  id: string,
  estado: 'cumplida' | 'ausente' | 'confirmada'
): Promise<void> {
  await reservaRepo.setReservaEstado(id, estado)
}

export async function cobrarSenaEnRecepcion(): Promise<void> {
  // Placeholder: el cobro de una reserva pendiente se hace desde la ficha del socio.
  throw new Error('Cobrá la reserva pendiente desde la ficha de la persona')
}
