import { test, expect } from './fixtures'

test.describe('Cobros', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/cobros')
  })

  test('debe mostrar las pestañas de cobros', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Cuotas \(\d+\)$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Deudores \(\d+\)$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Historial' })).toBeVisible()
  })

  test('debe mostrar deudores', async ({ page }) => {
    await page.click('button:has-text("Deudores")')
    await expect(page.getByRole('heading', { name: 'Cuenta corriente' })).toBeVisible()
  })

  test('debe mostrar el historial de movimientos', async ({ page }) => {
    await page.click('button:has-text("Historial")')
    await expect(page.getByRole('heading', { name: 'Últimos movimientos' })).toBeVisible()
  })

  test('debe registrar un pago desde la ficha de la persona', async ({ page }) => {
    // "Cobrar" en una cuota pendiente navega a /personas/[id]
    const filaCuota = page.locator('table tbody tr', { hasText: 'pendiente' }).first()
    test.skip((await filaCuota.count()) === 0, 'No hay cuotas pendientes en la demo para cobrar')

    await filaCuota.getByRole('button', { name: 'Cobrar' }).click()
    await expect(page).toHaveURL(/\/personas\//)

    await page.click('button:has-text("Registrar pago")')
    await page.fill('input[name="monto"]', '1000')
    await page.selectOption('select[name="medio_pago"]', 'efectivo')
    await page.click('button[type="submit"]:has-text("Registrar pago")')

    // El modal se cierra y el saldo/movimientos se actualizan al confirmar.
    await expect(page.getByRole('heading', { name: 'Registrar pago' })).toBeHidden()
  })
})
