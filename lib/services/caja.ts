import 'server-only'
import { z } from 'zod'
import { tx } from '@/lib/db'
import * as mov from '@/lib/repos/movimiento'
import * as cajaRepo from '@/lib/repos/caja'
import { getConfig } from '@/lib/config'
import type { DireccionMov, MedioPago } from '@/lib/types'

// ============================================================================
// Venta rápida de kiosco
// ============================================================================

const numero = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'))
  return NaN
}

// Medios que cobran en el momento. `fiado` no está: es "sin medio" => cuenta corriente.
export const MEDIOS_CAJA = ['efectivo', 'transferencia', 'mercadopago', 'modo'] as const

const itemSchema = z.object({
  concepto: z.string().trim().min(1, 'Poné un concepto').max(120),
  precio: z.preprocess(numero, z.number().positive('El precio debe ser mayor a 0').max(9_999_999)),
  cantidad: z.preprocess(numero, z.number().int().min(1, 'Mínimo 1').max(999)),
})

export const ventaSchema = z
  .object({
    persona_id: z.string().uuid('Elegí una persona válida').nullable(),
    medio_pago: z.enum(MEDIOS_CAJA).nullable(),
    items: z.array(itemSchema).min(1, 'Agregá al menos un ítem'),
  })
  .superRefine((d, ctx) => {
    if (!d.medio_pago && !d.persona_id) {
      ctx.addIssue({
        path: ['medio_pago'],
        code: 'custom',
        message: 'Una venta al mostrador se cobra en el momento (no se puede fiar).',
      })
    }
  })

export type VentaParsed = z.output<typeof ventaSchema>

export function parseVenta(input: unknown) {
  return ventaSchema.safeParse(input)
}

/** Persona ficticia para ventas al mostrador (sin socio). */
export async function consumidorFinalId(): Promise<string> {
  return getConfig<string>('caja.consumidor_final_id')
}

export type ResultadoVenta = { movimientoId: string; total: number; fiado: boolean }

export async function registrarVenta(
  data: VentaParsed,
  registradoPor: string | null
): Promise<ResultadoVenta> {
  const total = data.items.reduce((s, it) => s + Math.round(it.precio) * it.cantidad, 0)
  if (total <= 0) throw new Error('El total de la venta debe ser mayor a 0')

  const personaId = data.persona_id ?? (await consumidorFinalId())
  const fiado = !data.medio_pago
  const concepto = data.items
    .map((it) => (it.cantidad > 1 ? `${it.cantidad}× ${it.concepto}` : it.concepto))
    .join(', ')

  return tx(async (db) => {
    const cargo = await mov.insertCargo(
      {
        personaId,
        direccion: 'ingreso',
        tipo: 'venta',
        monto: total,
        concepto,
        venceEl: null,
        registradoPor,
      },
      db
    )

    if (!fiado) {
      const pago = await mov.insertPago(
        {
          personaId,
          direccion: 'ingreso',
          monto: total,
          medioPago: data.medio_pago as MedioPago,
          concepto,
          comprobanteUrl: null,
          registradoPor,
        },
        db
      )
      await mov.aplicarImputacion(pago.id, cargo.id, total, db)
    }

    return { movimientoId: cargo.id, total, fiado }
  })
}

// ============================================================================
// Cierre de caja del día
// ============================================================================

export type LineaMedio = { medioPago: MedioPago; total: number; cantidad: number }

export type CierreCaja = {
  fecha: string
  ingresos: LineaMedio[]
  egresos: LineaMedio[]
  fiadoDelDia: { total: number; cantidad: number }
  totalIngresos: number
  totalEgresos: number
  neto: number
  efectivoNeto: number
}

export async function cierreDeCaja(fecha: string): Promise<CierreCaja> {
  const [pagos, fiadas] = await Promise.all([
    cajaRepo.pagosDelDiaPorMedio(fecha),
    cajaRepo.ventasFiadasDelDia(fecha),
  ])

  const porDireccion = (dir: DireccionMov): LineaMedio[] =>
    pagos
      .filter((p) => p.direccion === dir)
      .map((p) => ({
        medioPago: (p.medio_pago ?? 'efectivo') as MedioPago,
        total: p.total,
        cantidad: p.cantidad,
      }))
      .sort((a, b) => b.total - a.total)

  const ingresos = porDireccion('ingreso')
  const egresos = porDireccion('egreso')
  const totalIngresos = ingresos.reduce((s, l) => s + l.total, 0)
  const totalEgresos = egresos.reduce((s, l) => s + l.total, 0)
  const efectivo = (ls: LineaMedio[]) =>
    ls.filter((l) => l.medioPago === 'efectivo').reduce((s, l) => s + l.total, 0)

  return {
    fecha,
    ingresos,
    egresos,
    fiadoDelDia: fiadas,
    totalIngresos,
    totalEgresos,
    neto: totalIngresos - totalEgresos,
    efectivoNeto: efectivo(ingresos) - efectivo(egresos),
  }
}

export const ventasDelDia = cajaRepo.ventasDelDia
