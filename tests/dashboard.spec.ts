import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('debe mostrar KPIs principales', async ({ page }) => {
    await expect(page.locator('text=Total Socios')).toBeVisible()
    await expect(page.locator('text=Morosos')).toBeVisible()
    await expect(page.locator('text=Cuotas Pendientes')).toBeVisible()
    await expect(page.locator('text=Reservas Hoy')).toBeVisible()
    await expect(page.locator('text=Ingresos del Mes')).toBeVisible()
  })

  test('debe mostrar alertas', async ({ page }) => {
    await expect(page.locator('text=Alertas Recientes')).toBeVisible()
  })

  test('debe mostrar ocupación de canchas', async ({ page }) => {
    await expect(page.locator('text=Ocupación de Canchas')).toBeVisible()
  })
})