import { test as base } from '@playwright/test'

type TestFixtures = {
  authPage: void
}

export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    await use()
  },
})

export { expect } from '@playwright/test'