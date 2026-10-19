import { expect, Page, test } from '@playwright/test';

/**
 * Retención · primera sesión en celular por Taps: llegar desde un Short (enlace con utm), primera pregunta visible y
 * tocable rápido, responder, completar un Tap, pasar al siguiente y compartir; y que se cuenten los eventos esperados.
 *
 * GoatCounter nunca recibe nada: count.js se reemplaza por un doble que anota cada conteo en `window.__gc`, y cualquier
 * envío a goatcounter.com se aborta. Taxonomía en producto/retencion/plan-retencion.md.
 *
 * Uso: npx playwright test e2e/retencion-primera-sesion.spec.ts            (Chromium en modo celular)
 *      npx playwright test --project=iphone-webkit                         (Safari de iPhone; corre en Linux/CI)
 */

interface IHit { path: string; title?: string; event?: boolean }
declare global { interface Window { __gc?: IHit[]; __shared?: ShareData[] } }

/** Con E2E_BASE_URL (producción) la medición de esta rama aún no está desplegada. Tras desplegar, quitar esta guarda. */
const REMOTE = !!process.env.E2E_BASE_URL && !/\/\/(localhost|127\.0\.0\.1)[:/]/.test(process.env.E2E_BASE_URL);
const PENDIENTE_DE_DESPLIEGUE = 'llegada/visita/regreso/interno llegan con feat/retencion-medicion: aún no en producción';
/** Tiempo máximo hasta que la primera pregunta responde al toque (marca `taps-interactive`). El servidor de desarrollo es más lento. */
const INTERACTIVE_BUDGET_MS = REMOTE ? 4_000 : 8_000;

const SHORT_URL = '/taps?utm_source=youtube&utm_medium=short&utm_campaign=quiz-bloques&utm_content=redstone-1';

const COUNT_JS_STUB = `
  window.__gc = [];
  window.goatcounter = Object.assign(window.goatcounter || {}, { count: function (v) { window.__gc.push(v); } });
`;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route(/gc\.zgo\.at\/count\.js/, route => route.fulfill({ contentType: 'text/javascript', body: COUNT_JS_STUB }));
  await page.route(/goatcounter\.com/, route => route.abort());
  // Compartir: el menú nativo no existe en las pruebas; se anota lo que se habría compartido.
  await page.addInitScript(() => {
    window.__shared = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: (data: ShareData) => { window.__shared!.push(data); return Promise.resolve(); } });
  });
});

async function hits(page: Page): Promise<IHit[]> {
  return page.evaluate(() => window.__gc ?? []);
}

/** Cuántas veces se contó cada path (eventos y páginas). */
async function counts(page: Page): Promise<Record<string, number>> {
  const all = await hits(page);
  return all.reduce<Record<string, number>>((acc, h) => ({ ...acc, [h.path]: (acc[h.path] ?? 0) + 1 }), {});
}

/** Espera a que un path llegue a `n` conteos (los eventos salen cuando carga count.js, que es async). */
async function expectCount(page: Page, path: string, n: number) {
  await expect.poll(async () => (await counts(page))[path] ?? 0, { message: `conteos de «${path}»` }).toBe(n);
}

const active = (page: Page) => page.locator('section.tap.tap--active');

/** Responde la pregunta a la vista (primera opción) y pasa a la siguiente o al título. */
async function answerCurrent(page: Page) {
  const tap = active(page);
  await tap.locator('.tap__opt').first().tap();
  await expect(tap.locator('.tap__why')).toBeVisible();
  await tap.locator('.tap__next').tap();
}

/** Juega el Tap a la vista hasta su título; devuelve cuántas preguntas tenía. */
async function completeActiveTap(page: Page): Promise<number> {
  const tap = active(page);
  const total = await tap.locator('.tap__steps i').count();
  for (let k = 0; k < total; k++) await answerCurrent(page);
  await expect(tap.locator('.tap__title')).toBeVisible();
  return total;
}

