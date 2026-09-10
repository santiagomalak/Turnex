import 'server-only'
import { query } from '@/lib/db'
import type { DireccionMov, MedioPago } from '@/lib/types'

// Acceso a datos para la caja diaria — agregados sobre `movimiento`.

export type PagoDelDia = {
  direccion: DireccionMov
  medio_pago: MedioPago | null
  total: number
  cantidad: number
}

/** Pagos (cobros y egresos) registrados en una fecha, agrupados por medio. */
export async function pagosDelDiaPorMedio(fecha: string): Promise<PagoDelDia[]> {
  const { rows } = await query<PagoDelDia>(
    `select direccion, medio_pago,
            sum(monto)::float8 as total, count(*)::int as cantidad
       from movimiento
      where clase = 'pago' and not anulado and fecha::date = $1::date
      group by direccion, medio_pago`,
    [fecha]
  )
  return rows
}

/** Ventas de la fecha que quedaron a crédito (todavía con saldo). */
export async function ventasFiadasDelDia(fecha: string): Promise<{ total: number; cantidad: number }> {
  const { rows } = await query<{ total: number; cantidad: number }>(
    `select coalesce(sum(saldo), 0)::float8 as total, count(*)::int as cantidad
       from movimiento
      where clase = 'cargo' and tipo = 'venta' and direccion = 'ingreso'
        and not anulado and saldo > 0 and fecha::date = $1::date`,
    [fecha]
  )
  return rows[0]
}

export type VentaDelDia = {
  id: string
  fecha: string
  concepto: string | null
  monto: number
  saldo: number
  nombre: string
  apellido: string
}

/** Detalle de las ventas de kiosco de la fecha. */
export async function ventasDelDia(fecha: string): Promise<VentaDelDia[]> {
  const { rows } = await query<VentaDelDia>(
    `select m.id, m.fecha, m.concepto, m.monto, m.saldo, p.nombre, p.apellido
       from movimiento m
       join persona p on p.id = m.persona_id
      where m.clase = 'cargo' and m.tipo = 'venta' and not m.anulado
        and m.fecha::date = $1::date
      order by m.fecha desc`,
    [fecha]
  )
  return rows
}
