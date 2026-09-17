import { test, expect } from '@playwright/test'

test.describe('Reservas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reservas')
  })

  test('debe mostrar calendario de reservas', async ({ page }) => {
    await expect(page.locator('text=Reservas')).toBeVisible()
    await expect(page.locator('button:has-text("Nueva Reserva")')).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
  })

  test('debe filtrar por fecha', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[type="date"]', today)
    await page.waitForTimeout(500)
    // La tabla debería actualizarse
  })

  test('debe crear nueva reserva', async ({ page }) => {
    await page.click('button:has-text("Nueva Reserva")')
    await expect(page.locator('text=Nueva Reserva')).toBeVisible()
    
    // Seleccionar cancha
    await page.selectOption('select[name="espacioId"]', { index: 1 })
    // Seleccionar persona
    await page.selectOption('select[name="personaId"]', { index: 1 })
    // Fecha hoy
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[name="fecha"]', today)
    // Hora
    await page.selectOption('select[name="horaInicio"]', '10:00')
    await page.selectOption('select[name="horaFin"]', '11:00')
    // Precio se llena automáticamente
    await page.selectOption('select[name="estado"]', 'confirmada')
    
    await page.click('button[type="submit"]:has-text("Crear reserva")')
    
    // Verificar que aparece en la tabla
    await expect(page.locator('text=10:00 - 11:00')).toBeVisible()
  })

  test('debe detectar conflicto de horario', async ({ page }) => {
    // Intentar crear reserva en mismo horario/cancha
    await page.click('button:has-text("Nueva Reserva")')
    await page.selectOption('select[name="espacioId"]', { index: 1 })
    await page.selectOption('select[name="personaId"]', { index: 2 })
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[name="fecha"]', today)
    await page.selectOption('select[name="horaInicio"]', '10:00')
    await page.selectOption('select[name="horaFin"]', '11:00')
    await page.click('button[type="submit"]:has-text("Crear reserva")')
    
    // Debe mostrar alerta de conflicto
    await expect(page.locator('text=Conflicto de horario')).toBeVisible()
  })
})