import { expect, Page, test } from '@playwright/test';
import { apiFalsa, erroresDePagina } from './humo-soporte';

/**
 * Humo · audio de Taps (taps-sonido.service.ts, taps-musica.service.ts y taps-engine/audio), en celular:
 * - por defecto (sin preferencia) el sonido y la música están encendidos y la voz apagada; sin aviso «Toca para sonido»;
 * - antes del primer gesto no suena nada (política de autoplay), pero la pista del primer Tap se precarga y decodifica en
 *   reposo; el primer toque en una respuesta arranca la música en el acto (una sola pista en bucle) y el efecto;
 * - en la portada también hay música desde la primera respuesta y, al pasar a /taps, sigue sin cortes (mismo AudioContext);
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
interface IFuente { duracion: number; bucle: boolean; parada: boolean; t: number }
declare global { interface Window { __gc?: IHit[]; __fuentes?: IFuente[]; __habla?: string[]; __decodificadas?: number; __toque?: number } }

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
      const f = { duracion: this.buffer?.duration ?? 0, bucle: this.loop, parada: false, t: performance.now() };
      vistas.set(this, f); window.__fuentes!.push(f);
      return start.apply(this, a);
    };
    AudioBufferSourceNode.prototype.stop = function (...a: Parameters<typeof stop>) {
      const f = vistas.get(this); if (f) f.parada = true;
      return stop.apply(this, a);
    };
    // Pistas de música decodificadas (> 100 kB): para saber cuándo la precarga quedó lista sin esperar a ciegas.
    window.__decodificadas = 0;
    addEventListener('pointerup', () => { window.__toque ??= performance.now(); }, { capture: true });   // el primer toque
    const decodificar = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function (datos: ArrayBuffer, ...resto: unknown[]) {
      const grande = datos.byteLength > 100_000;
      const pr = (decodificar as (...a: unknown[]) => Promise<AudioBuffer>).call(this, datos, ...resto);
      pr.then(() => { if (grande) window.__decodificadas!++; }, () => undefined);
      return pr;
    } as typeof decodificar;
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

  // Al entrar: altavoz encendido, sin aviso. Antes del primer gesto la pista del primer Tap se precarga en reposo (una sola,
  // para que el primer toque ya tenga música), pero no arranca ninguna fuente: nada suena sin gesto.
  // (Antes de fix/taps-musica-primer-tap no se pedía nada hasta el gesto y la música llegaba 3-5 s tarde.)
  await expect(altavoz(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.bar__tip')).toHaveCount(0);
  await expect(page.getByText(/para sonido/)).toHaveCount(0);
  await expect.poll(() => pedidos.filter(p => /\.(webm|m4a)$/.test(p)).length, { timeout: 15_000 }).toBe(1);
  // Que termine de decodificar (fuera del hilo principal; con escenarios WebGL por software puede tardar varios segundos).
  await expect.poll(() => page.evaluate(() => window.__decodificadas ?? 0), { timeout: 30_000 }).toBe(1);
  expect(await page.evaluate(() => (window.__fuentes ?? []).length), 'antes del primer gesto no arranca ninguna fuente').toBe(0);

  // Primer gesto real: responder. Suena el efecto de la respuesta (uno, como mucho dos: nunca una ráfaga de lo acumulado)
  // y entra UNA pista en bucle casi en el acto (ya estaba decodificada: solo se reanuda el audio).
  await opcion(page).tap();
  // Los efectos se miden a los 400 ms del toque (antes de que pase nada más): uno, como mucho dos; nunca una ráfaga.
  await page.waitForTimeout(400);
  const alToque = await efectos(page);
  expect(alToque, 'suena el efecto de la respuesta').toBeGreaterThan(0);
  expect(alToque, 'el primer toque no suelta una ráfaga de efectos').toBeLessThanOrEqual(2);
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
  const [fuente] = await sonando(page);
  expect(fuente.bucle).toBe(true);
  expect(fuente.duracion).toBeGreaterThan(50);
  // Holgado para CI (escenarios WebGL por software); en un equipo normal arranca en < 300 ms.
  expect(fuente.t - (await page.evaluate(() => window.__toque ?? 0)), 'la música precargada arranca casi con el primer toque').toBeLessThan(1_500);
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

test('Humo · audio de Taps: en la portada la música entra con la primera respuesta y sigue sin cortes al pasar a /taps', async ({ page }) => {
  test.setTimeout(120_000);
  const errores = erroresDePagina(page);
  const pedidos: string[] = [];
  await preparar(page, pedidos);
  // Cuántos AudioContext se crean: al pasar a /taps el feed nuevo sigue con el mismo (no crea otro ni reinicia la música).
  await page.addInitScript(() => {
    const w = window as unknown as { AudioContext: typeof AudioContext; __contextos: number };
    const C = w.AudioContext;
    w.__contextos = 0;
    w.AudioContext = class extends C { constructor(o?: AudioContextOptions) { super(o); w.__contextos++; } };
  });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  const tap = page.locator('gems-taps .tap.tap--active');
  // En reposo se precarga la pista del Tap de la portada; nada suena antes de responder.
  await expect.poll(() => pedidos.filter(p => /\.(webm|m4a)$/.test(p)).length, { timeout: 15_000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__decodificadas ?? 0), { timeout: 30_000 }).toBe(1);
  expect(await page.evaluate(() => (window.__fuentes ?? []).length), 'nada suena antes de responder').toBe(0);

  // Primera respuesta: entra la música (una pista en bucle), igual que en /taps.
  await tap.locator('.tap__opt').first().tap();
  await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
  const [fuente] = await sonando(page);
  expect(fuente.bucle).toBe(true);
  expect(fuente.t - (await page.evaluate(() => window.__toque ?? 0)), 'la música precargada arranca casi con la primera respuesta').toBeLessThan(1_500);
  expect(await page.evaluate(() => window.__habla ?? []), 'la voz sigue apagada en la portada').toEqual([]);

  // Termina el Tap y «Siguiente» lleva a /taps: la música no se corta (mismo AudioContext, el módulo no se vuelve a pedir).
  for (let k = 0; k < 30 && !(await tap.locator('.res__title').count()); k++) {
    const objetivo = (await tap.locator('.tap__go').count()) ? tap.locator('.tap__go') : tap.locator('.tap__opt:not([disabled])').first();
    await objetivo.click({ timeout: 1_500 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await expect(tap.locator('.res__title')).toBeVisible();
  await expect.poll(() => sonando(page), { timeout: 10_000 }).not.toHaveLength(0);
  await tap.locator('.res__next').click();
  await expect(page).toHaveURL(/\/taps/);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => (window as unknown as { __contextos: number }).__contextos), 'un solo AudioContext en toda la visita').toBe(1);
  await expect.poll(() => sonando(page), { timeout: 10_000 }).toHaveLength(1);
  expect(pedidos.filter(p => p.endsWith('/musica.js')), 'el reproductor no se vuelve a cargar').toHaveLength(1);
  expect(errores).toEqual([]);
});

/**
 * WebKit (Safari y todo navegador en iOS) no pone en fila suspend() y resume(): si el contexto creado de antemano (con la
 * intención, en el pointerdown del primer toque) aún no se suspendió cuando el gesto lo reanuda, el resume() se cumple en el
 * acto y el suspend() llega después y lo deja dormido. Antes: sin música tras la primera respuesta hasta tocar otra cosa
 * (el trofeo). Aquí se imita ese orden en Chromium.
 */
