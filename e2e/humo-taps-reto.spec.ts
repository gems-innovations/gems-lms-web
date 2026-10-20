import { expect, Page, test } from '@playwright/test';
import { apiFalsa, erroresDePagina, sinScrollHorizontal } from './humo-soporte';

/**
 * Humo · reto del día (auditoria-permanencia.md, mejora 4), en celular y con reloj simulado:
 * - el HTML de `/hoy` no trae nada que jugar (portada del reto); al hidratar abre con el reto del día y su chip
 *   «Reto del día #N»; otro navegador el mismo día recibe el mismo Tap;
 * - al terminarlo, el resultado lleva el número, la colección del subtema y el adelanto del siguiente Tap (abajo);
 * - compartir lleva el número y la cuadrícula, sin el título del Tap, y enlaza /hoy;
 * - al día siguiente el reto cambia y, en /taps, quien ya jugó lo encuentra primero.
 * GoatCounter nunca recibe nada (doble de count.js) y el API es falso (e2e/humo-soporte.ts). Sin rueda del ratón: en WebKit
 * móvil `mouse.wheel` no existe.
 * Uso: npx playwright test e2e/humo-taps-reto.spec.ts
 */
interface IHit { path: string }
declare global { interface Window { __gc?: IHit[]; __share?: { text?: string; url?: string } } }

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

/** Miércoles 21 de octubre de 2026, 10:00 en Colombia: reto #3. */
const DIA = new Date('2026-10-21T15:00:00Z');

async function preparar(page: Page, fecha: Date) {
  await page.clock.setFixedTime(fecha);
  await page.route(/gc\.zgo\.at\/count\.js/, route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.__gc = []; window.goatcounter = Object.assign(window.goatcounter || {}, { count: function (v) { window.__gc.push(v); } });',
  }));
  await page.route(/goatcounter\.com/, route => route.abort());
  // Menú de compartir simulado: se guarda lo que se compartiría.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d: { text?: string; url?: string }) => { window.__share = d; return Promise.resolve(); } });
  });
  await apiFalsa(page);
}

const active = (page: Page) => page.locator('.tap.tap--active');
const eventos = async (page: Page) => (await page.evaluate(() => window.__gc ?? [])).map(h => h.path);

async function abrir(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForTimeout(300);
}

test('Humo · reto del día: /hoy, mismo Tap para todos, resultado y cambio de día', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const errores = erroresDePagina(page);
  await preparar(page, DIA);
  // El HTML de /hoy no trae nada que jugar (ni el Tap de gancho que cambiaría al hidratar): solo la portada del reto.
  const html = await (await page.request.get('/hoy')).text();
  expect(html).toContain('tap--espera');
  expect(html).not.toMatch(/data-ans=|class="tap__opt[ "]/);
  await abrir(page, '/hoy');
  const reto = (await active(page).getAttribute('data-tap'))!;
  await expect(active(page).locator('.tap__reto')).toHaveText('Reto del día #3');
  await expect(page).toHaveURL(/\/hoy$/);

  // Otro navegador (sin nada guardado), el mismo día: el mismo reto.
  const otro = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p2 = await otro.newPage();
  await preparar(p2, DIA);
  await abrir(p2, '/hoy');
  await expect(active(p2)).toHaveAttribute('data-tap', reto);
  await otro.close();

  // Jugarlo entero.
  const tap = active(page);
  const total = await tap.locator('.tap__steps i').count();
  for (let k = 0; k < total; k++) {
    await tap.locator('.tap__opt').first().tap();
    await tap.locator('.tap__go').tap({ timeout: 1_000 }).catch(() => undefined);
    await expect(tap.locator('.tap__opts.is-answered')).toHaveCount(0, { timeout: 8_000 });
    await page.waitForTimeout(300);
  }
  await expect(tap.locator('.res__title')).toBeVisible();
  await expect(tap.locator('.res__over')).toContainText('Reto del día #3');
  await expect(tap.locator('gems-tap-coleccion.res__col button')).toBeVisible();
  await expect(tap.locator('.tap__peek-q')).not.toBeEmpty();
  const ev = await eventos(page);
  for (const e of ['taps/reto-dia/llegada-hoy', 'taps/reto-dia/ver', 'taps/reto-dia/completar']) expect(ev, e).toContain(e);

  // Compartir: número y cuadrícula, sin el título del Tap.
  const titulo = (await tap.locator('.res__theme').textContent())!.trim();
  await tap.getByRole('button', { name: 'Retar a un amigo' }).tap();
  const compartido = await page.waitForFunction(() => window.__share).then(h => h.jsonValue());
  expect(compartido.text).toContain('Reto del día #3');
  expect(compartido.text).toMatch(/\d\/5/);
  expect(compartido.text).not.toContain(titulo);
  expect(compartido.url, 'el reto se comparte con /hoy, no con /t/<id>').toMatch(/\/hoy$/);
  await sinScrollHorizontal(page);

  // «Tu día»: el reto ya cuenta y las colecciones están ahí.
  await page.locator('.bar__brand').tap();
  const hoja = page.getByRole('dialog', { name: 'Tu día en Taps' });
  await expect(hoja.locator('.reto__texto')).toContainText('Tu reto de hoy');
  await expect(hoja.locator('gems-tap-coleccion').first()).toBeVisible();
  await page.keyboard.press('Escape');

  // Al día siguiente el reto cambia, y en /taps quien ya jugó lo encuentra primero.
  await page.clock.setFixedTime(new Date(DIA.getTime() + 86_400_000));
  await abrir(page, '/taps');
  await expect(active(page).locator('.tap__reto')).toHaveText('Reto del día #4');
  expect(await active(page).getAttribute('data-tap')).not.toBe(reto);
  expect(errores, 'errores de JavaScript sin atrapar').toEqual([]);
});
