import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/results.json' }],
  ],
})
