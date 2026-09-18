'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  registrarPago,
  registrarCargoManual,
  anularPago,
  anularCargo,
} from '@/lib/services/cuenta-corriente'
import { parsePlanPago, crearPlanPago } from '@/lib/services/plan-pago'
import { obtenerPersona } from '@/lib/services/persona'
import { ok, fail, fromZodError, fromDbError, type ActionResult } from '@/lib/action-result'
import { staffPuede } from '@/lib/auth'

const SIN_PERMISO = fail('No tenés permiso para esta acción')
const COBRA = ['admin', 'recepcion', 'cobranzas'] as const

const numero = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN

const pagoSchema = z.object({
  monto: z.preprocess(numero, z.number().positive('El monto debe ser mayor a 0')),
  medio_pago: z.enum(['efectivo', 'transferencia', 'mercadopago', 'modo', 'debito_automatico']),
  comprobante_url: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
    z.string().url('URL inválida').nullable()
  ),
  concepto: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
    z.string().max(120).nullable()
  ),
})

function revalidarFicha(personaId: string) {
  revalidatePath(`/personas/${personaId}`)
  revalidatePath('/personas')
  revalidatePath('/cobros')
}

export async function registrarPagoAction(
  personaId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ aFavor: number }>> {
  const staff = await staffPuede(COBRA)
  if (!staff) return SIN_PERMISO
  if (!(await obtenerPersona(personaId))) return fail('La persona no existe')

  const parsed = pagoSchema.safeParse({
    monto: formData.get('monto'),
    medio_pago: formData.get('medio_pago'),
    comprobante_url: formData.get('comprobante_url'),
    concepto: formData.get('concepto'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  // Imputaciones manuales opcionales: campos imp_<cargoId> = monto
  const imputaciones = [...formData.entries()]
    .filter(([k]) => k.startsWith('imp_'))
    .map(([k, v]) => ({ cargoId: k.slice(4), monto: Number(String(v).replace(',', '.')) }))
    .filter((i) => i.monto > 0)

  try {
    const res = await registrarPago({
      personaId,
      direccion: 'ingreso',
      monto: parsed.data.monto,
      medioPago: parsed.data.medio_pago,
      concepto: parsed.data.concepto,
      comprobanteUrl: parsed.data.comprobante_url,
      registradoPor: staff.staffId,
      imputaciones: imputaciones.length ? imputaciones : undefined,
    })
    revalidarFicha(personaId)
    return ok({ aFavor: res.aFavor })
  } catch (err) {
    return fromDbError(err)
  }
}

const cargoSchema = z.object({
  tipo: z.enum(['venta', 'ajuste', 'pago_staff']),
  direccion: z.enum(['ingreso', 'egreso']),
  monto: z.preprocess(numero, z.number().positive('El monto debe ser mayor a 0')),
  concepto: z.string().trim().min(1, 'Describí el concepto').max(120),
  vence_el: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable()
  ),
})

export async function registrarCargoAction(
  personaId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const staff = await staffPuede(COBRA)
  if (!staff) return SIN_PERMISO
  const parsed = cargoSchema.safeParse({
    tipo: formData.get('tipo'),
    direccion: formData.get('direccion'),
    monto: formData.get('monto'),
    concepto: formData.get('concepto'),
    vence_el: formData.get('vence_el'),
  })
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    await registrarCargoManual({
      personaId,
      direccion: parsed.data.direccion,
      tipo: parsed.data.tipo,
      monto: parsed.data.monto,
      concepto: parsed.data.concepto,
      venceEl: parsed.data.vence_el,
      registradoPor: staff.staffId,
    })
    revalidarFicha(personaId)
    return ok()
  } catch (err) {
    return fromDbError(err)
  }
}

export async function crearPlanPagoAction(
  personaId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const staff = await staffPuede(COBRA)
  if (!staff) return SIN_PERMISO
  const parsed = parsePlanPago({
    descripcion: formData.get('descripcion'),
    total: formData.get('total'),
    cant_cuotas: formData.get('cant_cuotas'),
    primer_vencimiento: formData.get('primer_vencimiento'),
  })
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    await crearPlanPago(personaId, parsed.data, staff.staffId)
    revalidarFicha(personaId)
    return ok()
  } catch (err) {
    return fromDbError(err)
  }
}

export async function anularMovimientoAction(
  personaId: string,
  movimientoId: string,
  clase: 'cargo' | 'pago'
): Promise<ActionResult> {
  if (!(await staffPuede(['admin', 'cobranzas']))) return SIN_PERMISO
  try {
    if (clase === 'pago') await anularPago(movimientoId)
    else await anularCargo(movimientoId)
    revalidarFicha(personaId)
    return ok()
  } catch (err) {
    if (err instanceof Error && !(err as { code?: string }).code) return fail(err.message)
    return fromDbError(err)
  }
}
