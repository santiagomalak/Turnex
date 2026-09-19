import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatMoney, formatDateOnly, hoyArgentina } from './format'

describe('formatMoney', () => {
  it('formatea como pesos argentinos sin decimales', () => {
    expect(formatMoney(15000)).toBe('$ 15.000')
  })

  it('trata null/undefined como 0', () => {
    // @ts-expect-error - defensivo: puede llegar null desde una fila de DB
    expect(formatMoney(null)).toBe('$ 0')
  })
})

describe('formatDateOnly', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY sin pasar por Date (sin corrimiento de zona)', () => {
    expect(formatDateOnly('2026-09-18')).toBe('18/09/2026')
  })

  it('acepta un timestamp completo y usa solo la parte de fecha', () => {
    expect(formatDateOnly('2026-01-05T03:00:00.000Z')).toBe('05/01/2026')
  })
})

describe('hoyArgentina', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve la fecha de Argentina, no la de UTC, entre las 21:00 y las 23:59 hora local', () => {
    // 2026-09-18 22:30 hora Argentina (UTC-3) = 2026-09-19 01:30 UTC.
    // Un cálculo naive en UTC (new Date().toISOString().slice(0,10)) diría
    // que ya es 19/09 - este es justo el bug que hoyArgentina() evita.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T01:30:00.000Z'))

    expect(hoyArgentina()).toBe('2026-09-18')
  })

  it('coincide con UTC en horarios donde no hay corrimiento de día', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-18T15:00:00.000Z')) // 12:00 AR

    expect(hoyArgentina()).toBe('2026-09-18')
  })
})
