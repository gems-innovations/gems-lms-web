import { expect, Page, test } from '@playwright/test';
import { apiFalsa, erroresDePagina } from './humo-soporte';

/**
 * Humo · audio de Taps (taps-sonido.service.ts, taps-musica.service.ts y taps-engine/audio), en celular:
 * - por defecto (sin preferencia) el sonido y la música están encendidos y la voz apagada; sin aviso «Toca para sonido»;
 * - antes del primer gesto no se pide ni suena nada (política de autoplay); el primer toque en una respuesta arranca la
 *   música (una sola pista en bucle) y el efecto de la respuesta;
 * - el altavoz de la barra calla todo y se recuerda; con el sonido apagado ni se carga la música; «Todo el sonido» en
 *   «Tu día» lo devuelve;
 * - «Música de fondo» en «Tu día» apaga solo la música (se recuerda) y la vuelve a encender; se mide `taps/musica/<on|off>`
 *   y `taps/sonido/<on|off>/<origen>`.
 * Antes la música estaba apagada por defecto y el sonido «pendiente» hasta responder; esta prueba cambió con eso
 * (fix/taps-audio-por-defecto). Nada suena de verdad: el destino de cada AudioContext es una ganancia 0 (sinAudio, dentro
 * de apiFalsa) y aquí se anotan las fuentes que arrancan y paran. GoatCounter recibe un doble de count.js y el API es falso.
 * Uso: npx playwright test e2e/humo-taps-musica.spec.ts
 */
interface IHit { path: string }
interface IFuente { duracion: number; bucle: boolean; parada: boolean }
declare global { interface Window { __gc?: IHit[]; __fuentes?: IFuente[] } }

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function preparar(page: Page, pedidos: string[]) {
  await page.route(/gc\.zgo\.at\/count\.js/, route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.__gc = []; window.goatcounter = Object.assign(window.goatcounter || {}, { count: function (v) { window.__gc.push(v); } });',
  }));
  await page.route(/goatcounter\.com/, route => route.abort());
  page.on('request', r => { if (/\/taps-musica\/|\/audio\/musica\.js/.test(r.url())) pedidos.push(new URL(r.url()).pathname); });
  await apiFalsa(page);                                            // también sinAudio: nada llega a los altavoces
  // Se anotan las fuentes que arrancan (la música dura > 10 s; los efectos, < 1 s) y cuándo paran.
  await page.addInitScript(() => {
    window.__fuentes = [];
    const start = AudioBufferSourceNode.prototype.start, stop = AudioBufferSourceNode.prototype.stop;
    const vistas = new WeakMap<AudioBufferSourceNode, IFuente>();
    AudioBufferSourceNode.prototype.start = function (...a: Parameters<typeof start>) {
      const f = { duracion: this.buffer?.duration ?? 0, bucle: this.loop, parada: false };
      vistas.set(this, f); window.__fuentes!.push(f);
      return start.apply(this, a);
    };
    AudioBufferSourceNode.prototype.stop = function (...a: Parameters<typeof stop>) {
      const f = vistas.get(this); if (f) f.parada = true;
      return stop.apply(this, a);
    };
  });
}

async function abrir(page: Page) {
  await page.goto('/taps');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForTimeout(1_500);                                // reposo: el sonido y la voz se precargan aquí
}

const opcion = (page: Page) => page.locator('.tap.tap--active .tap__opt').first();
const musica = (page: Page) => page.getByRole('button', { name: 'Música de fondo' });
const todo = (page: Page) => page.getByRole('button', { name: 'Todo el sonido' });
const altavoz = (page: Page) => page.locator('.bar__sound');
const sonando = (page: Page) => page.evaluate(() => (window.__fuentes ?? []).filter(f => f.duracion > 10 && !f.parada));
const efectos = (page: Page) => page.evaluate(() => (window.__fuentes ?? []).filter(f => f.duracion > 0 && f.duracion < 2).length);
const eventos = (page: Page) => page.evaluate(() => (window.__gc ?? []).map(h => h.path));

