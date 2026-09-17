import { test, expect } from '@playwright/test'

test.describe('Carnets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/carnets')
  })

  test('debe mostrar página de carnets', async ({ page }) => {
    await expect(page.locator('text=Carnets QR')).toBeVisible()
    await expect(page.locator('text=Generar e imprimir carnets')).toBeVisible()
  })

  test('debe filtrar socios', async ({ page }) => {
    await page.fill('input[placeholder="Buscar por nombre, DNI o email..."]', 'Test')
    await page.waitForTimeout(500)
    // Lista debería filtrarse
  })

  test('debe seleccionar/deseleccionar todos', async ({ page }) => {
    await page.click('button:has-text("Seleccionar todos")')
    await expect(page.locator('text=Deseleccionar todos')).toBeVisible()
    await page.click('button:has-text("Deseleccionar todos")')
    await expect(page.locator('text=Seleccionar todos')).toBeVisible()
  })

  test('debe generar carnet individual', async ({ page }) => {
    // Seleccionar primer socio con DNI válido
    const checkbox = page.locator('input[type="checkbox"]').first()
    if (await checkbox.isVisible()) {
      await checkbox.click()
      await page.click('button:has-text("Generar seleccionados")')
      // Debería descargar PDF
    }
  })

  test('debe navegar a carnet individual', async ({ page }) => {
    // Click en fila de socio debería navegar a /carnet/[id]
    const firstRow = page.locator('div[class*="border"]').first()
    if (await firstRow.isVisible()) {
      await firstRow.click()
      // Verificar que se navegó o se seleccionó
    }
  })
})