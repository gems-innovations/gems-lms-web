import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

async function signIn(page: Page): Promise<void> {
  await page.goto('/auth/signin');
  await page.getByLabel('Correo electrónico').fill(email!);
  await page.getByLabel('Contraseña').fill(password!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/admin\//);

  const closeTour = page.locator('.driver-popover-close-btn');
  if (await closeTour.isVisible({ timeout: 1_500 }).catch(() => false)) await closeTour.click();
}

test.describe('experiencia y accesibilidad', () => {
  test('la pantalla de acceso no tiene violaciones graves de accesibilidad', async ({ page }) => {
    await page.goto('/auth/signin');
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
    expect(severe, severe.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  });

  test('las páginas privadas redirigen al acceso', async ({ page }) => {
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('el administrador abre su perfil desde el buscador rápido', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Navegación rápida' })).toBeVisible();
    await page.getByLabel('Buscar una sección o acción').fill('perfil');
    await page.getByLabel('Buscar una sección o acción').press('Enter');
    await expect(page).toHaveURL(/\/account\/profile/);
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  });

  test('las preferencias visuales se guardan en el dispositivo', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.goto('/account/profile');
    await page.getByRole('button', { name: 'Claro' }).click();
    await page.getByLabel('Interfaz compacta').check();
    await expect(page.locator('html')).toHaveClass(/light-mode/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('gems-display-preferences')))
      .toContain('"compact":true');
  });

  test('la guía se puede abrir manualmente', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.getByRole('button', { name: 'Ver guía de la plataforma' }).click();
    await expect(page.locator('.driver-popover')).toBeVisible();
    await expect(page.locator('.driver-popover-title')).not.toBeEmpty();
  });
});
