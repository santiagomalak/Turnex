import { describe, it, expect, vi, afterEach } from 'vitest'
import { periodoActual, sumarDias } from './cuota'

describe('periodoActual', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve el primer día del mes en curso (hora Argentina)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-18T15:00:00.000Z')) // 12:00 AR, sin corrimiento

    expect(periodoActual()).toBe('2026-09-01')
  })

  it('no se adelanta de mes en el último día, entre las 21:00 y 23:59 hora Argentina', () => {
    // 2026-09-30 22:00 hora Argentina = 2026-10-01 01:00 UTC. Un cálculo en
    // UTC diría que el período ya es octubre, generando la cuota del mes
    // equivocado justo en el peor momento (fin de mes).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T01:00:00.000Z'))

    expect(periodoActual()).toBe('2026-09-01')
  })
})

describe('sumarDias', () => {
  it('suma días dentro del mismo mes', () => {
    expect(sumarDias('2026-09-01', 10)).toBe('2026-09-11')
  })

  it('cruza el fin de mes correctamente', () => {
    expect(sumarDias('2026-09-25', 10)).toBe('2026-10-05')
  })

  it('cruza el fin de año correctamente', () => {
    expect(sumarDias('2026-12-28', 10)).toBe('2027-01-07')
  })

  it('con 0 días devuelve la misma fecha', () => {
    expect(sumarDias('2026-09-18', 0)).toBe('2026-09-18')
  })
})
