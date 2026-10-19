import { defineConfig, devices } from '@playwright/test';

/**
 * Servidor de las pruebas:
 * - E2E_BASE_URL (p. ej. producción): no se levanta nada.
 * - E2E_ESTATICO=1: el build estático de producción (lo mismo que sirve nginx), con e2e/servidor-estatico.mjs.
 *   Antes: npm run build:all && npx ng build main --configuration production,static
 * - Por defecto: ng serve (desarrollo, con SSR).
 */
const ESTATICO = !!process.env.E2E_ESTATICO;
const PUERTO_ESTATICO = Number(process.env.E2E_PUERTO ?? 4300);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? (ESTATICO ? `http://localhost:${PUERTO_ESTATICO}` : 'http://localhost:4200'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // iPhone con el motor de Safari: el 40 % de las visitas reales llega desde iOS. Corre en Linux (CI); en Windows le falta libxml2.
    // También corre la primera sesión de Taps (retencion-primera-sesion.spec.ts) y el humo público y de invitado.
    { name: 'iphone-webkit', testMatch: /(mobile-public|retencion-primera-sesion|humo-publico|humo-invitado)\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
  // Con E2E_BASE_URL (p. ej. producción) no se levanta el servidor local.
  webServer: process.env.E2E_BASE_URL ? undefined : ESTATICO ? {
    command: 'node e2e/servidor-estatico.mjs',
    url: `http://localhost:${PUERTO_ESTATICO}/healthz`,
    env: { PORT: String(PUERTO_ESTATICO) },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  } : {
    command: 'npx ng serve main --host localhost --port 4200',
    url: 'http://localhost:4200/auth/signin',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
