import { test, expect } from '@playwright/test'

test.describe('Personas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/personas')
  })

  test('debe mostrar tabla de personas', async ({ page }) => {
    await expect(page.locator('text=Personas')).toBeVisible()
    await expect(page.locator('button:has-text("Nueva Persona")')).toBeVisible()
  })

  test('debe abrir modal crear persona', async ({ page }) => {
    await page.click('button:has-text("Nueva Persona")')
    await expect(page.locator('text=Nueva Persona')).toBeVisible()
    await expect(page.locator('input[name="nombre"]')).toBeVisible()
    await expect(page.locator('input[name="apellido"]')).toBeVisible()
    await expect(page.locator('input[name="dni"]')).toBeVisible()
  })

  test('debe validar campos requeridos', async ({ page }) => {
    await page.click('button:has-text("Nueva Persona")')
    await page.click('button[type="submit"]:has-text("Crear persona")')
    await expect(page.locator('text=Nombre requerido')).toBeVisible()
    await expect(page.locator('text=Apellido requerido')).toBeVisible()
    await expect(page.locator('text=DNI requerido')).toBeVisible()
  })

  test('debe crear persona válida', async ({ page }) => {
    const timestamp = Date.now()
    await page.click('button:has-text("Nueva Persona")')
    await page.fill('input[name="nombre"]', `Test${timestamp}`)
    await page.fill('input[name="apellido"]', 'Usuario')
    await page.fill('input[name="dni"]', `${timestamp}`.slice(-8))
    await page.fill('input[name="email"]', `test${timestamp}@test.com`)
    await page.selectOption('select[name="rol"]', 'socio')
    await page.selectOption('select[name="estado"]', 'activo')
    await page.click('button[type="submit"]:has-text("Crear persona")')
    
    // Verificar que se cerró el modal y aparece en la tabla
    await expect(page.locator(`text=Test${timestamp}`)).toBeVisible()
  })

  test('debe editar persona', async ({ page }) => {
    // Buscar la persona creada en test anterior
    const timestamp = Date.now()
    await page.fill('input[placeholder="Buscar por nombre, DNI o email..."]', `Test${timestamp}`)
    await page.waitForTimeout(500)
    
    await page.click('button:has-text("Editar")')
    await expect(page.locator('text=Editar Persona')).toBeVisible()
    await page.fill('input[name="nombre"]', `Editado${timestamp}`)
    await page.click('button[type="submit"]:has-text("Guardar cambios")')
    
    await expect(page.locator(`text=Editado${timestamp}`)).toBeVisible()
  })
})