import { test, expect } from './fixtures'

test.describe('Personas', () => {
  test.beforeEach(async ({ authPage: page }) => {
    await page.goto('/personas')
  })

  test('debe mostrar tabla de personas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Personas' })).toBeVisible()
    await expect(page.locator('button:has-text("Nueva Persona")')).toBeVisible()
  })

  test('debe abrir modal crear persona', async ({ page }) => {
    await page.click('button:has-text("Nueva Persona")')
    await expect(page.getByRole('heading', { name: 'Nueva persona' })).toBeVisible()
    await expect(page.locator('input[name="nombre"]')).toBeVisible()
    await expect(page.locator('input[name="apellido"]')).toBeVisible()
    await expect(page.locator('input[name="dni"]')).toBeVisible()
  })

  test('debe bloquear el envío con campos requeridos vacíos', async ({ page }) => {
    // nombre/apellido son <input required>: el navegador bloquea el submit
    // antes de llegar a la validación de Zod - por eso no hay mensaje de
    // servidor que verificar, sino que el modal debe seguir abierto.
    await page.click('button:has-text("Nueva Persona")')
    await page.click('button[type="submit"]:has-text("Crear persona")')
    await expect(page.getByRole('heading', { name: 'Nueva persona' })).toBeVisible()
  })

  test('debe crear y editar una persona', async ({ page }) => {
    const timestamp = Date.now()
    const nombre = `Test${timestamp}`

    await page.click('button:has-text("Nueva Persona")')
    await page.fill('input[name="nombre"]', nombre)
    await page.fill('input[name="apellido"]', 'Usuario')
    await page.fill('input[name="dni"]', `${timestamp}`.slice(-8))
    await page.fill('input[name="email"]', `test${timestamp}@test.com`)
    await page.selectOption('select[name="rol"]', 'socio')
    await page.selectOption('select[name="estado"]', 'activo')
    await page.click('button[type="submit"]:has-text("Crear persona")')

    const fila = page.getByRole('link', { name: new RegExp(`${nombre} Usuario`) })
    await expect(fila).toBeVisible()

    await fila.click()
    await expect(page.getByRole('heading', { name: `${nombre} Usuario` })).toBeVisible()
  })
})
