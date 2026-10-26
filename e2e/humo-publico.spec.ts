import { expect, test } from '@playwright/test';
import { apiFalsa, CURSOS, erroresDePagina, omitirSiPortadaAnterior, sinAnalitica, sinAudio, sinScrollHorizontal } from './humo-soporte';

/**
 * Humo · lo que ve un visitante sin cuenta: portada, ficha de curso, retos, bloques, Taps, legales, instituciones y 404.
 * No necesita backend (API falsa en e2e/humo-soporte.ts). Corre en Chromium y en iPhone (WebKit).
 * Uso: npx playwright test e2e/humo-publico.spec.ts
 */

// El service worker del build de producción pediría al API por su cuenta, sin pasar por la API falsa.
test.use({ serviceWorkers: 'block' });

let errores: string[] = [];

test.beforeEach(async ({ page }) => {
  errores = erroresDePagina(page);
  await sinAnalitica(page);
  await sinAudio(page);                                            // Taps suena tras el primer gesto: nada sale por los altavoces
});

test.afterEach(() => {
  expect(errores, 'errores de JavaScript sin atrapar').toEqual([]);
});

test.describe('Humo · visitante', () => {
  test('portada: se juega un Tap en el primer pantallazo y debajo están los cursos del catálogo', async ({ page, isMobile }) => {
    await apiFalsa(page);
    // Doble de count.js que anota cada conteo (manda sobre el de sinAnalitica: la última ruta registrada gana).
    await page.route(/gc\.zgo\.at\/count\.js/, r => r.fulfill({ contentType: 'text/javascript',
      body: 'window.__gc = []; window.goatcounter = { count: function (v) { window.__gc.push(v.path); } };' }));
    await page.goto('/');
    await omitirSiPortadaAnterior(page);
    await expect(page.locator('h1').first()).toBeVisible();
    // Un solo Tap, con su pregunta y sus opciones a la vista sin desplazarse (primer fotograma = juego).
    const tap = page.locator('gems-taps .tap.tap--active');
    await expect(page.locator('gems-taps .tap')).toHaveCount(1);
    await expect(tap.locator('.tap__q')).not.toBeEmpty();
    await expect(tap.locator('.tap__opt').first()).toBeInViewport();
    // Ya hidratado (el feed marca <html data-taps-live>), el toque cuenta una sola vez.
    await expect(page.locator('html[data-taps-live]')).toBeAttached({ timeout: 15_000 });
    await tap.locator('.tap__opt').first().click();
    await expect(tap.locator('.tap__opts.is-answered, .tap__steps i.is-ok, .tap__steps i.is-bad').first()).toBeAttached();
    await expect(page, 'jugar en la portada no cambia la URL').toHaveURL(/\/$/);
    // Analítica propia de la portada: no infla el embudo de /taps.
    await expect.poll(() => page.evaluate(() => ((window as unknown as { __gc?: string[] }).__gc ?? []).some(e => e.startsWith('portada/tap/primer-toque/')))).toBe(true);
    const eventos = await page.evaluate(() => (window as unknown as { __gc?: string[] }).__gc ?? []);
    expect(eventos.some(e => e.startsWith('portada/tap/ver/')), 'portada/tap/ver/<id>').toBe(true);
    expect(eventos.some(e => e.startsWith('portada/tap/responder/')), 'portada/tap/responder/<id>/1').toBe(true);
    expect(eventos.filter(e => /^taps[-/]/.test(e)), 'sin eventos taps-* ni taps/* desde la portada').toEqual([]);
    // La rueda sobre la pregunta y las opciones baja la página (no queda atrapada en la tarjeta).
    // El gesto sobre la pregunta y las opciones baja la página (no queda atrapado en la tarjeta). La regla que lo garantiza
    // (overscroll-behavior: auto en el panel) se revisa en todos los navegadores; la rueda, solo con ratón: WebKit móvil no
    // la simula (`mouse.wheel` no existe ahí) y Playwright no ofrece un deslizamiento táctil nativo.
    expect(await tap.locator('.tap__panel').evaluate(e => getComputedStyle(e).overscrollBehaviorY)).toBe('auto');
    if (!isMobile) {
      await tap.locator('.tap__q, .tap__card').first().hover();
      await page.mouse.wheel(0, 600);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
      await page.evaluate(() => scrollTo(0, 0));
    }
    // La voz no habla en la portada aunque se haya dejado encendida en /taps: solo si la activan aquí.
    // Y quien vuelve con racha (última visita hace 2 días) no recibe en la portada el saludo, la hoja «Tu día» ni la racha en
    // la barra: eso es de /taps; aquí la cabecera del sitio va justo encima y lo primero es jugar.
    await page.evaluate(() => {
      localStorage.setItem('gems-taps-voz', 'on');
      const dia = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
      localStorage.setItem('gems-taps-interes', JSON.stringify({ score: {}, blocked: {}, done: {}, days: [dia(3), dia(2)] }));
      localStorage.setItem('gems-taps-sesion', JSON.stringify({ ultima: Date.now() - 2 * 86_400_000, puntajes: {} }));
    });
    const musica: string[] = [];
    page.on('request', r => { if (/\/taps-musica\/|\/audio\/musica\.js/.test(r.url())) musica.push(new URL(r.url()).pathname); });
    // Fuentes de audio largas (música) que arrancan: ninguna antes de responder.
    await page.addInitScript(() => {
      const w = window as unknown as { __musicaFuentes: number };
      w.__musicaFuentes = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a: Parameters<typeof start>) {
        if ((this.buffer?.duration ?? 0) > 10) w.__musicaFuentes++;
        return start.apply(this, a);
      };
    });
    await page.reload();
    await page.waitForTimeout(4_000);                              // la voz se decide en reposo (requestIdleCallback, hasta 3 s)
    expect(await page.evaluate(() => (window as unknown as { __musicaFuentes: number }).__musicaFuentes), 'nada de música antes de responder').toBe(0);
    // El altavoz (silencio general) está y la voz no está activa. Sin exigir el estado del altavoz ni la ausencia del botón
    // de voz de antes: el workflow iphone.yml corre esta prueba contra producción, que puede ir una versión atrás.
    await expect(page.locator('gems-taps .bar__sound')).toBeVisible();
    await expect(page.locator('gems-taps .bar__voice[aria-pressed="true"]')).toHaveCount(0);
    // Responder (la partida guardada sigue en la pregunta siguiente): suenan los efectos y la música, pero no la voz.
    const opcion = page.locator('gems-taps .tap.tap--active .tap__opt:not([disabled])').first();
    await expect(opcion).toBeVisible();
    await opcion.click();
    await page.waitForTimeout(3_000);                              // respuesta y paso a la pregunta siguiente
    expect(await page.evaluate(() => (window as unknown as { __habla?: string[] }).__habla ?? []), 'la voz no habla en la portada').toEqual([]);
    // Antes la portada no tenía música; desde fix/taps-musica-primer-tap la tiene (misma preferencia que /taps) y se prueba
    // en humo-taps-musica.spec.ts. Aquí solo que no baje de más: como mucho la pista del Tap a la vista. Sin exigir que la
    // pida: iphone.yml corre esta prueba contra producción, que puede ir una versión atrás.
    expect(musica.filter(p => /\.(webm|m4a)$/.test(p)).length, 'la portada baja como mucho una pista').toBeLessThanOrEqual(1);
    expect(musica.filter(p => p.endsWith('/musica.js')).length, 'musica.js como mucho una vez').toBeLessThanOrEqual(1);
    expect(musica.filter(p => p.endsWith('/musica.json')).length, 'musica.json como mucho una vez').toBeLessThanOrEqual(1);
    await expect(page.locator('gems-taps .tap__toast')).toHaveCount(0);
    await expect(page.locator('gems-taps .bar__brand')).toBeHidden();
    await expect(page.locator('gems-tap-sesion-hoja')).toHaveCount(0);
    // Las demás puertas siguen ahí: temas, cursos gratis (del API) e instituciones. Retos y Quiz de Bloques salieron de la
    // portada por decisión del dueño (confundían); /retos y /bloques siguen vivos para los enlaces de los videos.
    await expect(page.locator('#temas a[href^="/taps"]').first()).toBeVisible();
    await expect(page.locator('a[href="/instituciones"]').first()).toBeAttached();
    await expect(page.locator('article.card')).toHaveCount(CURSOS.length);
    await expect(page.locator('article.card h3 a').first()).toHaveAttribute('href', /\/cursos\/\d+/);
    await sinScrollHorizontal(page);
  });

  test('portada: al terminar el Tap, «siguiente» sigue en el feed de Taps', async ({ page }) => {
    test.setTimeout(60_000);
    await apiFalsa(page);
    await page.goto('/');
    await omitirSiPortadaAnterior(page);
    const tap = page.locator('gems-taps .tap.tap--active');
    const primero = await tap.getAttribute('data-tap');
    // Ya hidratado (el feed marca <html data-taps-live>): cada toque cuenta una sola vez.
    await expect(page.locator('html[data-taps-live]')).toBeAttached({ timeout: 15_000 });
    // Responde, adelanta con «Seguir» y responde la siguiente, hasta ver el título.
    // «Seguir» puede irse solo (avance automático) justo al tocarlo: cada intento es corto y se tolera que desaparezca.
    for (let k = 0; k < 20 && !(await tap.locator('.res__title').count()); k++) {
      const objetivo = (await tap.locator('.tap__go').count()) ? tap.locator('.tap__go') : tap.locator('.tap__opt').first();
      await objetivo.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
    await expect(tap.locator('.res__title')).toBeVisible();
    await tap.locator('.res__next').click();
    await expect(page).toHaveURL(/\/taps\?t=/);
    await expect(page.locator('.tap.tap--active')).not.toHaveAttribute('data-tap', primero ?? '');
  });

  test('portada: la primera respuesta lleva sola a /taps, en ese mismo Tap y con lo jugado', async ({ page }) => {
    test.setTimeout(60_000);
    await apiFalsa(page);
    // Un navegador automatizado no salta salvo que se pida: aquí sí se pide.
    await page.addInitScript(() => { try { localStorage.setItem('gems-portada-salto', 'on'); } catch { /* sin almacenamiento */ } });
    await page.goto('/');
    await omitirSiPortadaAnterior(page);
    const tap = page.locator('gems-taps .tap.tap--active');
    const primero = await tap.getAttribute('data-tap');
    await expect(page.locator('html[data-taps-live]')).toBeAttached({ timeout: 15_000 });
    await tap.locator('.tap__opt').first().click();
    await expect(page, 'tras la primera respuesta pasa solo al feed').toHaveURL(/\/taps\?t=/, { timeout: 15_000 });
    await expect(page.locator('.tap.tap--active')).toHaveAttribute('data-tap', primero ?? '');
    // Una vez por pestaña: al volver a la portada se queda en ella.
    // (Se vuelve con el historial: recargar con /taps a medio cargar hace que WebKit anote como error sus descargas canceladas.)
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.locator('gems-taps .tap.tap--active .tap__opt').first().click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(4_000);
    await expect(page).toHaveURL(/\/$/);
  });

  test('portada con el API caído: no queda en blanco', async ({ page }) => {
    await apiFalsa(page, { caida: true });
    await page.goto('/');
    await omitirSiPortadaAnterior(page);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('gems-taps .tap__opt').first()).toBeEnabled();
    await expect(page.locator('#cursos lib-load-error').first()).toBeVisible({ timeout: 20_000 });
  });

  test('ficha del curso: título, temario y botón de empezar', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/cursos/1');
    await expect(page.locator('h1')).toHaveText(CURSOS[0].title);
    await expect(page.getByText('Primera lección').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Empezar (ahora|gratis)/ }).first()).toBeEnabled();
  });

  test('retos: responder muestra la explicación y deja seguir', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/retos');
    await expect(page.locator('h1')).toContainText('Los retos');
    await page.locator('.mock__opt').first().click();
    await expect(page.locator('.mock__why').first()).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente reto' }).click();
    await expect(page.locator('.mock__opt').first()).toBeEnabled();
  });

  test('retos: el enlace de un video (?r=) abre ese reto primero', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/retos?r=velas');
    await expect(page.locator('#reto-q')).toContainText('velas');
  });

  test('bloques: temas y responder', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/bloques');
    await expect(page.locator('h1')).toContainText('El quiz');
    await expect(page.locator('.rcats__chip').first()).toBeVisible();
    await page.locator('.mock__opt').first().click();
    await expect(page.locator('.mock__why').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comparte tu puntaje' })).toBeVisible();
  });

  test('taps: la primera pregunta se responde sin esperar al personaje', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/taps');
    // Selectores tolerantes a la ronda 1 de UX (section→article, explicación solo al fallar, .tap__next→.tap__go).
    const tap = page.locator('.tap.tap--active');
    await expect(tap.locator('.tap__q')).not.toBeEmpty();
    // /taps llega prerenderizado: un toque antes de hidratar puede perderse, así que se reintenta.
    await expect(async () => {
      await tap.locator('.tap__opt').first().click();
      await expect(tap.locator('.tap__opt[disabled], .tap__opt[aria-disabled="true"], .tap__opts.is-answered, .tap__steps i.is-ok, .tap__steps i.is-bad').first(),
        'tras responder, la pregunta queda contestada').toBeAttached({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
  });

  test('taps: un enlace compartido (/taps?t=<id>) abre ese Tap', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/taps');
    const id = await page.locator('.tap.tap--active').getAttribute('data-tap');
    const otro = await page.locator('.tap[data-tap]').nth(1).getAttribute('data-tap');
    expect(otro).not.toBe(id);
    await page.goto(`/taps?t=${otro}`);
    await expect(page.locator('.tap.tap--active')).toHaveAttribute('data-tap', otro!);
  });

  test('taps: al volver al día siguiente no repite el Tap de ayer y saluda', async ({ page }) => {
    await apiFalsa(page);
    // Ayer se completó el primer Tap del feed (reloj simulado: el mismo almacenamiento, 24 h después).
    const ayer = new Date(2026, 9, 19, 18, 0, 0);
    await page.clock.setFixedTime(new Date(ayer.getTime() + 24 * 3600_000));
    await page.addInitScript(t => {
      const d = new Date(t), p = (n: number) => String(n).padStart(2, '0');
      localStorage.setItem('gems-taps-interes', JSON.stringify({ score: { minecraft: 3 }, blocked: {}, done: { 'mc-gancho': t },
        days: [`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`] }));
      localStorage.setItem('gems-taps-sesion', JSON.stringify({ ultima: t, celebrada: null, puntajes: { 'mc-gancho': 4 } }));
    }, ayer.getTime());
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    await expect(page.locator('.tap.tap--active')).not.toHaveAttribute('data-tap', 'mc-gancho');
    await expect(page.locator('.tap.tap--active .tap__toast')).toContainText('¡Volviste! Racha de 1 día');
  });

  test('la portada prerenderizada no trae horneado el catálogo (ni su error)', async ({ request }) => {
    // Regresión de #27 corregida en #34: el prerender no pide el catálogo al API; el HTML trae el esqueleto, nunca el error ni cursos del build.
    const html = await (await request.get('/')).text();
    expect(html).not.toMatch(/No pudimos cargar|lib-load-error|<article[^>]*class="card["\s]/);
  });

  for (const [ruta, titulo] of [
    ['/terminos', 'Términos de uso'],
    ['/privacidad', 'Política de tratamiento de datos personales'],
    ['/instituciones', 'Tu propio espacio para enseñar'],
    ['/correo/preferencias', 'Tus correos de GEMS'],
  ] as const) {
    test(`página ${ruta} abre con su título`, async ({ page }) => {
      await apiFalsa(page);
      await page.goto(ruta);
      await expect(page.locator('h1').first()).toContainText(titulo);
      await sinScrollHorizontal(page);
    });
  }

  test('instituciones: la solicitud se envía al API', async ({ page }) => {
    const api = await apiFalsa(page);
    await page.goto('/instituciones');
    // Página prerenderizada: lo escrito antes de hidratar no llega al formulario de Angular. Se espera a que cargue todo.
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="inst"]').fill('Colegio de Prueba');
    await page.locator('input[name="contact"]').fill('Persona de Prueba');
    await page.locator('input[name="email"]').fill('contacto@prueba.test');
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect.poll(() => api.veces(/^\/public\/institution-requests$/, 'POST')).toBe(1);
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toHaveCount(0);
  });

  test('verificar certificado: un código que no existe se informa, sin romper la página', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/certificates/verify/CODIGO-INEXISTENTE');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page).toHaveURL(/\/certificates\/verify\/CODIGO-INEXISTENTE/);
  });

  test('una ruta desconocida lleva a «no encontrada» con una salida', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/esta-ruta-no-existe');
    await expect(page).toHaveURL(/\/not-found$/);
    await expect(page.locator('#not-found-title')).toBeVisible();
    // Sin sesión, «Volver al inicio» lleva a iniciar sesión (homePath del 404).
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', /^\/(auth\/signin)?$/);
  });
});
