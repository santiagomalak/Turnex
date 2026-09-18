import 'server-only'
import { tx, query } from '@/lib/db'
import * as mov from '@/lib/repos/movimiento'
import * as cuotaRepo from '@/lib/repos/cuota'
import { hoyArgentina } from '@/lib/format'
import type { Movimiento, DireccionMov, MedioPago, TipoMov } from '@/lib/types'

// ============================================================================
// Estado de cuenta de una persona
// ============================================================================

export type EstadoDeCuenta = {
  saldo: number // > 0 => la persona nos debe; < 0 => tiene saldo a favor
  deudaVencida: number
  proximoVencimiento: { fecha: string; monto: number } | null
  aPagarAlComplejo: number // lo que el complejo le debe (egresos pendientes)
  movimientos: Movimiento[]
  cargosAbiertos: Movimiento[]
}

const hoy = hoyArgentina

export async function estadoDeCuenta(personaId: string): Promise<EstadoDeCuenta> {
  const [movimientos, cargosIngreso, cargosEgreso] = await Promise.all([
    mov.listMovimientosPersona(personaId),
    mov.listCargosAbiertos(personaId, 'ingreso'),
    mov.listCargosAbiertos(personaId, 'egreso'),
  ])

  const pagosIngresoAFavor = movimientos
    .filter((m) => m.clase === 'pago' && m.direccion === 'ingreso')
    .reduce((s, m) => s + m.saldo, 0)

  const totalCargosIngreso = cargosIngreso.reduce((s, m) => s + m.saldo, 0)
  const saldo = totalCargosIngreso - pagosIngresoAFavor

  const d = hoy()
  const deudaVencida = cargosIngreso
    .filter((m) => m.vence_el && m.vence_el < d)
    .reduce((s, m) => s + m.saldo, 0)

  const futuros = cargosIngreso
    .filter((m) => m.vence_el && m.vence_el >= d)
    .sort((a, b) => (a.vence_el! < b.vence_el! ? -1 : 1))
  const proximoVencimiento = futuros[0]
    ? { fecha: futuros[0].vence_el!, monto: futuros[0].saldo }
    : null

  const aPagarAlComplejo = cargosEgreso.reduce((s, m) => s + m.saldo, 0)

  return {
    saldo,
    deudaVencida,
    proximoVencimiento,
    aPagarAlComplejo,
    movimientos,
    cargosAbiertos: cargosIngreso,
  }
}

// ============================================================================
// Registrar un cargo manual (ajuste, fiado de kiosco, deuda a profesor/staff)
// ============================================================================

export async function registrarCargoManual(data: {
  personaId: string
  direccion: DireccionMov
  tipo: TipoMov
  monto: number
  concepto: string
  venceEl: string | null
  registradoPor: string | null
}): Promise<Movimiento> {
  return mov.insertCargo({
    personaId: data.personaId,
    direccion: data.direccion,
    tipo: data.tipo,
    monto: data.monto,
    concepto: data.concepto,
    venceEl: data.venceEl,
    registradoPor: data.registradoPor,
  })
}

// ============================================================================
// Registrar un pago (parcial, total, o a cuenta) e imputarlo a los cargos
// ============================================================================

export type ImputacionInput = { cargoId: string; monto: number }

export type ResultadoPago = {
  pagoId: string
  imputado: number
  aFavor: number
}

export async function registrarPago(data: {
  personaId: string
  direccion: DireccionMov
  monto: number
  medioPago: MedioPago
  concepto: string | null
  comprobanteUrl: string | null
  registradoPor: string | null
  /** Si no se pasa, se imputa automáticamente a los cargos más viejos. */
  imputaciones?: ImputacionInput[]
}): Promise<ResultadoPago> {
  if (data.monto <= 0) throw new Error('El monto del pago debe ser mayor a 0')

  return tx(async (db) => {
    const pago = await mov.insertPago(
      {
        personaId: data.personaId,
        direccion: data.direccion,
        monto: data.monto,
        medioPago: data.medioPago,
        concepto: data.concepto,
        comprobanteUrl: data.comprobanteUrl,
        registradoPor: data.registradoPor,
      },
      db
    )

    // Determinar imputaciones
    let plan: ImputacionInput[]
    if (data.imputaciones?.length) {
      plan = data.imputaciones
    } else {
      const abiertos = await mov.listCargosAbiertos(data.personaId, data.direccion)
      plan = []
      let restante = data.monto
      for (const c of abiertos) {
        if (restante <= 0) break
        const aplica = Math.min(restante, c.saldo)
        plan.push({ cargoId: c.id, monto: aplica })
        restante -= aplica
      }
    }

    let imputado = 0
    for (const imp of plan) {
      if (imp.monto <= 0) continue
      const cargo = await mov.lockMovimiento(imp.cargoId, db)
      if (!cargo || cargo.clase !== 'cargo' || cargo.anulado) {
        throw new Error('El cargo a imputar no existe o fue anulado')
      }
      if (cargo.persona_id !== data.personaId || cargo.direccion !== data.direccion) {
        throw new Error('El cargo no corresponde a esta cuenta')
      }
      const aAplicar = Math.min(imp.monto, cargo.saldo, data.monto - imputado)
      if (aAplicar <= 0) continue

      await mov.aplicarImputacion(pago.id, cargo.id, aAplicar, db)
      imputado += aAplicar

      if (cargo.cuota_id) {
        const nuevoSaldo = cargo.saldo - aAplicar
        const estado = nuevoSaldo <= 0 ? 'pagada' : nuevoSaldo < cargo.monto ? 'parcial' : 'pendiente'
        await cuotaRepo.setCuotaEstado(cargo.cuota_id, estado, db)
      }
    }

    return { pagoId: pago.id, imputado, aFavor: data.monto - imputado }
  })
}

