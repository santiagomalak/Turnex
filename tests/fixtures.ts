import { test as base, type Page } from '@playwright/test'

type TestFixtures = {
  authPage: Page
}

export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})

export { expect } from '@playwright/test'