import { test as base, expect, type Page } from '@playwright/test'

// Credenciales del seed de demo (`npm run seed`, ver README). No son secretas:
// son la cuenta de demo pública del proyecto. Overrideables por env para CI.
const EMAIL = process.env.TEST_EMAIL || 'admin@turnex.com'
const PASSWORD = process.env.TEST_PASSWORD || 'turnex1234'

type TestFixtures = {
  authPage: Page
}

export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixture de Playwright, no un hook de React
    await use(page)
  },
})

export { expect }
