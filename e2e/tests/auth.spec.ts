import { test, expect } from '../fixtures/auth.fixture'

/**
 * Auth Page E2E Tests
 *
 * Tests are split into two groups:
 * 1. UI tests — work without Firebase emulators
 * 2. Emulator tests — require Firebase Auth + Firestore emulators running
 */

test.describe('Auth Page', () => {
  // ── UI Tests (no emulator needed) ────────────────────────────────

  test('should display the login form with email and password fields', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.locator('#identity')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /initialize session/i })).toBeVisible()
  })

  test('should display ORION AI branding', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ORION')
  })

  test('should switch to signup form when "Sign Up" is clicked', async ({ page }) => {
    await page.goto('/auth')
    // Disable CSS animations to prevent interference with Playwright clicks
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    })
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page.locator('#signup-identity')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
  })

  test('should switch back to login form from signup', async ({ page }) => {
    await page.goto('/auth')
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    })
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page.locator('#signup-identity')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /return to nexus/i }).click()
    await expect(page.locator('#identity')).toBeVisible({ timeout: 5000 })
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/auth')
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    })
    await page.locator('#identity').fill('nonexistent@test.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /initialize session/i }).click()
    // Should stay on auth page (login fails)
    await expect(page).toHaveURL(/.*auth.*/)
  })

  test('should have password field of type password', async ({ page }) => {
    await page.goto('/auth')
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  // ── Emulator Tests (require Firebase Emulators) ──────────────────

  test('should login with valid emulator credentials and redirect to dashboard', async ({
    page,
    testUser,
    loginAs,
  }) => {
    // Fail if emulators are not available
    let available = false
    try {
      const res = await fetch('http://localhost:9099', { signal: AbortSignal.timeout(2000) })
      available = res.ok
    } catch {
      available = false
    }
    expect(available).toBe(true)

    await loginAs(page, testUser.email, testUser.password)
    await expect(page).toHaveURL(/.*dashboard.*/)
  })
})
