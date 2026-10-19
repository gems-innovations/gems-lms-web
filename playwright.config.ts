import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // iPhone con el motor de Safari: el 40 % de las visitas reales llega desde iOS. Corre en Linux (CI); en Windows le falta libxml2.
    // También corre la primera sesión de Taps (retencion-primera-sesion.spec.ts).
    { name: 'iphone-webkit', testMatch: /(mobile-public|retencion-primera-sesion)\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
  // Con E2E_BASE_URL (p. ej. producción) no se levanta el servidor local.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npx ng serve main --host localhost --port 4200',
    url: 'http://localhost:4200/auth/signin',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
