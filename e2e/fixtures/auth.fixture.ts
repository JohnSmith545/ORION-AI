import { test as base, type Page } from '@playwright/test'
import { createEmulatorUser, clearAllEmulators } from '../helpers/emulator'

/** Test user credentials */
export const TEST_USER = {
  email: 'e2e-test@orion.ai',
  password: 'TestPassword123!',
  displayName: 'E2E Test User',
}

/**
 * Extended test fixtures for authenticated flows.
 */
export const test = base.extend<{
  /** A pre-created test user that exists in the emulator */
  testUser: typeof TEST_USER
  /** Helper to log in via the UI */
  loginAs: (page: Page, email: string, password: string) => Promise<void>
}>({
  testUser: async ({}, use) => {
    // Generate a unique user per-test to isolate Firebase Auth Emulator state
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString()
    const perTestUser = {
      email: `test-${uniqueId}@orion.ai`,
      password: 'TestPassword123!',
      displayName: `E2E User ${uniqueId.split('-')[0]}`,
    }

    try {
      await createEmulatorUser(perTestUser.email, perTestUser.password, perTestUser.displayName)
    } catch (e) {
      console.error('Failed to create isolated test user in emulator', e)
    }

    await use(perTestUser)
  },

  loginAs: async ({}, use) => {
    const login = async (page: Page, email: string, password: string) => {
      // Capture browser console logs for debugging
      page.on('console', msg => console.log(`BROWSER: ${msg.text()}`))
      // Capture network requests
      page.on('request', request => console.log(`REQUEST: ${request.method()} ${request.url()}`))
      page.on('response', response =>
        console.log(`RESPONSE: ${response.status()} ${response.url()}`)
      )

      await page.goto('/auth')
      // Playwright uses isolated browser contexts per test by default, so IndexedDB
      // is automatically cleared. Manually deleting it while Firebase Auth is connected
      // causes the Firebase Auth SDK to hang indefinitely.

      // Disable CSS animations that interfere with Playwright's click targeting
      await page.addStyleTag({
        content:
          '*, *::before, *::after { animation: none !important; transition: none !important; }',
      })
      await page.locator('#identity').fill(email)
      await page.locator('#password').fill(password)
      await page.getByRole('button', { name: /initialize session/i }).click()
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 })
    }
    await use(login)
  },
})

export { expect } from '@playwright/test'

/**
 * Reset emulator state — call in afterAll or between test suites.
 */
export async function resetEmulators() {
  await clearAllEmulators()
}
