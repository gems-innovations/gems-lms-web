import { expect, test } from '@playwright/test';
import { erroresDePagina, sinAnalitica, sinAudio, sinScrollHorizontal } from './humo-soporte';

/**
 * /crear (PR-6 del plan de producto/taps/disenador-plan-ux.md): el diseñador de personajes dentro de la web. Comprueba que
 * carga sin errores, que «Publicar (con cuenta)» se ve desde el inicio, que la cinta de transparencia sale una vez y que
 * crear → guardar → recargar conserva el personaje con las mismas claves de localStorage del prototipo (taps.disenador.*).
 * La analítica se mide contra un doble de count.js: cada evento `taps/disenador/*` sale UNA vez y los hitos `taps/crear/*`
 * también. Ligera: no exige WebGL ni audio (el diseñador es canvas 2D).
 *
 * Uso: npx playwright test e2e/taps-crear.spec.ts  (con E2E_ESTATICO=1 contra el build estático)
 */
test.use({ serviceWorkers: 'block' });

let errores: string[] = [];
test.beforeEach(async ({ page }) => {
  errores = erroresDePagina(page);
  await sinAnalitica(page);
  await sinAudio(page);
  // Doble de count.js que anota cada conteo (manda sobre el de sinAnalitica: la última ruta registrada gana).
  await page.route(/gc\.zgo\.at\/count\.js/, r => r.fulfill({ contentType: 'text/javascript',
    body: 'window.__gc = []; window.goatcounter = { count: function (v) { window.__gc.push(v.path); } };' }));
});
test.afterEach(() => { expect(errores, 'errores de JavaScript sin atrapar').toEqual([]); });

const eventos = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __gc?: string[] }).__gc ?? []);

test.describe('/crear', () => {
  test('abre con el diseñador, «Publicar (con cuenta)» visible y la cinta de transparencia una sola vez', async ({ page }) => {
    await page.goto('/crear');
    await expect(page).toHaveTitle(/Crea tu personaje/);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex');
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#presets .tarjeta').first()).toBeVisible();
    await expect(dsn.locator('#progreso li').last().locator('button#publicar')).toHaveText('Publicar (con cuenta)');
    const cinta = dsn.locator('#ranuraVista .cinta[role="region"]');
    await expect(cinta).toBeVisible();
    await expect(cinta).toContainText('sin cuenta');
    await cinta.getByRole('button', { name: 'Entendido' }).click();
    await expect(cinta).toBeHidden();
    await sinScrollHorizontal(page);
    // «Publicar» aún no publica: lo dice, sin modal.
    await dsn.locator('#publicar').click();
    await expect(dsn.locator('.cinta--pronto')).toBeVisible();
    await expect(dsn.locator('.cinta--pronto')).toContainText('todavía no está listo');
    // Al recargar, la cinta ya no sale.
    await page.reload();
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#ranuraVista .cinta[role="region"]')).toBeHidden();
  });

  test('crear → guardar → recargar conserva el look (claves taps.disenador.*) y mide una sola vez', async ({ page }) => {
    await page.goto('/crear');
    await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await dsn.locator('#presets .tarjeta[data-id="arqueologa"]').click();
    await dsn.locator('#siguiente').click();                       // ajustar
    await dsn.locator('#siguiente').click();                       // escenario
    await dsn.locator('#siguiente').click();                       // listo
    await dsn.locator('#nombre').fill('Inés de prueba');
    await dsn.locator('#guardar').click();
    await expect(dsn.locator('#estadoGuardado')).toContainText('está en Mis looks');
    await expect(dsn.locator('#listaLooks .look')).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem('taps.disenador.looks')), 'misma clave de looks que el prototipo').toContain('arqueologa');
    // El borrador se autoguarda con ~1 s de espera.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('taps.disenador.borrador') ?? ''), { timeout: 5_000 }).toContain('arqueologa');
    // Medición: cada evento del diseñador una vez (sin doble envío) y los hitos de /crear.
    const antes = await eventos(page);
    expect(antes.filter(e => e === 'taps/disenador/preset/arqueologa')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/disenador/listo')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/crear/creo')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/crear/personaje-listo')).toHaveLength(1);
    expect(antes.filter(e => e.startsWith('taps/crear/abrir/'))).toEqual(['taps/crear/abrir/directo']);
    // Al volver: «Seguir donde ibas» con el borrador y «Mis looks» con el look guardado.
    await page.reload();
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#continuar')).toBeVisible();
    await dsn.locator('#continuarSi').click();
    await expect(dsn.locator('#listaLooks .look b')).toHaveText('Inés de prueba');
    expect((await eventos(page)).filter(e => e.startsWith('taps/crear/abrir/'))).toEqual(['taps/crear/abrir/continuar']);
  });
});

/**
 * Puntos de entrada (PR-7, §A.2): cada uno lleva a /crear con su `?desde=` y /crear cuenta esa llegada. El feed solo gana un
 * elemento discreto en su menú y, 1 de cada 5 resultados, un enlace en el resultado (descartable).
 */