// ============================================================================
// Anular un movimiento
// ============================================================================

export async function anularPago(pagoId: string): Promise<void> {
  await tx(async (db) => {
    const pago = await mov.lockMovimiento(pagoId, db)
    if (!pago || pago.clase !== 'pago' || pago.anulado) throw new Error('Pago inválido')

    const { rows: imps } = await db.query<{ cargo_id: string; monto: number }>(
      `select cargo_id, monto from imputacion where pago_id = $1`,
      [pagoId]
    )
    for (const imp of imps) {
      await db.query(
        `update movimiento
           set saldo = saldo + $2,
               estado = case when saldo + $2 >= monto then 'pendiente'
                             when saldo + $2 > 0 then 'parcial' else 'saldado' end
         where id = $1`,
        [imp.cargo_id, imp.monto]
      )
      const cargo = await mov.getMovimiento(imp.cargo_id, db)
      if (cargo?.cuota_id) {
        const estado =
          cargo.saldo <= 0 ? 'pagada' : cargo.saldo < cargo.monto ? 'parcial' : 'pendiente'
        await cuotaRepo.setCuotaEstado(cargo.cuota_id, estado, db)
      }
    }
    await db.query(`delete from imputacion where pago_id = $1`, [pagoId])
    await mov.marcarAnulado(pagoId, db)
  })
}

export async function anularCargo(cargoId: string): Promise<void> {
  await tx(async (db) => {
    const cargo = await mov.lockMovimiento(cargoId, db)
    if (!cargo || cargo.clase !== 'cargo' || cargo.anulado) throw new Error('Cargo inválido')
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from imputacion where cargo_id = $1`,
      [cargoId]
    )
    if (rows[0].n > 0) {
      throw new Error('El cargo ya tiene pagos imputados. Anulá primero esos pagos.')
    }
    await mov.marcarAnulado(cargoId, db)
    if (cargo.cuota_id) {
      await db.query(`update cuota set movimiento_id = null, estado = 'pendiente' where id = $1`, [
        cargo.cuota_id,
      ])
    }
  })
}

/** Resumen rápido de deuda de una persona (para el check-in). */
export async function resumenDeudaPersona(
  personaId: string
): Promise<{ total: number; vencida: number }> {
  const { rows } = await query<{ total: number; vencida: number }>(
    `select coalesce(sum(saldo), 0) as total,
            coalesce(sum(saldo) filter (where vence_el is not null and vence_el < hoy_ar()), 0) as vencida
     from movimiento
     where persona_id = $1 and clase = 'cargo' and direccion = 'ingreso'
       and saldo > 0 and not anulado`,
    [personaId]
  )
  return rows[0] ?? { total: 0, vencida: 0 }
}

// Deudores: personas con saldo pendiente (para la vista de cuenta corriente).
export async function listarDeudores(): Promise<
  { persona_id: string; nombre: string; apellido: string; deuda: number; vencida: number }[]
> {
  const { rows } = await query<{
    persona_id: string
    nombre: string
    apellido: string
    deuda: number
    vencida: number
  }>(
    `select m.persona_id, p.nombre, p.apellido,
            sum(m.saldo) as deuda,
            sum(m.saldo) filter (where m.vence_el < hoy_ar()) as vencida
     from movimiento m
     join persona p on p.id = m.persona_id
     where m.clase = 'cargo' and m.direccion = 'ingreso' and m.saldo > 0 and not m.anulado
     group by m.persona_id, p.nombre, p.apellido
     order by deuda desc`
  )
  return rows.map((r) => ({ ...r, vencida: r.vencida ?? 0 }))
}
