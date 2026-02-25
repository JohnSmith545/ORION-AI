import { test, expect } from '../fixtures/auth.fixture'

/**
 * Dashboard Page E2E Tests
 *
 * Most dashboard tests require Firebase Emulators for login.
 * Tests auto-skip if the Auth emulator is not reachable.
 */

// Helper to check if Firebase Auth emulator is running
async function isEmulatorRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:9099', { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status === 400 // Emulator returns 400 on bare GET
  } catch {
    return false
  }
}

test.describe('Dashboard Page', () => {
  test.beforeEach(async () => {
    const available = await isEmulatorRunning()
    expect(available).toBe(true)
  })

  test('should redirect unauthenticated user to auth page', async ({ page }) => {
    // This test does NOT need emulators — override the skip
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*auth.*/, { timeout: 10000 })
  })

  test('should display dashboard after login', async ({ page, testUser, loginAs }) => {
    await loginAs(page, testUser.email, testUser.password)
    // Dismiss welcome modal if present
    const beginBtn = page.getByRole('button', { name: /begin exploration/i })
    if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await beginBtn.click()
    }
    await expect(page.locator('header').first()).toBeVisible({ timeout: 10000 })
  })

  test('should display chat section after login', async ({ page, testUser, loginAs }) => {
    await loginAs(page, testUser.email, testUser.password)
    const beginBtn = page.getByRole('button', { name: /begin exploration/i })
    if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await beginBtn.click()
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should allow typing in chat input', async ({ page, testUser, loginAs }) => {
    await loginAs(page, testUser.email, testUser.password)
    const beginBtn = page.getByRole('button', { name: /begin exploration/i })
    if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await beginBtn.click()
    }
    const chatInput = page.getByPlaceholder(/astronomical query/i)
    await chatInput.waitFor({ state: 'visible', timeout: 10000 })
    await chatInput.fill('Hello ORION')
    await expect(chatInput).toHaveValue('Hello ORION')
  })

  test('should display sidebar navigation', async ({ page, testUser, loginAs }) => {
    // Force a wide viewport so the sidebar (hidden lg:flex) is visible
    await page.setViewportSize({ width: 1280, height: 720 })
    await loginAs(page, testUser.email, testUser.password)
    const beginBtn = page.getByRole('button', { name: /begin exploration/i })
    if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await beginBtn.click()
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
    // Assert that the sidebar aside and chat section are both rendered inside main
    await expect(page.locator('main > aside').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main > section').first()).toBeVisible({ timeout: 10000 })
  })
})
