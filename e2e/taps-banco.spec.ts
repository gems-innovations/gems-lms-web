import { expect, test } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Taps con el banco de preguntas (102 Taps): selector de temas con conteos reales (Cultura general ya no es «Pronto»),
 * ?tema= que pone primero esa categoría y feed liviano (solo el Tap anterior, el actual y el siguiente tienen contenido).
 *
 * Uso: npx playwright test e2e/taps-banco.spec.ts
 */
// Taps suena por defecto tras el primer gesto: ninguna prueba debe sonar (ganancia 0 y voz anotada).
test.beforeEach(async ({ page }) => { await sinAudio(page); });

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

const hydrated = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));

test('el selector muestra los tres temas con sus conteos y ninguno dice «Pronto»', async ({ page }) => {
  await page.goto('/taps');
  await hydrated(page);
  await page.getByRole('button', { name: /^Temas:/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: /Minecraft/ })).toContainText('42 Taps');
  await expect(sheet.getByRole('button', { name: /Lógica y trampas/ })).toContainText('29 Taps');
  await expect(sheet.getByRole('button', { name: /Cultura general/ })).toContainText('31 Taps');
  await expect(sheet.getByRole('button', { name: /Cultura general/ })).toBeEnabled();
  await expect(sheet).not.toContainText('Pronto');
});

test('elegir Cultura general pone primero un Tap de cultura y deja la URL enlazable', async ({ page }) => {
  await page.goto('/taps');
  await hydrated(page);
  await page.getByRole('button', { name: /^Temas:/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Cultura general/ }).click();
  await expect(page).toHaveURL(/tema=cultura/);
  await expect(page.locator('.tap.tap--active')).toHaveAttribute('data-tap', /^cu-/);
});

test('?tema= abre con el gancho de ese tema', async ({ page }) => {
  await page.goto('/taps?tema=logica');
  await hydrated(page);
  await expect(page.locator('.tap.tap--active')).toHaveAttribute('data-tap', 'lg-gancho');
});

test('solo tres Taps tienen contenido en el DOM aunque el feed tenga 102', async ({ page }) => {
  await page.goto('/taps');
  await hydrated(page);
  await expect(page.locator('main.taps > .tap')).toHaveCount(102);
  expect(await page.locator('main.taps .tap__opts').count()).toBeLessThanOrEqual(3);
});

test('un enlace con un id antiguo lleva al Tap equivalente del banco', async ({ page }) => {
  await page.goto('/t/primeros-pasos');
  await hydrated(page);
  await expect(page.locator('.tap.tap--active')).toHaveAttribute('data-tap', 'mc-gancho');
});
