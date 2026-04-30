import { defineConfig } from '@playwright/test'

// Envios: stubEmailPhpEndpoints (helpers.js) responde com JSON mock (sem chamar o PHP real).
// Camada extra no servidor: send-email.php / send-report.php forçam To→comercial se Origin/Referer for localhost.

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  // Um único servidor Vite (webServer) por corrida: muitos workers competem por CPU/IO e aumentam flakiness (regra do projecto: ~2).
  workers: 2,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  reporter: [
    ['list'],
    ['blob', { outputDir: 'blob-report' }],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/results.json' }],
  ],
})
