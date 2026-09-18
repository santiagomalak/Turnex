import { test, expect } from './fixtures'

test.describe('Carnets', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/carnets')
  })

  test('debe mostrar página de carnets', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Carnets QR' })).toBeVisible()
    await expect(page.locator('text=Generar e imprimir carnets')).toBeVisible()
  })

  test('debe filtrar socios', async ({ page }) => {
    await page.fill('input[placeholder="Buscar por nombre, DNI o email..."]', 'zzz-no-deberia-existir')
    await expect(page.locator('text=No se encontraron socios')).toBeVisible()
  })

  test('debe seleccionar/deseleccionar todos', async ({ page }) => {
    await page.click('button:has-text("Seleccionar todos")')
    await expect(page.locator('button:has-text("Deseleccionar todos")')).toBeVisible()
    await page.click('button:has-text("Deseleccionar todos")')
    await expect(page.locator('button:has-text("Seleccionar todos")')).toBeVisible()
  })

  test('debe habilitar "Generar seleccionados" al tildar un socio', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first()
    test.skip((await checkbox.count()) === 0, 'No hay socios en la demo')

    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect(page.locator('button:has-text("Generar seleccionados (1)")')).toBeEnabled()
  })
})