test.describe('entradas a /crear', () => {
  test('portada: tarjeta en «Lleva los Taps a tu grupo» (prerenderizada) y /crear cuenta abrir/portada', async ({ page }) => {
    await page.goto('/');
    const tarjeta = page.locator('a.band__crear');
    await expect(tarjeta).toHaveAttribute('href', '/crear?desde=portada');
    await expect(tarjeta).toContainText('Crea tu personaje y tu Tap');
    await expect(tarjeta).toContainText('Publicar es para docentes e instituciones');
    // No se promueve en la zona de estudiante ni en /learn: la tarjeta vive solo en la portada.
    await page.goto('/crear?desde=portada');
    await expect(page.locator('gems-tap-disenador .dsn #lienzo')).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await eventos(page)).filter(e => e.startsWith('taps/crear/abrir/'))).toEqual(['taps/crear/abrir/portada']);
    expect(await page.locator('meta[name="robots"]').getAttribute('content'), '/crear sigue noindex').toBe('noindex');
  });

  test('/instituciones: «Probar el creador» con desde=instituciones', async ({ page }) => {
    await page.goto('/instituciones');
    const boton = page.getByRole('link', { name: 'Probar el creador' });
    await expect(boton).toHaveAttribute('href', '/crear?desde=instituciones');
    await expect(page.locator('.perks')).toContainText('Taps con tu mascota y tus colores');
  });

  test('feed en escritorio: «Haz tu personaje» en el menú lateral y en el menú «Más» del riel, con desde=feed', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto('/taps');
    await expect(page.locator('html[data-taps-live]')).toBeAttached({ timeout: 15_000 });
    const lateral = page.locator('gems-taps-menu .side a[href^="/crear"]');
    await expect(lateral).toHaveAttribute('href', '/crear?desde=feed');
    await expect(lateral).toContainText('Haz tu personaje');
    await page.locator('gems-tap-rail.riel-escritorio button[aria-label="Más opciones"]').click();
    await page.locator('gems-tap-rail.riel-escritorio .rail__menu').getByRole('button', { name: 'Haz tu personaje' }).click();
    await expect(page).toHaveURL(/\/crear\?desde=feed$/);
  });

  test('feed en celular: el menú «Más» lleva a /crear y el resultado ofrece «Haz tu personaje» solo en el 5.º resultado', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    // Cuatro resultados vistos en este navegador: el siguiente es el 5.º.
    await page.addInitScript(() => { try { if (!localStorage.getItem('taps.crear.entrada-resultado')) localStorage.setItem('taps.crear.entrada-resultado', '{"n":4,"descartado":false}'); } catch { /* sin almacenamiento */ } });
    await page.goto('/taps');
    await expect(page.locator('html[data-taps-live]')).toBeAttached({ timeout: 15_000 });
    const tap = page.locator('.tap.tap--active');
    await tap.locator('gems-tap-rail button[aria-label="Más opciones"]').click();
    const item = tap.locator('gems-tap-rail .rail__menu--movil').getByRole('button', { name: 'Haz tu personaje' });
    await expect(item).toBeVisible();
    await page.keyboard.press('Escape');
    // Juega el Tap hasta el resultado respondiendo la opción CORRECTA (data-ans del bloque de opciones): así hay ≥ 1 acierto y
    // la regla «nunca tras 0 aciertos» no esconde la fila. «Seguir» puede irse solo (avance automático): cada intento es corto.
    for (let k = 0; k < 20 && !(await tap.locator('.res__title').count()); k++) {
      if (await tap.locator('.tap__go').count()) { await tap.locator('.tap__go').click({ timeout: 1_500 }).catch(() => undefined); }
      else {
        const opts = tap.locator('.tap__opts');
        const ans = Number(await opts.getAttribute('data-ans').catch(() => null));
        const objetivo = Number.isFinite(ans) ? tap.locator('.tap__opt').nth(ans) : tap.locator('.tap__opt').first();
        await objetivo.click({ timeout: 1_500 }).catch(() => undefined);
      }
      await page.waitForTimeout(400);
    }
    await expect(tap.locator('.res__title')).toBeVisible();
    const aciertos = Number((await tap.locator('.res__score').textContent())?.match(/^(\d+)/)?.[1] ?? '0');
    expect(aciertos, 'se respondió la opción correcta: hay al menos 1 acierto').toBeGreaterThan(0);
    const enlace = tap.locator('.res__crear a');
    await expect(enlace).toHaveAttribute('href', '/crear?desde=feed');
    // La fila es compacta: «Siguiente» sigue dentro de la pantalla (zona del pulgar) también en un celular de 667 px de alto.
    const next = await tap.locator('.res__next').boundingBox();
    expect(next && next.y + next.height <= 844, '«Siguiente» no se sale de la pantalla').toBeTruthy();
    expect(await eventos(page)).toContain('taps/crear/entrada/resultado/mostrado');
    await tap.locator('.res__crear-x').click();
    await expect(tap.locator('.res__crear')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('taps.crear.entrada-resultado'))).toContain('"descartado":true');
    expect(await eventos(page)).toContain('taps/crear/entrada/resultado/descartado');
  });
});
