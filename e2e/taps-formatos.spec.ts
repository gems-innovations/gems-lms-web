import { expect, test, type Page } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Formatos de pregunta nuevos (taps.types.ts → TTapQuestionTipo): `duo` (2 opciones una contra otra con cuenta regresiva) y
 * `vf` (verdadero o falso). Se responden tocando, deslizando hacia el lado de la opción o con el teclado (1 / 2, ← / →); en el
 * duo, sin respuesta a tiempo cuenta como fallo.
 *
 * Uso: npx playwright test e2e/taps-formatos.spec.ts --workers=1  (con E2E_ESTATICO=1 contra el build estático)
 */
test.beforeEach(async ({ page }) => { await sinAudio(page); });

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

const hydrated = (page: Page) => page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
const active = (page: Page) => page.locator('.tap.tap--active');

test('un duo trae 2 opciones grandes, cuenta regresiva y se responde deslizando hacia la opción', async ({ page }) => {
  await page.goto('/t/cu-duelo-1');                               // su primera pregunta es un duo (hormigas o personas)
  await hydrated(page);
  const opts = active(page).locator('.tap__opts');
  await expect(opts).toHaveAttribute('data-tipo', 'duo');
  await expect(opts.locator('.tap__opt')).toHaveCount(2);
  await expect(active(page).locator('.tap__wait--duo')).toBeVisible();
  await expect(opts).toHaveAttribute('aria-describedby', /ayuda-/);
  // deslizar a la izquierda = la primera opción
  const box = (await opts.boundingBox())!;
  const y = box.y + box.height / 2, x0 = box.x + box.width * .7;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x0 - i * 20, y);
  await expect(opts).toHaveClass(/is-swiping/);
  await page.mouse.up();
  await expect(opts).toHaveClass(/is-answered/);
  await expect(opts.locator('.tap__opt[data-k="0"]')).toHaveClass(/is-ok/);      // «Hormigas» es la correcta
  await expect(active(page)).toHaveAttribute('data-acierto', 'si');
  await expect(active(page).locator('.tap__wait--duo')).toHaveCount(0);
});

test('un duo sin respuesta en 7 s cuenta como fallo y explica «Se acabó el tiempo»', async ({ page }) => {
  await page.goto('/t/cu-duelo-1');
  await hydrated(page);
  await expect(active(page).locator('.tap__opts')).toHaveAttribute('data-tipo', 'duo');
  await expect(active(page).locator('.tap__card')).toContainText('Se acabó el tiempo', { timeout: 12_000 });
  await expect(active(page).locator('.tap__opts')).toHaveClass(/is-answered/);
  await expect(active(page).locator('.tap__opt.is-bad')).toHaveCount(0);          // ninguna opción marcada como elegida
  await expect(active(page).locator('.tap__steps i.is-bad')).toHaveCount(1);
});

test('verdadero/falso: se responde con las flechas y el panel marca el acierto', async ({ page }) => {
  await page.goto('/t/cu-duelo-2');                               // duo (rayo o trueno) y luego vf (el vidrio es un líquido)
  await hydrated(page);
  await active(page).locator('.tap__opt[data-k="0"]').click();    // «El rayo»: acierto, avanza solo a los 1,4 s
  await expect(active(page).locator('.tap__opts')).toHaveAttribute('data-tipo', 'vf', { timeout: 5_000 });
  const opts = active(page).locator('.tap__opts .tap__label');
  await expect(opts).toHaveText(['Verdadero', 'Falso']);
  await page.keyboard.press('ArrowRight');                        // la segunda opción: «Falso» (el vidrio no es un líquido)
  await expect(active(page).locator('.tap__opts')).toHaveClass(/is-answered/);
  await expect(active(page)).toHaveAttribute('data-tipo', 'vf');
  await expect(active(page)).toHaveAttribute('data-acierto', 'si');
});