for (const ruta of ['/taps', '/']) {
  test(`Humo · audio de Taps: con el orden de WebKit la música suena tras la primera respuesta, sin más toques (${ruta})`, async ({ page }) => {
    test.setTimeout(90_000);
    const errores = erroresDePagina(page);
    const pedidos: string[] = [];
    await preparar(page, pedidos);
    await page.addInitScript(() => {
      const w = window as unknown as { __ctx: AudioContext[]; __tarde: string[] };
      w.__ctx = []; w.__tarde = [];
      const P = AudioContext.prototype, suspend = P.suspend, resume = P.resume;
      const anotar = (c: AudioContext) => { if (!w.__ctx.includes(c)) w.__ctx.push(c); };
      // El suspend() de un contexto en marcha queda pendiente y se aplica justo después del primer resume() (o a los 3 s):
      // el peor caso de WebKit, sin depender de cuánto tarde el toque.
      const pendientes = new Map<AudioContext, () => void>();
      P.suspend = function (this: AudioContext) {
        anotar(this);
        if (this.state !== 'running') return suspend.call(this);
        return new Promise<void>(ok => {
          const aplicar = () => { if (pendientes.get(this) !== aplicar) return; pendientes.delete(this); w.__tarde.push('suspend'); suspend.call(this).then(ok, ok); };
          pendientes.set(this, aplicar);
          setTimeout(aplicar, 3_000);
        });
      };
      P.resume = function (this: AudioContext) {
        anotar(this); w.__tarde.push('resume');
        const r = resume.call(this), aplicar = pendientes.get(this);
        if (aplicar) setTimeout(aplicar, 50);
        return r;
      };
    });
    await page.goto(ruta);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    // Respuesta rápida: la pista ya se pidió, pero la intención (y el contexto previo) llega con el pointerdown de este toque.
    await expect.poll(() => pedidos.filter(p => /\.(webm|m4a)$/.test(p)).length, { timeout: 15_000 }).toBe(1);
    expect(await page.evaluate(() => (window.__fuentes ?? []).length), 'nada suena antes de responder').toBe(0);
    await page.locator('gems-taps .tap.tap--active .tap__opt').first().tap();
    await expect.poll(() => sonando(page), { timeout: 30_000 }).toHaveLength(1);
    const orden = await page.evaluate(() => (window as unknown as { __tarde: string[] }).__tarde.join(','));
    expect(orden, 'el suspend() del contexto previo llegó después del resume() del gesto').toMatch(/resume.*suspend/);
    // Sin tocar nada más: el contexto queda en marcha (antes se quedaba «suspended» hasta el trofeo).
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ctx: AudioContext[] }).__ctx.map(c => c.state).join(',')),
      { timeout: 5_000 }).toBe('running');
    expect(errores).toEqual([]);
  });
}
