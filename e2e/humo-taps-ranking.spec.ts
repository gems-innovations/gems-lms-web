import { expect, test } from '@playwright/test';
import { apiFalsa, erroresDePagina, sinAnalitica, sinScrollHorizontal } from './humo-soporte';

/**
 * Humo · rankings de Taps (un caso corto; la versión completa está en e2e/taps-ranking.spec.ts): al terminar un Tap se envía
 * la partida, el resultado muestra el XP y la hoja del ranking abre con datos. API falsa (e2e/humo-soporte.ts).
 * Uso: npx playwright test e2e/humo-taps-ranking.spec.ts
 */
test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, hasTouch: true });

const PARTIDA = { alias: 'Creeper Veloz 482', xpGanado: 60, semana: { puesto: 7, jugadores: 120, xp: 240 }, hoy: { percentil: 72, jugadores: 80 } };
const RANKING = {
  periodo: 'semana', desde: '2026-10-19T05:00:00Z', hasta: '2099-01-05T05:00:00Z', jugadores: 120,
  top: [{ puesto: 1, alias: 'Zombi Sabio 101', xp: 640, esTu: false }, { puesto: 2, alias: 'Lógica Ninja 138', xp: 618, esTu: false }],
  yo: { puesto: 34, xp: 120, percentil: 72, alias: 'Creeper Veloz 482' },
};

test('Humo · ranking de Taps: XP en el resultado y hoja del ranking', async ({ page }) => {
  const errores = erroresDePagina(page);
  await sinAnalitica(page);
  const api = await apiFalsa(page, { reglas: [
    { method: 'POST', path: /^\/public\/taps\/partidas$/, respond: () => ({ body: PARTIDA }) },
    { method: 'GET', path: /^\/public\/taps\/ranking$/, respond: () => ({ body: RANKING }) },
  ] });
  await page.goto('/taps');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForTimeout(400);

  const tap = page.locator('.tap.tap--active');
  const total = await tap.locator('.tap__steps i').count();
  for (let k = 0; k < total; k++) {
    await tap.locator('.tap__opt').first().click();
    await tap.locator('.tap__go').click({ timeout: 1_000 }).catch(() => undefined);
    await expect(tap.locator('.tap__opts.is-answered')).toHaveCount(0, { timeout: 8_000 });
    await page.waitForTimeout(400);
  }
  await expect(tap.locator('gems-tap-xp .xp__num')).toHaveText('+60 XP');
  expect(api.veces(/^\/public\/taps\/partidas$/, 'POST')).toBe(1);

  await tap.locator('.xp__ver').click();
  const hoja = page.locator('dialog.rk');
  await expect(hoja.locator('.rk__fija .is-tu')).toContainText('Creeper Veloz 482');
  await sinScrollHorizontal(page);
  await page.keyboard.press('Escape');
  await expect(hoja).toBeHidden();
  expect(errores, 'errores de JavaScript sin atrapar').toEqual([]);
});