test('Humo · audio de Taps: sonido y música por defecto, arrancan con el primer toque y se recuerdan al apagarlos', async ({ page }) => {
  test.setTimeout(120_000);
  const errores = erroresDePagina(page);
  const pedidos: string[] = [];
  await preparar(page, pedidos);
  await abrir(page);

  // Al entrar: altavoz encendido, sin aviso, y nada pedido ni sonando antes del primer gesto.
  await expect(altavoz(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.bar__tip')).toHaveCount(0);
  await expect(page.getByText(/para sonido/)).toHaveCount(0);
  expect(pedidos, 'antes del primer gesto no se pide nada de música').toEqual([]);
  expect(await page.evaluate(() => (window.__fuentes ?? []).length), 'antes del primer gesto no arranca ninguna fuente').toBe(0);

  // Primer gesto real: responder. Suena el efecto de la respuesta (uno, como mucho dos: nunca una ráfaga de lo acumulado)
  // y entra UNA pista en bucle.
  await opcion(page).tap();
  await expect.poll(() => efectos(page), { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await efectos(page), 'el primer toque no suelta una ráfaga de efectos').toBeLessThanOrEqual(2);
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);   // decodificar 1 min de audio con escenarios WebGL por software puede tardar
  const [fuente] = await sonando(page);
  expect(fuente.bucle).toBe(true);
  expect(fuente.duracion).toBeGreaterThan(50);
  const pistas = pedidos.filter(p => /\.(webm|m4a)$/.test(p));
  expect(pedidos.some(p => p.endsWith('/musica.js'))).toBe(true);
  expect(pedidos.some(p => p.endsWith('/musica.json'))).toBe(true);
  expect(pistas).toHaveLength(1);
  expect(pistas[0]).toMatch(/^\/taps-musica\/[a-z-]+\.[0-9a-f]{8}\.(webm|m4a)$/);
  expect(await page.evaluate(() => [localStorage.getItem('gems-taps-sound'), localStorage.getItem('gems-taps-musica')]),
    'el defecto no se guarda: solo lo que decide la persona').toEqual([null, null]);

  // «Tu día»: todo encendido, música encendida; la voz (si el dispositivo tiene) apagada.
  await page.locator('.bar__brand').tap();
  await expect(todo(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'true');
  const voz = page.getByRole('button', { name: 'Voz del personaje' });
  if (await voz.count()) await expect(voz).toHaveAttribute('aria-pressed', 'false');

  // Solo la música: se apaga, se para y se recuerda.
  await musica(page).tap();
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => sonando(page)).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('gems-taps-musica'))).toBe('off');
  expect(await eventos(page)).toContain('taps/musica/off');
  await page.getByRole('button', { name: 'Seguir jugando' }).tap();

  // Recarga: la música sigue apagada; el primer gesto no la pide.
  pedidos.length = 0;
  await abrir(page);
  await opcion(page).tap();
  await page.waitForTimeout(2_000);
  expect(pedidos, 'apagada a propósito: no se pide nada de música').toEqual([]);
  await page.locator('.bar__brand').tap();
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'false');
  await musica(page).tap();                                        // encenderla de nuevo
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem('gems-taps-musica'))).toBe('on');
  expect(await eventos(page)).toContain('taps/musica/on');
  expect(errores).toEqual([]);
});

test('Humo · audio de Taps: el altavoz calla todo, se recuerda y «Todo el sonido» lo devuelve', async ({ page }) => {
  test.setTimeout(120_000);
  const errores = erroresDePagina(page);
  const pedidos: string[] = [];
  await preparar(page, pedidos);
  await abrir(page);
  await opcion(page).tap();
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);

  // En clase: un toque al altavoz y se calla todo (la música para con un fundido corto).
  await altavoz(page).tap();
  await expect(altavoz(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => sonando(page)).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('gems-taps-sound'))).toBe('off');
  expect(await eventos(page)).toContain('taps/sonido/off/barra');

  // Recarga: sigue en silencio; con el sonido apagado el gesto ni crea el audio ni pide la música.
  pedidos.length = 0;
  await abrir(page);
  await expect(altavoz(page)).toHaveAttribute('aria-pressed', 'false');
  await opcion(page).tap();
  await page.waitForTimeout(2_000);
  expect(pedidos).toEqual([]);
  expect(await efectos(page), 'en silencio no suena ningún efecto').toBe(0);

  // «Tu día»: en silencio la música se ve apagada (no suena), con el aviso. Tocarla la hace sonar: enciende el sonido
  // sin apagar la preferencia (antes la habría apagado).
  await page.locator('.bar__brand').tap();
  await expect(todo(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('El sonido está apagado.', { exact: false })).toBeVisible();
  await musica(page).tap();
  await expect(todo(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(musica(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
  expect(await page.evaluate(() => [localStorage.getItem('gems-taps-sound'), localStorage.getItem('gems-taps-musica')])).toEqual(['on', null]);
  expect(await eventos(page)).toContain('taps/musica/on');

  // «Todo el sonido» es el mismo silencio general: apaga y devuelve, con su evento.
  await todo(page).tap();
  await expect(todo(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => sonando(page)).toHaveLength(0);
  await todo(page).tap();
  await expect(todo(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
  expect(await eventos(page)).toEqual(expect.arrayContaining(['taps/sonido/off/dia', 'taps/sonido/on/dia']));
  await page.getByRole('button', { name: 'Seguir jugando' }).tap();
  await expect(altavoz(page)).toHaveAttribute('aria-pressed', 'true');
  expect(errores).toEqual([]);
});
