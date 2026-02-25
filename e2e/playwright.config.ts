import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const baseURL = isCI ? 'http://localhost:4173' : 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',
  outputDir: './test-results',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: isCI ? 'pnpm --filter web preview' : 'pnpm --filter web dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    cwd: '..',
    timeout: 30000,
    env: { VITE_USE_EMULATOR: 'true' },
  },
})
