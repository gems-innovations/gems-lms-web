import { expect, Page, test } from '@playwright/test';
import { apiFalsa, erroresDePagina } from './humo-soporte';

/**
 * Humo · música de fondo de Taps (taps-musica.service.ts + taps-engine/audio/musica.js), en celular:
 * - apagada por defecto: ni el reproductor, ni el manifiesto, ni ninguna pista se piden;
 * - se enciende en la hoja «Tu día» (aria-pressed), arranca una sola pista en bucle y mide `taps/musica/on`;
 * - se recuerda al recargar, pero no se pide nada antes del primer gesto; con el gesto vuelve a sonar.
 * Nada suena de verdad: el destino de cada AudioContext se cambia por una ganancia 0 y se registran las fuentes que
 * arrancan. GoatCounter recibe un doble de count.js y el API es falso (e2e/humo-soporte.ts).
 * Uso: npx playwright test e2e/humo-taps-musica.spec.ts
 */
interface IHit { path: string }
interface IFuente { duracion: number; bucle: boolean }
declare global { interface Window { __gc?: IHit[]; __fuentes?: IFuente[] } }

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function preparar(page: Page, pedidos: string[]) {
  await page.route(/gc\.zgo\.at\/count\.js/, route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.__gc = []; window.goatcounter = Object.assign(window.goatcounter || {}, { count: function (v) { window.__gc.push(v); } });',
  }));
  await page.route(/goatcounter\.com/, route => route.abort());
  page.on('request', r => { if (/\/taps-musica\/|\/audio\/musica\.js/.test(r.url())) pedidos.push(new URL(r.url()).pathname); });
  // Audio interceptado: ningún AudioContext llega a los altavoces (destino = ganancia 0) y se anotan las fuentes que arrancan.
  await page.addInitScript(() => {
    window.__fuentes = [];
    const C = window.AudioContext;
    if (!C) return;
    class Mudo extends C {
      constructor(o?: AudioContextOptions) {
        super(o);
        const cero = super.createGain(); cero.gain.value = 0; cero.connect(super.destination);
        Object.defineProperty(this, 'destination', { value: cero });
      }
    }
    window.AudioContext = Mudo as typeof AudioContext;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a: Parameters<typeof start>) {
      if ((this.buffer?.duration ?? 0) > 5) window.__fuentes!.push({ duracion: this.buffer!.duration, bucle: this.loop });
      return start.apply(this, a);
    };
  });
  await apiFalsa(page);
}

async function abrir(page: Page) {
  await page.goto('/taps');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForTimeout(1_500);                                // reposo: el sonido y la voz se precargan aquí
}

const control = (page: Page) => page.getByRole('button', { name: /Música de fondo/ });
const fuentesMusica = (page: Page) => page.evaluate(() => (window.__fuentes ?? []).filter(f => f.duracion > 10));

test('Humo · música de Taps: apagada por defecto, se activa en «Tu día», nada antes del gesto y se recuerda', async ({ page }) => {
  test.setTimeout(90_000);
  const errores = erroresDePagina(page);
  const pedidos: string[] = [];
  await preparar(page, pedidos);
  await abrir(page);
  expect(pedidos, 'apagada: no se pide nada de música').toEqual([]);

  // «Tu día» (la marca de la barra): el control, apagado.
  await page.locator('.bar__brand').tap();
  await expect(control(page)).toHaveAttribute('aria-pressed', 'false');
  expect(pedidos).toEqual([]);

  await control(page).tap();
  await expect(control(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fuentesMusica(page), { timeout: 30_000 }).toHaveLength(1);   // decodificar 1 min de audio con 4 escenarios WebGL por software puede tardar
  const [fuente] = await fuentesMusica(page);
  expect(fuente.bucle).toBe(true);
  expect(fuente.duracion).toBeGreaterThan(50);
  // Solo el reproductor, el manifiesto y UNA pista (la del Tap a la vista), con hash en el nombre.
  const pistas = pedidos.filter(p => /\.(webm|m4a)$/.test(p));
  expect(pedidos.some(p => p.endsWith('/musica.js'))).toBe(true);
  expect(pedidos.some(p => p.endsWith('/musica.json'))).toBe(true);
  expect(pistas).toHaveLength(1);
  expect(pistas[0]).toMatch(/^\/taps-musica\/[a-z-]+\.[0-9a-f]{8}\.(webm|m4a)$/);
  expect(await page.evaluate(() => localStorage.getItem('gems-taps-musica'))).toBe('on');
  expect(await page.evaluate(() => (window.__gc ?? []).map(h => h.path))).toContain('taps/musica/on');
  await page.getByRole('button', { name: 'Seguir jugando' }).tap();

  // Recarga: la preferencia sigue, pero sin gesto no se pide ni suena nada.
  pedidos.length = 0;
  await abrir(page);
  expect(pedidos, 'antes del primer gesto no se pide nada').toEqual([]);
  expect(await fuentesMusica(page)).toEqual([]);
  await page.locator('.bar__brand').tap();                           // primer gesto: abre «Tu día»
  await expect(control(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fuentesMusica(page), { timeout: 30_000 }).toHaveLength(1);   // decodificar 1 min de audio con 4 escenarios WebGL por software puede tardar

  // Apagarla la detiene y se guarda.
  await control(page).tap();
  await expect(control(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('gems-taps-musica'))).toBe('off');
  expect(await page.evaluate(() => (window.__gc ?? []).map(h => h.path))).toContain('taps/musica/off');
  expect(errores).toEqual([]);
});
