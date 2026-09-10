import 'server-only'
import { z } from 'zod'
import { tx } from '@/lib/db'
import * as abonoRepo from '@/lib/repos/abono'
import * as reservaRepo from '@/lib/repos/reserva'
import * as mov from '@/lib/repos/movimiento'
import { getPersona } from '@/lib/repos/persona'
import { getEspacio } from '@/lib/repos/espacio'

export const listarAbonos = abonoRepo.listAbonos
export const setAbonoEstado = abonoRepo.setAbonoEstado

const hora = /^([01]\d|2[0-3]):[0-5]\d$/
const SEMANAS_A_GENERAR = 8

const numero = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN

export const abonoSchema = z
  .object({
    persona_id: z.string().uuid('Elegí una persona'),
    espacio_id: z.string().uuid('Elegí una cancha'),
    dia_semana: z.preprocess(numero, z.number().int().min(0).max(6)),
    hora_inicio: z.string().regex(hora, 'Hora inválida'),
    hora_fin: z.string().regex(hora, 'Hora inválida'),
    precio_mensual: z.preprocess(numero, z.number().nonnegative('Precio inválido')),
    vigente_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  })
  .superRefine((d, ctx) => {
    if (d.hora_inicio >= d.hora_fin) {
      ctx.addIssue({ path: ['hora_fin'], code: 'custom', message: 'La hora de fin debe ser posterior al inicio' })
    }
  })

export type AbonoParsed = z.output<typeof abonoSchema>

export function parseAbono(input: unknown) {
  return abonoSchema.safeParse(input)
}

/** Devuelve las próximas N fechas ('YYYY-MM-DD') que caen en `diaSemana`, desde `desde`. */
function proximasFechas(desde: string, diaSemana: number, cantidad: number): string[] {
  const d = new Date(desde + 'T00:00:00Z')
  while (d.getUTCDay() !== diaSemana) d.setUTCDate(d.getUTCDate() + 1)
  const fechas: string[] = []
  for (let i = 0; i < cantidad; i++) {
    fechas.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return fechas
}

export type ResultadoAbono = {
  abonoId: string
  reservasCreadas: number
  reservasConflicto: number
}

export async function crearAbono(
  data: AbonoParsed,
  registradoPor: string | null
): Promise<ResultadoAbono> {
  const persona = await getPersona(data.persona_id)
  if (!persona) throw new Error('La persona no existe')
  const espacio = await getEspacio(data.espacio_id)
  if (!espacio) throw new Error('La cancha no existe')

  const fechas = proximasFechas(data.vigente_desde, data.dia_semana, SEMANAS_A_GENERAR)
  const dia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][data.dia_semana]

  // Todo en una transacción. Cada reserva va con savepoint para poder saltear
  // los turnos que ya están ocupados sin abortar el alta completa del abono.
  return tx(async (db) => {
    const abono = await abonoRepo.insertAbono(
      {
        personaId: data.persona_id,
        espacioId: data.espacio_id,
        diaSemana: data.dia_semana,
        horaInicio: data.hora_inicio,
        horaFin: data.hora_fin,
        precioMensual: data.precio_mensual,
        vigenteDesde: data.vigente_desde,
        creadoPor: registradoPor,
      },
      db
    )

    let creadas = 0
    let conflicto = 0
    for (const fecha of fechas) {
      await db.query('savepoint reserva_abono')
      try {
        await reservaRepo.insertReserva(
          {
            espacioId: data.espacio_id,
            personaId: data.persona_id,
            fecha,
            horaInicio: data.hora_inicio,
            horaFin: data.hora_fin,
            estado: 'confirmada',
            precio: 0, // el abono se cobra mensual, no por turno
            senaPagada: true,
            origen: 'abono',
            abonoId: abono.id,
            creadaPor: registradoPor,
          },
          db
        )
        await db.query('release savepoint reserva_abono')
        creadas++
      } catch (err) {
        await db.query('rollback to savepoint reserva_abono')
        if ((err as { code?: string }).code === '23P01') conflicto++
        else throw err
      }
    }

    // Primer mes del abono como cargo en la cuenta corriente.
    if (data.precio_mensual > 0) {
      await mov.insertCargo(
        {
          personaId: data.persona_id,
          direccion: 'ingreso',
          tipo: 'alquiler',
          monto: data.precio_mensual,
          concepto: `Abono ${espacio.nombre} (${dia} ${data.hora_inicio})`,
          venceEl: data.vigente_desde,
          registradoPor,
        },
        db
      )
    }

    return { abonoId: abono.id, reservasCreadas: creadas, reservasConflicto: conflicto }
  })
}
