import { expect, test, type Page, type Route } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Rankings de Taps (web) con el API simulado: tarjeta de XP en el resultado, hoja del ranking en móvil y cajón en escritorio,
 * y que todo degrade limpio mientras el backend aún responde 404.
 *
 * Uso: npx playwright test e2e/taps-ranking.spec.ts  (con E2E_ESTATICO=1 contra el build estático)
 */
// Taps suena por defecto tras el primer gesto: ninguna prueba debe sonar (ganancia 0 y voz anotada).
test.beforeEach(async ({ page }) => { await sinAudio(page); });

test.use({ serviceWorkers: 'block' });

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARTIDA = { alias: 'Creeper Veloz 482', xpGanado: 60, semana: { puesto: 7, jugadores: 120, xp: 240 }, hoy: { percentil: 72, jugadores: 80 } };
const ALIAS = ['Zombi Sabio', 'Lógica Ninja', 'Bloque Curioso', 'Pixel Valiente', 'Redstone Pro', 'Ender Tranquilo', 'Cohete Azul', 'Gato Lector'];
const ranking = (periodo: string, yoEnTop: boolean) => {
  const top = Array.from({ length: 20 }, (_, i) => ({ puesto: i + 1, alias: `${ALIAS[i % ALIAS.length]} ${101 + i * 37}`, xp: 640 - i * 22, esTu: yoEnTop && i === 6 }));
  if (yoEnTop) top[6] = { ...top[6], alias: 'Creeper Veloz 482', xp: 500 };
  return {
    periodo, desde: '2026-10-19T05:00:00Z', hasta: '2026-10-26T05:00:00Z', jugadores: 120, top,
    yo: yoEnTop ? { puesto: 7, xp: 500, percentil: 95, alias: 'Creeper Veloz 482' } : { puesto: 34, xp: 120, percentil: 72, alias: 'Creeper Veloz 482' },
  };
};

/** API simulado del ranking. `listo: false` = backend aún sin desplegar (404 en todo). */
async function simularApi(page: Page, opts: { listo: boolean; yoEnTop?: boolean }) {
  const partidas: Record<string, unknown>[] = [];
  const rankings: URL[] = [];
  await page.route('**/api/v1/public/taps/partidas', async (route: Route) => {
    partidas.push(route.request().postDataJSON());
    await route.fulfill(opts.listo ? { json: PARTIDA } : { status: 404, json: { message: 'Not Found' } });
  });
  await page.route('**/api/v1/public/taps/ranking**', async (route: Route) => {
    const url = new URL(route.request().url());
    rankings.push(url);
    await route.fulfill(opts.listo ? { json: ranking(url.searchParams.get('periodo') ?? 'semana', !!opts.yoEnTop) } : { status: 404, json: { message: 'Not Found' } });
  });
  return { partidas, rankings };
}

const hydrated = (page: Page) => page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));

/** Juega el Tap a la vista hasta el resultado (primera opción y «Seguir» en cada pregunta). */
async function terminarTap(page: Page) {
  const tap = page.locator('.tap.tap--active');
  const total = await tap.locator('.tap__steps i').count();
  for (let k = 0; k < total; k++) {
    await tap.locator('.tap__opt').first().click();
    // Adelanta con «Seguir»; si el acierto ya avanzó solo (1,4 s), no hace falta.
    await tap.locator('.tap__go').click({ timeout: 1_000 }).catch(() => undefined);
    await expect(tap.locator('.tap__opts.is-answered')).toHaveCount(0, { timeout: 8_000 });
    await page.waitForTimeout(400);
  }
  await expect(tap.locator('.res__title')).toBeVisible();
}

