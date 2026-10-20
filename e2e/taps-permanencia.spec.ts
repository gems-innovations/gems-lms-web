import { expect, Page, test } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Permanencia en Taps (producto/retencion/auditoria-permanencia.md, mejoras 1, 2, 3 y hallazgo 5), en celular (375 px):
 * - regreso al día siguiente (reloj simulado): no se repite lo jugado y aparece el saludo con la racha;
 * - enlace a un Tap ya jugado: ese Tap va primero con «Ya lo jugaste: n/5. ¿Revancha?»;
 * - barra de sesión: tras 1 Tap se ve «Hoy 1/3» y la racha, y la barra no gana alto;
 * - meta del día: se celebra una vez;
 * - el logo no saca del juego, «Más» es un menú y «No me interesa» se puede deshacer.
 * GoatCounter nunca recibe nada: count.js se reemplaza por un doble (igual que retencion-primera-sesion.spec.ts).
 *
 * Uso: npx playwright test e2e/taps-permanencia.spec.ts
 */
interface IHit { path: string }
declare global { interface Window { __gc?: IHit[] } }

const HORA = 3600_000;
/** Tarde del día 0 (hora local): el regreso es al día siguiente a la misma hora. */
const DIA0 = new Date(2026, 9, 19, 18, 0, 0);

// Taps suena por defecto tras el primer gesto: ninguna prueba debe sonar (ganancia 0 y voz anotada).
test.beforeEach(async ({ page }) => { await sinAudio(page); });

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route(/gc\.zgo\.at\/count\.js/, route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.__gc = []; window.goatcounter = Object.assign(window.goatcounter || {}, { count: function (v) { window.__gc.push(v); } });',
  }));
  await page.route(/goatcounter\.com/, route => route.abort());
});

const active = (page: Page) => page.locator('.tap.tap--active');
const count = async (page: Page, path: string) => (await page.evaluate(() => window.__gc ?? [])).filter(h => h.path === path).length;

async function answerCurrent(page: Page) {
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  const tap = active(page);
  await tap.locator('.tap__opt').first().tap();
  await tap.locator('.tap__go').tap({ timeout: 1_000 }).catch(() => undefined);
  await expect(tap.locator('.tap__opts.is-answered')).toHaveCount(0, { timeout: 8_000 });
  await page.waitForTimeout(400);
}

async function completeActiveTap(page: Page): Promise<string> {
  const tap = active(page);
  const id = (await tap.getAttribute('data-tap'))!;
  const total = await tap.locator('.tap__steps i').count();
  for (let k = 0; k < total; k++) await answerCurrent(page);
  await expect(tap.locator('.res__title')).toBeVisible();
  return id;
}

async function nextTap(page: Page, from: string) {
  await active(page).locator('.res__next').tap();
  await expect(active(page)).not.toHaveAttribute('data-tap', from);
  await expect(active(page).locator('.tap__opt').first()).toBeEnabled();
}

