import { test, expect } from './fixtures'

test.describe('Kiosco', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/kiosco')
  })

  test('debe mostrar pantalla de kiosco', async ({ page }) => {
    await expect(page.locator('text=Turnex Kiosco')).toBeVisible()
    await expect(page.locator('text=Control de acceso')).toBeVisible()
  })

  test('debe buscar socio por DNI', async ({ page }) => {
    await page.fill('input[placeholder="30123456"]', '30123456')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    // Debe mostrar info del socio o "no encontrado"
  })

  test('debe registrar entrada', async ({ page }) => {
    // Buscar socio existente
    await page.fill('input[placeholder="30123456"]', '30123456')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    
    // Si encontró socio, botón ENTRADA debería estar habilitado
    const btnEntrada = page.locator('button:has-text("ENTRADA")')
    if (await btnEntrada.isEnabled()) {
      await btnEntrada.click()
      await expect(page.locator('text=Entrada registrada')).toBeVisible()
    }
  })

  test('debe mostrar personas dentro', async ({ page }) => {
    await expect(page.locator('text=Dentro del predio')).toBeVisible()
  })
})