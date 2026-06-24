import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'dashboard',
      testMatch: /dashboard\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL_DASHBOARD ?? 'http://localhost:3000',
      },
    },
    {
      name: 'employee-web',
      testMatch: /employee-web\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL_EMPLOYEE ?? 'http://localhost:3001',
      },
    },
  ],
})
