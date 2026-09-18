import { test, expect } from './fixtures'
import type { Page, Dialog } from '@playwright/test'
import { hoyArgentina, formatDateOnly } from '../lib/format'

// Slots horarios disponibles en el form de reservas (07:00 a 22:00). Elegimos
// el par según la hora actual para que corridas distintas de la suite usen
// horarios distintos; igual cancelamos al final de cada test (ver
// `cancelarReserva`) para no acumular reservas de prueba en la demo.
const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
function slot(offset: number): { inicio: string; fin: string } {
  const idx = (new Date().getSeconds() + offset) % (HORAS.length - 1)
  return { inicio: HORAS[idx], fin: HORAS[idx + 1] }
}

async function cancelarReserva(page: Page, horaInicio: string) {
  const fila = page
    .locator('tr', { hasText: `${formatDateOnly(hoyArgentina())} ${horaInicio}` })
    .filter({ has: page.getByRole('button', { name: 'Cancelar' }) })
  if ((await fila.count()) === 0) return
  page.once('dialog', (d: Dialog) => d.accept())
  await fila.getByRole('button', { name: 'Cancelar' }).click()
}

test.describe('Reservas', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/reservas')
  })

  test('debe mostrar calendario de reservas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Reservas', exact: true })).toBeVisible()
    await expect(page.locator('button:has-text("Nueva reserva")')).toBeVisible()
  })

  test('debe crear nueva reserva', async ({ page }) => {
    const { inicio, fin } = slot(0)

    // Por si una corrida anterior quedó a mitad de camino (p.ej. interrumpida)
    // y dejó ocupado este mismo slot - de otro modo esta reserva fallaría por
    // conflicto en vez de por el motivo que el test realmente quiere probar.
    await cancelarReserva(page, inicio)

    await page.click('button:has-text("Nueva reserva")')
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).toBeVisible()

    await page.selectOption('select[name="espacio_id"]', { index: 1 })
    await page.selectOption('select[name="persona_id"]', { index: 1 })
    await page.fill('input[name="fecha"]', hoyArgentina())
    await page.selectOption('select[name="hora_inicio"]', inicio)
    await page.selectOption('select[name="hora_fin"]', fin)

    await page.click('button[type="submit"]:has-text("Confirmar reserva")')

    // El modal se cierra y aparece el toast de éxito.
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).toBeHidden()
    await expect(page.locator('text=Reserva confirmada')).toBeVisible()

    await cancelarReserva(page, inicio)
  })

  test('debe detectar conflicto de horario', async ({ page }) => {
    const { inicio, fin } = slot(5) // offset distinto al de "crear nueva reserva"
    const modalHeading = page.getByRole('heading', { name: 'Nueva reserva' })
    // Alerta de error DENTRO del modal - un locator sin scope también matchea
    // los toasts de éxito (sonner), que usan un role similar y hacían que la
    // espera se resolviera de inmediato aunque el submit hubiera funcionado.
    const modalBox = modalHeading.locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
    const errorEnModal = modalBox.locator('[role="alert"]')

    /** Intenta reservar y espera a que se resuelva: modal cerrado (éxito) o
     * alerta de error inline (conflicto u otro error) - lo que pase primero. */
    async function intentarReservar(personaIndex: number) {
      await page.click('button:has-text("Nueva reserva")')
      await expect(modalHeading).toBeVisible()
      await page.selectOption('select[name="espacio_id"]', { index: 1 })
      await page.selectOption('select[name="persona_id"]', { index: personaIndex })
      await page.fill('input[name="fecha"]', hoyArgentina())
      await page.selectOption('select[name="hora_inicio"]', inicio)
      await page.selectOption('select[name="hora_fin"]', fin)
      await page.click('button[type="submit"]:has-text("Confirmar reserva")')
      await Promise.race([
        modalHeading.waitFor({ state: 'hidden' }),
        errorEnModal.first().waitFor({ state: 'visible' }),
      ])
    }

    await intentarReservar(1)
    // Si el modal ya se cerró, la primera reserva se creó sin problema:
    // repetimos en el mismo horario/cancha con otra persona para forzar el
    // conflicto. Si ya sigue abierto con error, no hace falta un segundo intento.
    if (!(await modalHeading.isVisible())) {
      await intentarReservar(2)
    }

    // Mensaje que arma fromDbError() para el exclusion constraint anti-doble-reserva (23P01).
    await expect(page.locator('text=Ese horario ya está reservado')).toBeVisible()

    // Cerrar el modal de error y limpiar la única reserva que sí se creó.
    await modalBox.getByRole('button', { name: 'Cancelar' }).click()
    await cancelarReserva(page, inicio)
  })
})
