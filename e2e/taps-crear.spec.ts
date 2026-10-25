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
