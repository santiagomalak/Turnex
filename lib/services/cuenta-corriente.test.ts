import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { registrarPago } from './cuenta-corriente'
import * as personaRepo from '@/lib/repos/persona'
import * as mov from '@/lib/repos/movimiento'
import { query } from '@/lib/db'

// Test de integración: toca la base real (la misma que usa `npm run seed`).
// Se salta entero si no hay DATABASE_URL configurada (por ejemplo en un
// checkout limpio sin .env.local) en vez de fallar.
const tieneDb = !!process.env.DATABASE_URL

describe.skipIf(!tieneDb)('registrarPago - imputación automática', () => {
  // Persona nueva por test: la imputación automática mira TODOS los cargos
  // abiertos de la persona, así que compartir una entre tests haría que el
  // saldo que deja uno se mezcle con el siguiente.
  let personaId: string

  beforeEach(async () => {
    const p = await personaRepo.insertPersona({
      nombre: 'Test Vitest',
      apellido: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dni: null,
      email: null,
      telefono: null,
      rol: 'invitado',
      estado: 'activo',
      plan_membresia_id: null,
    })
    personaId = p.id
  })

  afterEach(async () => {
    if (!personaId) return
    await query('delete from imputacion where pago_id in (select id from movimiento where persona_id = $1)', [personaId])
    await query('delete from movimiento where persona_id = $1', [personaId])
    await personaRepo.deletePersona(personaId)
  })

  it('imputa a los cargos más viejos primero y calcula el sobrante', async () => {
    const viejo = await mov.insertCargo({
      personaId,
      direccion: 'ingreso',
      tipo: 'ajuste',
      monto: 10000,
      concepto: 'Cargo viejo (vence antes)',
      venceEl: '2020-01-01',
      registradoPor: null,
    })
    const nuevo = await mov.insertCargo({
      personaId,
      direccion: 'ingreso',
      tipo: 'ajuste',
      monto: 5000,
      concepto: 'Cargo nuevo (vence después)',
      venceEl: '2020-02-01',
      registradoPor: null,
    })

    const resultado = await registrarPago({
      personaId,
      direccion: 'ingreso',
      monto: 12000,
      medioPago: 'efectivo',
      concepto: 'Pago parcial de prueba',
      comprobanteUrl: null,
      registradoPor: null,
    })

    expect(resultado.imputado).toBe(12000)
    expect(resultado.aFavor).toBe(0)

    const cargoViejo = await mov.getMovimiento(viejo.id)
    const cargoNuevo = await mov.getMovimiento(nuevo.id)
    // El cargo más viejo (vence primero) se salda completo...
    expect(cargoViejo?.saldo).toBe(0)
    expect(cargoViejo?.estado).toBe('saldado')
    // ...y el resto ($2.000) se imputa al siguiente, que queda parcial.
    expect(cargoNuevo?.saldo).toBe(3000)
    expect(cargoNuevo?.estado).toBe('parcial')
  })

  it('cuando el pago supera la deuda, el resto queda como saldo a favor', async () => {
    const cargo = await mov.insertCargo({
      personaId,
      direccion: 'ingreso',
      tipo: 'ajuste',
      monto: 1000,
      concepto: 'Cargo chico',
      venceEl: '2020-03-01',
      registradoPor: null,
    })

    const resultado = await registrarPago({
      personaId,
      direccion: 'ingreso',
      monto: 5000,
      medioPago: 'efectivo',
      concepto: 'Pago que sobra',
      comprobanteUrl: null,
      registradoPor: null,
    })

    expect(resultado.imputado).toBe(1000)
    expect(resultado.aFavor).toBe(4000)

    const actualizado = await mov.getMovimiento(cargo.id)
    expect(actualizado?.saldo).toBe(0)
    expect(actualizado?.estado).toBe('saldado')
  })

  it('rechaza un pago con monto cero o negativo', async () => {
    await expect(
      registrarPago({
        personaId,
        direccion: 'ingreso',
        monto: 0,
        medioPago: 'efectivo',
        concepto: null,
        comprobanteUrl: null,
        registradoPor: null,
      })
    ).rejects.toThrow('mayor a 0')
  })
})
