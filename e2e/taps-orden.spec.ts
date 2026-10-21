import { expect, test, type Browser, type Page } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Orden variado del feed (taps.mezcla.ts): la fila de Taps se mezcla con semilla por dispositivo (el id anónimo del
 * ranking, en localStorage) y por día de Colombia. Dos dispositivos ven filas distintas; el mismo dispositivo ve la misma
 * en el día; el gancho sigue primero para alguien nuevo; nunca dos Taps seguidos del mismo tema (prefijo del id:
 * mc- Minecraft, lg- Lógica, cu- Cultura). El HTML prerenderizado trae el orden neutro y el cliente mezcla al hidratar.
 *
 * Uso: npx playwright test e2e/taps-orden.spec.ts --workers=1  (con E2E_ESTATICO=1 contra el build estático)
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

const tema = (id: string) => id.slice(0, 2);
const sinRepetirTema = (ids: string[]) => ids.every((id, i) => i === 0 || tema(id) !== tema(ids[i - 1]));

/** Ids del feed en el orden pintado, una vez aplicada la mezcla de esta persona (`data-taps-orden`). */
async function orden(page: Page): Promise<string[]> {
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-orden'));
  return page.locator('main.taps > .tap[data-tap]').evaluateAll(els => els.map(el => (el as HTMLElement).dataset['tap']!));
}

/** Un «dispositivo»: contexto nuevo (almacenamiento vacío, id anónimo nuevo). */
async function dispositivo(browser: Browser, url = '/taps'): Promise<{ page: Page; ids: string[]; cerrar: () => Promise<void> }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  await sinAudio(page);
  await page.goto(url);
  return { page, ids: await orden(page), cerrar: () => context.close() };
}

test('dos dispositivos ven filas distintas, con el gancho primero y sin dos temas seguidos; el mismo dispositivo ve la misma en el día', async ({ browser }) => {
  const a = await dispositivo(browser), b = await dispositivo(browser);
  try {
    expect(a.ids.length).toBeGreaterThan(20);
    expect(a.ids.length).toBe(b.ids.length);
    expect(a.ids[0]).toBe('mc-gancho');
    expect(b.ids[0]).toBe('mc-gancho');
    expect(a.ids).not.toEqual(b.ids);
    for (const ids of [a.ids, b.ids]) {
      expect(sinRepetirTema(ids), 'nunca dos seguidos del mismo tema: ' + ids.slice(0, 12).join(' ')).toBe(true);
      const temas = new Set(ids.slice(0, 10).map(tema)).size;
      test.info().annotations.push({ type: 'temas distintos en los primeros 10', description: String(temas) });
      expect(temas).toBe(3);
    }
    // Recargar en el mismo dispositivo (mismo id en localStorage, mismo día): la misma fila.
    await a.page.reload();
    expect(await orden(a.page)).toEqual(a.ids);
  } finally { await Promise.all([a.cerrar(), b.cerrar()]); }
});

test('el HTML prerenderizado trae el orden neutro y el primer Tap no cambia al mezclar; el enlace /t/<id> queda primero', async ({ browser }) => {
  const a = await dispositivo(browser, '/t/cu-gancho');
  try {
    expect(a.ids[0]).toBe('cu-gancho');
    expect(sinRepetirTema(a.ids)).toBe(true);
    // Lo que trae el servidor (sin JS) es el mismo para todos: gancho primero y el orden base.
    const html = await a.page.request.get('/taps').then(r => r.text());
    const neutro = [...html.matchAll(/\sdata-tap="([^"]+)"/g)].map(m => m[1]);
    expect(neutro[0]).toBe('mc-gancho');
    const b = await dispositivo(browser);
    try {
      expect(neutro).not.toEqual(b.ids);                         // el cliente mezcló lo que viene después
      expect(b.ids[0]).toBe(neutro[0]);                          // sin cambiar el Tap a la vista
    } finally { await b.cerrar(); }
  } finally { await a.cerrar(); }
});

test('responder antes de hidratar no se pierde: el Tap respondido se queda primero y la cola igual se mezcla', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  await sinAudio(page);
  // El JS de Angular se retiene hasta después del toque: la respuesta la marca el script de index.html (prerender) y al
  // hidratar se repite el toque; la mezcla llega después y respeta ese Tap.
  let liberar = () => undefined as void;
  const retenido = new Promise<void>(r => { liberar = r; });
  await page.route(/\.js(\?|$)/, async route => {
    if (!/config\.js/.test(route.request().url())) await retenido;   // config.js es bloqueante en el <head>: si no, no se pinta nada
    await route.continue();
  });
  await page.goto('/taps', { waitUntil: 'commit' });              // los módulos retenidos retrasan DOMContentLoaded
  const tap = page.locator('.tap[data-tap="mc-gancho"]');
  const answer = Number(await tap.locator('.tap__opts').getAttribute('data-ans'));
  await tap.locator('.tap__opt').nth(answer).tap();
  await expect(tap.locator('.tap__opt').nth(answer)).toHaveClass(/pre-ok/);
  liberar();
  const ids = await orden(page);
  expect(ids[0]).toBe('mc-gancho');
  await expect(tap.locator('.tap__steps i').first()).toHaveClass(/is-ok/);   // Angular retomó la respuesta (el acierto queda en los pasos)
  expect(sinRepetirTema(ids.slice(1))).toBe(true);
  await context.close();
});