test.describe('móvil 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('al terminar un Tap se envía la partida y el resultado muestra XP, puesto y percentil', async ({ page }) => {
    const api = await simularApi(page, { listo: true });
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(400);
    await terminarTap(page);
    const xp = page.locator('.tap--active gems-tap-xp .xp');
    await expect(xp).toBeVisible();
    await expect(xp.locator('.xp__num')).toHaveText('+60 XP');
    await expect(xp).toContainText('Puesto 7 de 120 esta semana');
    await expect(xp).toContainText('Mejor que el 72 % de hoy');
    expect(api.partidas.length).toBe(1);
    const body = api.partidas[0];
    expect(String(body['jugadorId'])).toMatch(UUID_V4);
    expect(['minecraft', 'logica', 'cultura']).toContain(body['tema']);
    expect(body['total']).toBe(5);
    expect(Number(body['duracionMs'])).toBeGreaterThan(0);
  });

  test('«Ver ranking» abre la hoja con tu fila fijada abajo; las pestañas cambian el periodo', async ({ page }) => {
    const api = await simularApi(page, { listo: true });
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(400);
    await terminarTap(page);
    await page.locator('.tap--active .xp__ver').click();
    const hoja = page.locator('dialog.rk');
    await expect(hoja).toBeVisible();
    await expect(hoja.locator('.rk__lista .rk__fila')).toHaveCount(20);
    await expect(hoja.locator('.rk__fija .is-tu')).toContainText('Creeper Veloz 482');
    await expect(hoja.locator('.rk__alias')).toContainText('Juegas como Creeper Veloz 482');
    await expect(hoja.locator('.rk__reloj')).toContainText('La semana cierra en');
    await page.keyboard.press('ArrowRight');
    await expect(hoja.locator('[role="tab"][aria-selected="true"]')).toHaveText('Hoy');
    await expect.poll(() => api.rankings.at(-1)?.searchParams.get('periodo')).toBe('hoy');
    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();
  });

  test('con el backend aún sin desplegar (404) no hay tarjeta de XP y el ranking «se está preparando»', async ({ page }) => {
    const api = await simularApi(page, { listo: false });
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(400);
    await terminarTap(page);
    await expect.poll(() => api.partidas.length).toBe(1);
    await page.waitForTimeout(800);
    await expect(page.locator('.tap--active gems-tap-xp .xp')).toHaveCount(0);
    await page.getByRole('button', { name: 'Ranking' }).click();
    const hoja = page.locator('dialog.rk');
    await expect(hoja).toContainText('El ranking se está preparando');
    await expect(hoja.locator('lib-load-error')).toHaveCount(0);
  });
});

test.describe('código del ranking que no carga', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('avisa, se cierra y el juego sigue (sin cuenta atrás ni atajos bloqueados)', async ({ page }) => {
    await simularApi(page, { listo: true });
    await page.goto('/taps');
    await hydrated(page);
    await page.locator('gems-tap-panel .panel').waitFor({ state: 'attached' });
    await page.waitForTimeout(400);
    // Desde aquí cualquier chunk nuevo (el del ranking) falla como sin red.
    await page.route(/\/chunk-[^/]+\.js$/, route => route.abort('internetdisconnected'));
    await page.locator('gems-taps-menu .side').getByRole('button', { name: 'Ranking' }).click();
    const aviso = page.locator('.ranking-fallo');
    await expect(aviso).toContainText('No pudimos abrir el ranking');
    await aviso.getByRole('button', { name: 'Cerrar' }).click();
    await expect(aviso).toHaveCount(0);
    // Los atajos responden y la cuenta atrás avanza sola.
    await page.keyboard.press('1');
    await expect(page.locator('.tap--active .tap__opts.is-answered')).toBeVisible();
    await expect(page.locator('.tap--active .tap__opts.is-answered')).toHaveCount(0, { timeout: 6_000 });
  });
});

test.describe('escritorio 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('el menú abre el ranking como cajón y el panel del resultado enlaza al ranking', async ({ page }) => {
    await simularApi(page, { listo: true, yoEnTop: true });
    await page.goto('/taps');
    await hydrated(page);
    await page.locator('gems-tap-panel .panel').waitFor({ state: 'attached' });
    await page.waitForTimeout(400);
    await terminarTap(page);
    const tarjeta = page.locator('gems-tap-panel .card').first();
    await expect(tarjeta).toContainText('Ranking semanal');
    await expect(tarjeta).toContainText('Llevas 240 XP esta semana.');
    await page.locator('gems-taps-menu .side').getByRole('button', { name: 'Ranking' }).click();
    const hoja = page.locator('dialog.rk');
    await expect(hoja).toBeVisible();
    const caja = (await hoja.boundingBox())!;
    expect(Math.round(caja.width)).toBe(440);
    expect(caja.x + caja.width).toBeGreaterThan(1430);
    await expect(hoja.locator('.rk__lista [aria-current="true"]')).toContainText('Creeper Veloz 482');
    await expect(hoja.locator('.rk__fija')).toHaveCount(0);
    await hoja.getByRole('button', { name: 'Cultura general' }).click();
    await expect(hoja.getByRole('button', { name: 'Cultura general' })).toHaveAttribute('aria-pressed', 'true');
    await hoja.getByRole('button', { name: 'Cerrar el ranking' }).click();
    await expect(hoja).toBeHidden();
  });
});