test.describe('Taps · permanencia (celular)', () => {
  test.setTimeout(90_000);                                     // jugar 2 Taps completos toma ~25 s
  test('regreso al día siguiente: no repite los Taps jugados y saluda con la racha', async ({ page }) => {
    await page.clock.setFixedTime(DIA0);
    await page.goto('/taps');
    const first = await completeActiveTap(page);
    await nextTap(page, first);
    const second = await completeActiveTap(page);
    await expect(page.locator('.bar__brand')).toContainText('2/3');

    await page.clock.setFixedTime(new Date(DIA0.getTime() + 24 * HORA));
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    const head = await active(page).getAttribute('data-tap');
    expect([first, second], 'el primer Tap del regreso no es ninguno de los jugados ayer').not.toContain(head);
    await expect(active(page).locator('.tap__toast')).toHaveText('¡Volviste! Racha de 1 día. Hoy hay Taps nuevos');
    await expect.poll(() => count(page, 'taps/regreso/saludo')).toBe(1);
    // Hoy aún no cuenta: la barra lo dice sin presión (racha 1, hoy 0/3).
    await expect(page.locator('.bar__brand')).toContainText('0/3');
    // El saludo se va al responder.
    await answerCurrent(page);
    await expect(active(page).locator('.tap__toast')).toHaveCount(0);
  });

  test('un enlace a un Tap ya jugado lo pone primero con «¿Revancha?» y desde la primera pregunta', async ({ page }) => {
    await page.goto('/taps');
    const first = await completeActiveTap(page);
    const score = await active(page).locator('.res__score').textContent();
    await page.goto(`/t/${first}`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    await expect(active(page)).toHaveAttribute('data-tap', first);
    await expect(active(page).locator('.tap__toast')).toHaveText(`Ya lo jugaste: ${score!.split(' de ')[0].trim()}/5. ¿Revancha?`);
    await expect(active(page).locator('.tap__q')).toBeVisible();          // la pregunta, no el resultado de ayer
    await expect(active(page).locator('.res__title')).toHaveCount(0);
  });

  test('un Tap a medias se retoma al volver otro día (localStorage, 48 h)', async ({ page }) => {
    await page.clock.setFixedTime(DIA0);
    await page.goto('/taps');
    const id = (await active(page).getAttribute('data-tap'))!;
    await answerCurrent(page);
    await answerCurrent(page);
    await page.clock.setFixedTime(new Date(DIA0.getTime() + 20 * HORA));
    await page.goto(`/t/${id}`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    await expect(active(page).locator('.tap__over').first()).toContainText('Pregunta 3 de 5');
    // Pasadas 48 h la partida vence y el Tap empieza de cero.
    await page.clock.setFixedTime(new Date(DIA0.getTime() + 49 * HORA));
    await page.goto(`/t/${id}`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    await expect(active(page).locator('.tap__over').first()).toContainText('Pregunta 1 de 5');
  });

  test('barra de sesión: tras 1 Tap se ven la racha y «Hoy 1/3» sin que la barra gane alto', async ({ page }) => {
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    const brand = page.locator('.bar__brand');
    await expect(brand).toContainText('GEMS LMS');                       // sin progreso: la marca
    const before = await page.locator('.bar').boundingBox();
    await completeActiveTap(page);
    await expect(brand).toContainText('1/3');
    await expect(brand).toHaveAttribute('aria-label', 'Tu día en Taps. Racha de 1 día. Hoy 1 de 3 Taps.');
    // 375 px: logo siempre visible y píldora «1/3» (sin la palabra), «Temas» solo con su icono.
    await expect(brand.locator('img')).toBeVisible();
    await expect(brand.locator('.chip__hoy')).toHaveText('Hoy 1/3');
    await expect(brand.locator('.chip__palabra')).toBeHidden();
    await expect(page.locator('.bar__topics span')).toBeHidden();
    const after = await page.locator('.bar').boundingBox();
    expect(after!.height).toBe(before!.height);
    // El resultado no repite la racha ni «Hoy n/3» (ya están en la barra): así cabe en el celular.
    await expect(active(page).locator('.res .franja')).toHaveCount(0);
    // Ningún botón de la barra se sale del ancho del celular.
    const right = await page.locator('.bar > *').evaluateAll(els => Math.max(...els.map(e => e.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(375);
  });

  test('meta del día: al tercer Tap se celebra una sola vez y se cuenta taps/meta-dia/cumplida', async ({ page }) => {
    // Dos Taps ya jugados hoy (otros que no son el primero del feed).
    await page.addInitScript(() => {
      if (localStorage.getItem('gems-taps-interes')) return;
      const now = Date.now(), d = new Date(now), p = (n: number) => String(n).padStart(2, '0');
      const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      localStorage.setItem('gems-taps-interes', JSON.stringify({ score: {}, blocked: {}, done: { 'cu-datos': now, 'lg-zorgs': now }, days: [day] }));
    });
    await page.goto('/taps');
    await expect(page.locator('.bar__brand')).toContainText('2/3');
    const first = await completeActiveTap(page);
    await expect(active(page).locator('.res__meta')).toContainText('Meta de hoy lista');
    await expect.poll(() => count(page, 'taps/meta-dia/cumplida')).toBe(1);
    await nextTap(page, first);
    await completeActiveTap(page);
    await expect(active(page).locator('.res__meta')).toHaveCount(0);                     // la celebración no se repite
    await expect(page.locator('.bar__brand')).toContainText('3/3');
    expect(await count(page, 'taps/meta-dia/cumplida')).toBe(1);
  });

  test('el logo no saca del juego: abre «Tu día en Taps» y la portada queda a un toque', async ({ page }) => {
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    const url = page.url();
    await page.locator('.bar__brand').tap();
    const hoja = page.getByRole('dialog', { name: 'Tu día en Taps' });
    await expect(hoja).toBeVisible();
    expect(page.url()).toBe(url);
    await expect(hoja.getByRole('link', { name: 'Ir a la portada de GEMS LMS' })).toHaveAttribute('href', '/');
    await hoja.getByRole('button', { name: 'Seguir jugando' }).tap();
    await expect(hoja).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/taps');
  });

  test('«Más» del riel es un menú: no cambia de Tap al abrirse y «No me interesa» se deshace', async ({ page }) => {
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    const id = await active(page).getAttribute('data-tap');
    const more = active(page).getByRole('button', { name: 'Más opciones' });
    await more.tap();
    await expect(active(page)).toHaveAttribute('data-tap', id!);
    const menu = active(page).locator('#rail-mas-movil');
    await expect(menu.getByRole('button', { name: /^Otro de / })).toBeVisible();
    await menu.getByRole('button', { name: 'No me interesa este tema' }).tap();
    await expect(active(page).locator('.tap__toast')).toContainText('30 días');
    await active(page).locator('.tap__toast').getByRole('button', { name: 'Deshacer' }).tap();
    await expect(active(page).locator('.tap__toast')).toHaveCount(0);
    await more.tap();
    await menu.getByRole('button', { name: 'No me interesa este tema' }).tap();
    await more.tap();
    await menu.getByRole('button', { name: /^Volver a mostrar / }).tap();
    await more.tap();
    await expect(menu.getByRole('button', { name: 'No me interesa este tema' })).toBeVisible();
    await menu.getByRole('button', { name: /^Otro de / }).tap();
    await expect(active(page)).not.toHaveAttribute('data-tap', id!);
  });
});
