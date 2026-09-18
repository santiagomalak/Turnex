import { test, expect } from './fixtures'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/dashboard')
  })

  test('debe mostrar KPIs principales', async ({ page }) => {
    await expect(page.getByText('Socios activos', { exact: true })).toBeVisible()
    await expect(page.getByText('Con deuda vencida', { exact: true })).toBeVisible()
    await expect(page.getByText('Cuotas pendientes', { exact: true })).toBeVisible()
    await expect(page.getByText('Reservas hoy', { exact: true })).toBeVisible()
    await expect(page.getByText('Ingresos del mes', { exact: true })).toBeVisible()
  })

  test('debe mostrar alertas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Alertas' })).toBeVisible()
  })

  test('debe mostrar ocupación de canchas', async ({ page }) => {
    await expect(page.locator('text=Ocupación de canchas')).toBeVisible()
  })
})
