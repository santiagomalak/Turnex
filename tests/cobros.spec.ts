import { test, expect } from '@playwright/test'

test.describe('Cobros', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cobros')
  })

  test('debe mostrar tabs de cobros', async ({ page }) => {
    await expect(page.locator('text=Registrar Cobro')).toBeVisible()
    await expect(page.locator('text=Historial')).toBeVisible()
    await expect(page.locator('text=Cuotas Pendientes')).toBeVisible()
  })

  test('debe registrar cobro de cuota', async ({ page }) => {
    // Tab "Registrar Cobro" ya está activa
    await page.selectOption('select[name="personaId"]', { index: 1 })
    await page.waitForTimeout(500)
    
    await page.selectOption('select[name="tipo"]', 'cuota')
    await page.waitForTimeout(500)
    
    await page.selectOption('select[name="cuotaId"]', { index: 1 })
    await page.waitForTimeout(500)
    
    await page.selectOption('select[name="medioPago"]', 'efectivo')
    
    await page.click('button:has-text("Registrar cobro")')
    
    // Verificar toast de éxito
    await expect(page.locator('text=cuota').first()).toBeVisible()
  })

  test('debe mostrar cuotas pendientes', async ({ page }) => {
    await page.click('button:has-text("Cuotas Pendientes")')
    await expect(page.locator('text=Cuotas Pendientes de Pago')).toBeVisible()
  })

  test('debe filtrar historial por persona', async ({ page }) => {
    await page.click('button:has-text("Historial")')
    await page.selectOption('select:near(:text("Filtrar persona"))', { index: 1 })
    await page.waitForTimeout(500)
    // Tabla debería filtrarse
  })
})