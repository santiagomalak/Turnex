import { test, expect } from '@playwright/test'

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('debe mostrar página de login', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Turnex')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('debe fallar con credenciales inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Email o contraseña incorrectos')).toBeVisible()
  })

  test('debe redirigir a dashboard tras login exitoso', async ({ page }) => {
    // Skip if no test credentials provided
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD
    
    if (!email || !password) {
      test.skip(true, 'TEST_EMAIL/TEST_PASSWORD no configurados - saltando test de login real')
    }

    await page.fill('input[type="email"]', email!)
    await page.fill('input[type="password"]', password!)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})