test.describe('Retención · primera sesión en celular (Taps)', () => {
  test('llega desde un Short, responde, completa un Tap, pasa al siguiente y comparte', async ({ page }, info) => {
    await page.goto(SHORT_URL);

    // 1. La primera pregunta se ve y se puede tocar rápido, sin esperar al personaje 3D.
    const firstOption = active(page).locator('.tap__opt').first();
    await expect(firstOption).toBeVisible();
    await expect(firstOption).toBeEnabled();
    await expect(active(page).locator('.tap__q')).not.toBeEmpty();
    const interactiveAt = await page.evaluate(() => performance.getEntriesByName('taps-interactive')[0]?.startTime ?? null);
    info.annotations.push({ type: 'tiempo hasta poder tocar', description: `${Math.round(interactiveAt ?? -1)} ms` });
    expect(interactiveAt, 'la primera pregunta debe responder al toque pronto').not.toBeNull();
    expect(interactiveAt!).toBeLessThan(INTERACTIVE_BUDGET_MS);
    const opts = await active(page).locator('.tap__opt').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
    expect(Math.min(...opts), 'opciones grandes para el pulgar').toBeGreaterThanOrEqual(44);

    // 2. Página y vista del primer Tap.
    await expectCount(page, '/taps', 1);
    await expectCount(page, 'taps-ver', 1);

    // 3. Responder y completar el Tap.
    const firstId = await active(page).getAttribute('data-tap');
    const questions = await completeActiveTap(page);
    await expectCount(page, 'taps-responder', questions);
    await expectCount(page, 'taps-completar', 1);

    // 4. Compartir el resultado (el texto lleva el enlace al mismo Tap).
    await active(page).getByRole('button', { name: 'Compartir' }).tap();
    await expect.poll(() => page.evaluate(() => window.__shared?.length ?? 0)).toBe(1);
    const shared = await page.evaluate(() => window.__shared![0]);
    expect(shared.url).toContain(`/taps?t=${firstId}`);

    // 5. Pasar al siguiente Tap.
    await active(page).locator('.tap__next').tap();
    await expect(active(page)).not.toHaveAttribute('data-tap', firstId!);
    await expectCount(page, 'taps-siguiente', 1);
    await expectCount(page, 'taps-ver', 2);
    await expect(active(page).locator('.tap__opt').first()).toBeEnabled();

    // Ninguna página ni evento se cuenta dos veces por error.
    const c = await counts(page);
    expect(c['taps-completar']).toBe(1);
    expect(c['/taps']).toBe(1);
  });

  test('cuenta la llegada (fuente y video) y la primera visita', async ({ page }) => {
    test.skip(REMOTE, PENDIENTE_DE_DESPLIEGUE);
    await page.goto(SHORT_URL);
    await expect(active(page).locator('.tap__opt').first()).toBeEnabled();
    await expectCount(page, 'llegada/youtube/redstone-1', 1);
    await expectCount(page, 'visita/nueva', 1);
    // La llegada es una por pestaña: volver a cargar no la repite, ni repite la primera visita.
    await page.reload();
    await expect(active(page).locator('.tap__opt').first()).toBeEnabled();
    await expectCount(page, '/taps', 1);                       // __gc se reinicia con cada carga
    const c = await counts(page);
    expect(c['llegada/youtube/redstone-1'] ?? 0).toBe(0);
    expect(c['visita/nueva'] ?? 0).toBe(0);
  });

  test('quien vuelve al día siguiente cuenta como regreso D1 de su cohorte', async ({ page }) => {
    test.skip(REMOTE, PENDIENTE_DE_DESPLIEGUE);
    await page.addInitScript(() => {
      if (localStorage.getItem('gems-visita')) return;
      const d = new Date(); d.setDate(d.getDate() - 1);
      const p = (n: number) => String(n).padStart(2, '0');
      localStorage.setItem('gems-visita', JSON.stringify({ primera: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, regresos: [] }));
    });
    await page.goto('/taps');
    await expect(active(page).locator('.tap__opt').first()).toBeEnabled();
    await expect.poll(async () => (await hits(page)).filter(h => /^regreso\/d1\/\d{4}-s\d{2}$/.test(h.path)).length).toBe(1);
    expect((await counts(page))['visita/nueva'] ?? 0).toBe(0);
    await expectCount(page, 'llegada/directo', 1);
  });

  test('el tráfico del equipo (?interno=1) no se cuenta', async ({ page }) => {
    test.skip(REMOTE, PENDIENTE_DE_DESPLIEGUE);
    await page.goto('/taps?interno=1');
    await answerCurrent(page);
    await page.goto('/taps');                                  // la marca queda en el navegador
    await answerCurrent(page);
    await page.waitForTimeout(500);
    expect(await hits(page), 'no debe contarse nada').toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('skipgc'))).toBe('t');
  });

  // ── Pendientes: dependen de la capa de Taps, que trabajan otros agentes (no se edita taps/ desde esta rama). ──

  test.fixme('compartir cuenta «taps-compartir»', async ({ page }) => {
    // Pendiente: lo añade la rama feat/taps-ronda-1 (agente de UX de Taps). Al fusionarla, quitar fixme.
    await page.goto('/taps');
    await completeActiveTap(page);
    await active(page).getByRole('button', { name: 'Compartir' }).tap();
    await expectCount(page, 'taps-compartir', 1);
  });

  test.fixme('primer toque y abandono por pregunta con detalle en el path', async ({ page }) => {
    // Pendiente: taxonomía nueva en la capa de Taps (taps/primer-toque/<tramo>, taps/responder/<tap>/<n>).
    await page.goto(SHORT_URL);
    const id = await active(page).getAttribute('data-tap');
    await answerCurrent(page);
    await expect.poll(async () => (await hits(page)).filter(h => h.path.startsWith('taps/primer-toque/')).length).toBe(1);
    await expectCount(page, `taps/responder/${id}/1`, 1);
  });

  test.fixme('hitos de Taps completados por sesión (taps/hito/1, /2…)', async ({ page }) => {
    // Pendiente: lo dispara la capa de Taps al completar el 1.º, 2.º, 3.º, 4.º, 6.º y 10.º Tap de la sesión.
    await page.goto('/taps');
    await completeActiveTap(page);
    await expectCount(page, 'taps/hito/1', 1);
  });

  test.fixme('invitación a registro tras el 3.er Tap: ofrecido y rechazado', async ({ page }) => {
    // Pendiente: la hoja de registro con «Ahora no» aún no existe (experiencia-ux.md §2.6).
    await page.goto('/taps');
    for (let k = 0; k < 3; k++) { await completeActiveTap(page); await active(page).locator('.tap__next').tap(); }
    await expectCount(page, 'registro/ofrecido/tercer-tap', 1);
    await page.getByRole('button', { name: 'Ahora no' }).tap();
    await expectCount(page, 'registro/rechazado/tercer-tap', 1);
  });

  test.fixme('selector de tema: abrir y elegir arranca un Tap de ese tema', async ({ page }) => {
    // Pendiente: el selector de categorías lo hace otro agente (taps/tema/abrir, taps/tema/elegir/<tema>).
    await page.goto('/taps');
    await page.getByRole('button', { name: /temas/i }).tap();
    await expectCount(page, 'taps/tema/abrir', 1);
  });

  test.fixme('sin WebGL el Tap sigue jugable y se cuenta error/modo-ligero', async ({ page }) => {
    // Pendiente: el evento lo emite la capa de Taps cuando el motor entra en modo ligero o no carga.
    await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await page.goto('/taps');
    await answerCurrent(page);
    await expect.poll(async () => (await hits(page)).filter(h => h.path.startsWith('error/')).length).toBeGreaterThan(0);
  });
});
