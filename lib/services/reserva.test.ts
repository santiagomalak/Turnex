import { describe, it, expect } from 'vitest'
import { calcularPrecio, parseReserva } from './reserva'
import type { Persona, PlanMembresia } from '@/lib/types'

const invitado: Pick<Persona, 'rol'> = { rol: 'invitado' }
const socio: Pick<Persona, 'rol'> = { rol: 'socio' }

function plan(overrides: Partial<PlanMembresia>): PlanMembresia {
  return {
    id: 'p1',
    nombre: 'Test',
    precio_mensual: 0,
    incluye_canchas: false,
    descuento_porcentaje: 0,
    activo: true,
    ...overrides,
  }
}

describe('calcularPrecio', () => {
  it('cobra el precio completo a un no-socio', () => {
    expect(calcularPrecio(12000, 1, invitado, null)).toBe(12000)
  })

  it('multiplica por la cantidad de horas', () => {
    expect(calcularPrecio(12000, 2, invitado, null)).toBe(24000)
  })

  it('cobra el precio completo a un socio sin plan', () => {
    expect(calcularPrecio(12000, 1, socio, null)).toBe(12000)
  })

  it('no cobra nada si el plan del socio incluye canchas', () => {
    expect(calcularPrecio(12000, 1, socio, plan({ incluye_canchas: true }))).toBe(0)
  })

  it('aplica el descuento del plan a un socio', () => {
    expect(calcularPrecio(12000, 1, socio, plan({ descuento_porcentaje: 15 }))).toBe(10200)
  })

  it('cobra el precio de lista al socio si el plan no tiene descuento ni incluye canchas', () => {
    expect(calcularPrecio(12000, 1, socio, plan({}))).toBe(12000)
  })

  it('ignora el plan si la persona no es socia (invitado con "plan" no debería descontar)', () => {
    expect(calcularPrecio(12000, 1, invitado, plan({ descuento_porcentaje: 50 }))).toBe(12000)
  })

  it('redondea a pesos enteros', () => {
    // 1.5 horas a $9.000/h con 15% off = 9000*1.5*0.85 = 11475 (ya entero),
    // probamos un caso que sí da fracción: 10% off sobre 12000*1.5=18000 -> 16200 (entero también);
    // forzamos redondeo con un precio impar.
    expect(calcularPrecio(9333, 1.5, socio, plan({ descuento_porcentaje: 10 }))).toBe(
      Math.round(9333 * 1.5 * 0.9)
    )
  })
})

describe('reservaSchema (parseReserva)', () => {
  const base = {
    espacio_id: '00000000-0000-0000-0000-000000000001',
    persona_id: '00000000-0000-0000-0000-000000000002',
    fecha: '2026-09-18',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    cobrar_ahora: 'on',
    medio_pago: 'efectivo',
    notas: '',
  }

  it('acepta un input válido', () => {
    const res = parseReserva(base)
    expect(res.success).toBe(true)
  })

  it('rechaza cuando la hora de fin no es posterior al inicio', () => {
    const res = parseReserva({ ...base, hora_inicio: '11:00', hora_fin: '10:00' })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join('.') === 'hora_fin')).toBe(true)
    }
  })

  it('rechaza un espacio_id que no es UUID', () => {
    const res = parseReserva({ ...base, espacio_id: 'no-es-uuid' })
    expect(res.success).toBe(false)
  })

  it('convierte notas vacías a null', () => {
    const res = parseReserva({ ...base, notas: '   ' })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.notas).toBeNull()
  })

  it('interpreta cobrar_ahora "on" (checkbox de formulario) como true', () => {
    const res = parseReserva(base)
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.cobrar_ahora).toBe(true)
  })
})
