/**
 * Reinicia los datos transaccionales de cuenta corriente y arma un set coherente
 * para la demo: cuotas de 2 meses, algunos pagos, un fiado y un plan de pago.
 *
 *   npm run seed:cuentas
 */
import { query } from '@/lib/db'
import { generarCuotasDelMes } from '@/lib/services/cuota'
import { registrarPago, registrarCargoManual } from '@/lib/services/cuenta-corriente'
import { crearPlanPago } from '@/lib/services/plan-pago'

function periodo(offsetMeses: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMeses)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

async function main() {
  console.log('Borrando movimientos, cuotas y planes de pago…')
  await query('delete from imputacion')
  await query('delete from movimiento')
  await query('update cuota set movimiento_id = null')
  await query('delete from cuota')
  await query('delete from plan_pago')

  const staffId = (await query<{ id: string }>("select id from usuario_staff where rol='admin' limit 1")).rows[0]?.id ?? null

  console.log('Generando cuotas del mes pasado y de este mes…')
  const g1 = await generarCuotasDelMes(periodo(-1), staffId)
  const g2 = await generarCuotasDelMes(periodo(0), staffId)
  console.log(`  ${g1.generadas} + ${g2.generadas} cuotas`)

  const socios = (
    await query<{ id: string; nombre: string; apellido: string }>(
      "select id, nombre, apellido from persona where rol='socio' order by apellido"
    )
  ).rows

  // Socio 0: pagó todo. Socio 1: pagó una cuota, debe la otra. Resto: debe todo.
  if (socios[0]) {
    const cargos = (
      await query<{ id: string }>(
        "select id from movimiento where persona_id=$1 and clase='cargo' and saldo>0",
        [socios[0].id]
      )
    ).rows
    const total = cargos.length
      ? (
          await query<{ s: number }>(
            "select coalesce(sum(saldo),0) as s from movimiento where persona_id=$1 and clase='cargo'",
            [socios[0].id]
          )
        ).rows[0].s
      : 0
    if (total > 0) {
      await registrarPago({
        personaId: socios[0].id,
        direccion: 'ingreso',
        monto: total,
        medioPago: 'transferencia',
        concepto: 'Pago cuotas al día',
        comprobanteUrl: null,
        registradoPor: staffId,
      })
      console.log(`  ${socios[0].nombre} ${socios[0].apellido}: pagó todo (${total})`)
    }
  }

  if (socios[1]) {
    const cuotaVieja = (
      await query<{ id: string; monto: number }>(
        `select m.id, m.monto from movimiento m
         where m.persona_id=$1 and m.clase='cargo' order by m.vence_el limit 1`,
        [socios[1].id]
      )
    ).rows[0]
    if (cuotaVieja) {
      await registrarPago({
        personaId: socios[1].id,
        direccion: 'ingreso',
        monto: cuotaVieja.monto,
        medioPago: 'efectivo',
        concepto: 'Pago 1 cuota',
        comprobanteUrl: null,
        registradoPor: staffId,
        imputaciones: [{ cargoId: cuotaVieja.id, monto: cuotaVieja.monto }],
      })
      console.log(`  ${socios[1].nombre} ${socios[1].apellido}: pagó 1 cuota, debe el resto`)
    }
  }

  // Un fiado de kiosco a un invitado o socio
  if (socios[2]) {
    await registrarCargoManual({
      personaId: socios[2].id,
      direccion: 'ingreso',
      tipo: 'venta',
      monto: 3500,
      concepto: '2 gatorade + 1 alfajor (fiado)',
      venceEl: null,
      registradoPor: staffId,
    })
    console.log(`  ${socios[2].nombre} ${socios[2].apellido}: fiado de kiosco`)
  }

  // Un plan de pago para el socio moroso
  const moroso = (
    await query<{ id: string; nombre: string; apellido: string }>(
      "select id, nombre, apellido from persona where rol='socio' and estado='moroso' limit 1"
    )
  ).rows[0]
  if (moroso) {
    await crearPlanPago(
      moroso.id,
      { descripcion: 'Deuda 2025 regularizada', total: 90000, cant_cuotas: 3, primer_vencimiento: periodo(0).slice(0, 8) + '15' },
      staffId
    )
    console.log(`  ${moroso.nombre} ${moroso.apellido}: plan de pago 3 cuotas`)
  }

  console.log('\nListo.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
