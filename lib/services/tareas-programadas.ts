import 'server-only'
import { query } from '@/lib/db'
import {
  periodoActual,
  generarCuotasDelMes,
  renovarCuotasDeAbonos,
  marcarCuotasVencidas,
} from '@/lib/services/cuota'
import * as reservaRepo from '@/lib/repos/reserva'
import { hoyArgentina } from '@/lib/format'

const SEMANAS_OBJETIVO = 8
const hoy = hoyArgentina

/** Para cada abono activo, asegura que haya ~8 turnos futuros generados. */
async function extenderReservasDeAbonos(): Promise<{ creadas: number }> {
  const { rows: abonos } = await query<{
    id: string
    persona_id: string
    espacio_id: string
    hora_inicio: string
    hora_fin: string
    vigente_hasta: string | null
  }>(
    `select id, persona_id, espacio_id, hora_inicio, hora_fin, vigente_hasta
     from abono where estado = 'activo'`
  )

  let creadas = 0
  for (const a of abonos) {
    const { rows: info } = await query<{ futuras: number; ultima: string | null }>(
      `select count(*) filter (where fecha >= hoy_ar())::int as futuras,
              max(fecha)::text as ultima
       from reserva where abono_id = $1 and estado <> 'cancelada'`,
      [a.id]
    )
    let faltan = SEMANAS_OBJETIVO - info[0].futuras
    if (faltan <= 0) continue

    const base = info[0].ultima && info[0].ultima > hoy() ? info[0].ultima : hoy()
    const cursor = new Date(base + 'T00:00:00Z')

    while (faltan > 0) {
      cursor.setUTCDate(cursor.getUTCDate() + 7)
      const fecha = cursor.toISOString().slice(0, 10)
      if (fecha < hoy()) continue
      if (a.vigente_hasta && fecha > a.vigente_hasta) break
      try {
        await reservaRepo.insertReserva({
          espacioId: a.espacio_id,
          personaId: a.persona_id,
          fecha,
          horaInicio: a.hora_inicio,
          horaFin: a.hora_fin,
          estado: 'confirmada',
          precio: 0,
          senaPagada: true,
          origen: 'abono',
          abonoId: a.id,
          creadaPor: null,
        })
        creadas++
      } catch (err) {
        if ((err as { code?: string }).code !== '23P01') throw err
      }
      faltan--
    }
  }
  return { creadas }
}

export type ResultadoTareas = {
  periodo: string
  cuotasMembresia: number
  cuotasAbono: number
  cuotasVencidas: number
  reservasAbono: number
}

/**
 * Tareas que corren automáticamente (cron diario): generar las cuotas del mes,
 * renovar las cuotas de los abonos, marcar vencidas, y extender los turnos fijos.
 * Todas son idempotentes: correrlas de más no duplica nada.
 */
export async function correrTareasProgramadas(): Promise<ResultadoTareas> {
  const periodo = periodoActual()
  const membresia = await generarCuotasDelMes(periodo, null)
  const abono = await renovarCuotasDeAbonos(periodo, null)
  const vencidas = await marcarCuotasVencidas()
  const reservas = await extenderReservasDeAbonos()

  return {
    periodo,
    cuotasMembresia: membresia.generadas,
    cuotasAbono: abono.generadas,
    cuotasVencidas: vencidas,
    reservasAbono: reservas.creadas,
  }
}
