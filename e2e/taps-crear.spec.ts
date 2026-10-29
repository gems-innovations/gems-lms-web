import AxeBuilder from '@axe-core/playwright';
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
    // Marco de marca: el logo existente de GEMS LMS y «Volver» (sin ?desde=, a la portada), con los tokens del sitio.
    const marca = page.locator('gems-tap-disenador header.marca');
    await expect(marca.locator('a.marca__logo img')).toHaveAttribute('src', '/logo-144.png');
    await expect(marca.getByRole('link', { name: 'GEMS LMS, inicio' })).toHaveAttribute('href', '/');
    await expect(marca.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('gems-tap-disenador .dsn')!).fontFamily)).toContain('Plus Jakarta Sans');
    const cinta = dsn.locator('#ranuraVista .cinta[role="region"]');
    await expect(cinta).toBeVisible();
    await expect(cinta).toContainText('sin cuenta');
    await cinta.getByRole('button', { name: 'Entendido' }).click();
    await expect(cinta).toBeHidden();
    await sinScrollHorizontal(page);
    // «Publicar» abre la hoja del gancho (PR-8) y «Volver» la cierra sin cambiar nada.
    await dsn.locator('#publicar').click();
    const hoja = page.locator('gems-tap-disenador .gancho');
    await expect(hoja).toBeVisible();
    await expect(hoja).toContainText('regístrate como docente o institución');
    await hoja.getByRole('button', { name: 'Volver y seguir creando' }).click();
    await expect(hoja).toBeHidden();
    // Al recargar, la cinta ya no sale.
    await page.reload();
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#ranuraVista .cinta[role="region"]')).toBeHidden();
  });

  test('en celular (375×844) la cabecera de marca no saca de pantalla la vista previa ni «Siguiente»', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto('/crear?desde=feed');
    await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    const marca = await page.locator('gems-tap-disenador header.marca').boundingBox();
    const vista = await dsn.locator('#vista').boundingBox();
    const siguiente = await dsn.locator('#siguiente').boundingBox();
    expect(marca && marca.height <= 64, 'la cabecera es compacta').toBeTruthy();
    expect(vista && vista.y >= (marca?.height ?? 0) && vista.y + vista.height <= 844, 'la vista previa entera dentro de la pantalla').toBeTruthy();
    expect(siguiente && siguiente.y + siguiente.height <= 844, '«Siguiente» dentro de la pantalla').toBeTruthy();
    await expect(page.locator('gems-tap-disenador header.marca').getByRole('link', { name: 'Volver a Taps' })).toBeVisible();
    await sinScrollHorizontal(page);
  });

  test('crear → guardar → recargar conserva el look (claves taps.disenador.*) y mide una sola vez', async ({ page }) => {
    await page.goto('/crear');
    await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await dsn.locator('#presets .tarjeta[data-id="arqueologa"]').click();
    await expect(dsn.locator('h1')).toHaveText('Elige quién eres');
    await dsn.locator('#siguiente').click();                       // ajustar
    // PR-D3: título por paso, pestañas accesibles (tablist + flechas), Ropa en tres subgrupos con la prenda primero, miniaturas
    // en los chips de pieza y muestras con nombre de color (no el #hex).
    await expect(dsn.locator('h1')).toHaveText('Hazlo tuyo');
    await expect(dsn.locator('#siguiente')).toHaveText('Ponlo en su mundo');
    const pestanas = dsn.locator('#pestanas');
    await expect(pestanas).toHaveAttribute('role', 'tablist');
    await expect(pestanas.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute('data-id', 'cara');
    await expect(dsn.locator('#ajustes .muestra').first()).toHaveAttribute('aria-label', /^[A-ZÁÉÍÓÚ][a-záéíóúñ ]+$/);
    await pestanas.locator('[data-id="cara"]').focus(); await page.keyboard.press('ArrowRight');
    await expect(pestanas.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute('data-id', 'pelo');
    await expect(dsn.locator('#ajustes .chip canvas.mini').first()).toBeVisible();
    await pestanas.locator('[data-id="ropa"]').click();
    await expect(dsn.locator('#ajustes details.subgrupo')).toHaveCount(3);
    await expect(dsn.locator('#ajustes details.subgrupo').first()).toHaveAttribute('open', '');
    await expect(dsn.locator('#ajustes details.subgrupo').nth(1)).not.toHaveAttribute('open', '');
    await dsn.locator('#ajustes details.subgrupo[data-id="sombrero"] summary').click();
    await dsn.locator('#ajustes .chip[data-campo="hat"][data-v="copa"]').click();
    await expect(dsn.locator('#ajustes .grupo h3', { hasText: 'Color del sombrero' })).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-v')), 'el foco sigue en el chip tras reconstruir Ropa').toBe('copa');
    await expect(dsn.locator('#inversion i.on')).toHaveCount(1);
    await dsn.locator('#siguiente').click();                       // escenario
    await expect(dsn.locator('h1')).toHaveText('Dónde vive');
    await expect(dsn.locator('#siguiente')).toHaveText('Terminar');
    // PR-D5: el panel que entra lleva la clase de transición y el h1 se funde (clases, no tiempos: la animación es CSS).
    await expect(dsn.locator('.pantalla.activa[data-p="2"]')).toHaveClass(/entra/);
    await expect(dsn.locator('h1')).toHaveClass(/funde/);
    // Tocar un escenario distinto lanza la miniatura hacia la vista (canvas.vuelo) y se quita sola en < 1 s.
    await dsn.locator('#escenas .tarjeta[data-id="foro-roma"]').click();
    await expect(dsn.locator('#escenas .tarjeta[data-id="foro-roma"]')).toHaveClass(/on/);
    await expect(dsn.locator('canvas.vuelo')).toHaveCount(0, { timeout: 2_000 });
    // PR-D8: ocho escenarios (tres nuevos) y el selector de hora con iconos dibujados; de día por defecto, la noche se marca y se cuenta.
    await expect(dsn.locator('#escenas .tarjeta')).toHaveCount(8);
    await expect(dsn.locator('#escenas .tarjeta[data-id="biblioteca"]')).toBeVisible();
    await expect(dsn.locator('#horas .chip')).toHaveCount(3);
    await expect(dsn.locator('#horas .chip[data-id="dia"]')).toHaveAttribute('aria-pressed', 'true');
    await dsn.locator('#horas .chip[data-id="noche"]').click();
    await expect(dsn.locator('#horas .chip[data-id="noche"]')).toHaveClass(/on/);
    await expect(dsn.locator('#horas .chip[data-id="dia"]')).toHaveAttribute('aria-pressed', 'false');
    await dsn.locator('#siguiente').click();                       // listo
    await expect(dsn.locator('h1')).toHaveText('Lo hiciste');
    await expect(dsn.locator('#json')).toBeHidden();
    await expect(dsn.locator('#masDetalles')).not.toContainText('JSON');
    await dsn.locator('#nombre').fill('Inés de prueba');
    // PR-D6: el personaje aparece dentro de un marco 9:16 y se juega con dos preguntas de verdad del banco (acierto/fallo, veredicto, resultado).
    await expect(dsn.locator('#tapMini')).toBeVisible();
    await dsn.locator('#lema').fill('Hoy aprendemos algo nuevo');
    await expect(dsn.locator('#restanLema')).toHaveText('25/40');
    await expect(dsn.locator('#probar')).toHaveText(/Probar con dos preguntas/);
    await dsn.locator('#probar').click();
    await expect(dsn.locator('#enunciado')).toContainText('1 de 2:');
    await expect(dsn.locator('#opciones button[data-i]')).toHaveCount(4);
    await dsn.locator('#opciones button[data-i="0"]').click();
    await expect(dsn.locator('#veredicto')).toHaveText(/Acertaste\.|Era «/);
    await expect(dsn.locator('#opciones button[data-i="0"]')).toBeDisabled();
    await dsn.locator('#opciones button.siguiente', { hasText: 'Siguiente pregunta' }).click();
    await expect(dsn.locator('#enunciado')).toContainText('2 de 2:');
    await dsn.locator('#opciones button[data-i="1"]').click();
    await dsn.locator('#opciones button.siguiente', { hasText: 'Ver el resultado' }).click();
    await expect(dsn.locator('#veredicto')).toHaveText(/^[0-2] de 2\. Así termina un Tap/);
    await expect(dsn.locator('#opciones button', { hasText: 'Jugar otra vez' })).toBeVisible();
    await dsn.locator('#guardar').click();
    await expect(dsn.locator('#estadoGuardado')).toContainText('está en Mis looks');
    await expect(dsn.locator('#listaLooks .look')).toHaveCount(1);
    await expect(dsn.locator('.vista .chispa'), 'PR-D5: el confeti va en el canvas, no en DOM').toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('taps.disenador.looks')), 'misma clave de looks que el prototipo').toContain('arqueologa');
    expect(await page.evaluate(() => localStorage.getItem('taps.disenador.looks')), 'PR-D6: el lema se guarda con el look').toContain('Hoy aprendemos algo nuevo');
    // El borrador se autoguarda con ~1 s de espera.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('taps.disenador.borrador') ?? ''), { timeout: 5_000 }).toContain('arqueologa');
    expect(await page.evaluate(() => localStorage.getItem('taps.disenador.borrador'))).toContain('Hoy aprendemos algo nuevo');
    // PR-D6: el enlace para compartir es v2 y lleva el lema en `m`; un enlace v1 (sin `m`) sigue abriéndose (compartir.test.mjs).
    await page.evaluate(() => { (window as unknown as { __enlace?: string }).__enlace = ''; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => { (window as unknown as { __enlace?: string }).__enlace = t; } }, configurable: true }); });
    await dsn.locator('#copiarEnlace').click();
    await expect(dsn.locator('#compartir')).toContainText('Enlace copiado');
    const enlace = await page.evaluate(() => (window as unknown as { __enlace?: string }).__enlace ?? '');
    expect(enlace).toContain('#look=');
    const compacto = JSON.parse(Buffer.from(enlace.split('#look=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as Record<string, unknown>;
    expect(compacto['v']).toBe(2); expect(compacto['m']).toBe('Hoy aprendemos algo nuevo');
    expect(compacto['h'], 'PR-D8: la hora elegida (noche) viaja en el enlace').toBe('noche');
    expect(compacto['n']).toBeUndefined();   // guardar vacía el campo del nombre (comportamiento previo); el lema se queda
    // Medición: cada evento del diseñador una vez (sin doble envío) y los hitos de /crear.
    const antes = await eventos(page);
    expect(antes.filter(e => e === 'taps/disenador/preset/arqueologa')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/disenador/listo')).toHaveLength(1);
    // PR-D4: la cámara acercó a Pelo (flecha) y a Ropa (clic), una vez cada una.
    expect(antes.filter(e => e === 'taps/disenador/encuadre/pelo')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/disenador/encuadre/ropa')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/crear/creo')).toHaveLength(1);
    expect(antes.filter(e => e === 'taps/crear/personaje-listo')).toHaveLength(1);
    expect(antes.filter(e => e.startsWith('taps/crear/abrir/'))).toEqual(['taps/crear/abrir/directo']);
    // Al volver: «Seguir donde ibas» con el borrador y «Mis looks» con el look guardado.
    await page.reload();
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#continuar')).toBeVisible();
    await dsn.locator('#continuarSi').click();
    await expect(dsn.locator('#listaLooks .look b')).toHaveText('Inés de prueba');
    await expect(dsn.locator('#lema'), 'PR-D6: el lema vuelve con el borrador').toHaveValue('Hoy aprendemos algo nuevo');
    expect((await eventos(page)).filter(e => e.startsWith('taps/crear/abrir/'))).toEqual(['taps/crear/abrir/continuar']);
  });
});

/**
 * Gancho de «Publicar» (PR-8, §A.3.2 y §A.3.3): hoja inferior accesible con tres salidas. «Soy docente o institución» lleva al
 * formulario de /instituciones con `?borrador=<id>`; el formulario muestra «Tu personaje irá adjunto» con la miniatura guardada y
 * manda el borrador compacto como string en el campo `draft`, con `message` intacto (PR-9b; la red se intercepta: ninguna solicitud sale de verdad). «Soy estudiante» solo
 * ofrece copiar el enlace del look. Los eventos del embudo salen una vez y nunca llevan el look.
 */
test.describe('gancho de publicar', () => {
  const CAPTURAS = process.env.E2E_CAPTURAS;
  const capturar = async (page: import('@playwright/test').Page, nombre: string) => { if (CAPTURAS) { await page.waitForTimeout(700); await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` }); } };

  for (const [ancho, alto] of [[390, 844], [390, 667], [1366, 800]] as const) {
    test(`/crear → Publicar → hoja → docente → formulario con borrador adjunto (${ancho}x${alto})`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: ancho, height: alto });
      const solicitudes: Record<string, unknown>[] = [];
      await page.route(/\/api\/v1\//, async route => {
        const req = route.request();
        const cors = { 'access-control-allow-origin': (await req.headerValue('origin')) ?? '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (/\/public\/institution-requests$/.test(new URL(req.url()).pathname) && req.method() === 'POST') {
          solicitudes.push(req.postDataJSON() as Record<string, unknown>);
          return route.fulfill({ status: 201, headers: { ...cors, 'content-type': 'application/json' }, body: '{"id":1}' });
        }
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: req.method() === 'GET' ? '[]' : '{}' });
      });
      await page.goto('/crear');
      await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
      const dsn = page.locator('gems-tap-disenador .dsn');
      await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
      await dsn.locator('#presets .tarjeta[data-id="arqueologa"]').click();
      await dsn.locator('#publicar').click();
      const hoja = page.locator('gems-tap-disenador .gancho');
      await expect(hoja).toBeVisible();
      await expect(hoja).toHaveAttribute('aria-modal', 'true');
      // PR-D2: el título lleva el nombre del personaje (el sugerido para la arqueóloga) y la hoja enseña su miniatura.
      await expect(hoja.getByRole('heading', { level: 2 })).toHaveText('Para publicar a Capitana Inés, regístrate como docente o institución');
      await expect(hoja.locator('img.gancho__mini')).toHaveAttribute('src', /^data:image\/png/);
      await expect(hoja.locator('.gancho__ganas li')).toHaveCount(3);
      // El foco entra a la hoja y el diseñador queda inerte detrás (sin desplazamiento lateral).
      expect(await page.evaluate(() => document.querySelector('gems-tap-disenador .gancho')?.contains(document.activeElement))).toBe(true);
      expect(await dsn.evaluate(e => (e as HTMLElement).inert)).toBe(true);
      await sinScrollHorizontal(page);
      await capturar(page, `hoja-${ancho}x${alto}`);
      // El borrador se guardó al tocar «Publicar»: tiene borradorId y miniatura.
      const borrador = JSON.parse(await page.evaluate(() => localStorage.getItem('taps.disenador.borrador') ?? 'null')) as { borradorId: string; miniatura: string; base: string } | null;
      expect(borrador?.borradorId).toMatch(/^[0-9a-z]+-[0-9a-z]{7,}$/);
      expect(borrador?.miniatura).toMatch(/^data:image\/png/);
      expect(borrador?.base).toBe('arqueologa');
      await hoja.getByRole('button', { name: 'Soy docente o institución' }).click();
      await expect(page).toHaveURL(new RegExp(`/instituciones\\?desde=crear&borrador=${borrador!.borradorId}#solicitud$`));
      const adjunto = page.locator('.adjunto');
      await expect(adjunto).toBeVisible({ timeout: 15_000 });
      await expect(adjunto).toContainText('Tu personaje irá adjunto');
      expect(await adjunto.locator('img').getAttribute('src')).toMatch(/^data:image\/png/);
      await capturar(page, `formulario-${ancho}x${alto}`);
      await page.locator('input[name="inst"]').fill('Colegio de Prueba');
      await page.locator('input[name="contact"]').fill('Persona de Prueba');
      await page.locator('input[name="email"]').fill('contacto@prueba.test');
      await page.locator('textarea[name="msg"]').fill('Quiero Taps para mi curso');
      await page.getByRole('button', { name: 'Enviar solicitud' }).click();
      await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toHaveCount(0);
      expect(solicitudes).toHaveLength(1);
      // PR-9b: el texto va intacto en `message` y el borrador, como string JSON, en su propio campo `draft`. Aquí el POST está
      // interceptado (se comprueba la forma del cuerpo que manda la web); el contrato real con el API lo cubre
      // PublicCatalogControllerRequestsTest en gems-lms-api.
      expect(solicitudes[0]['message']).toBe('Quiero Taps para mi curso');
      expect(String(solicitudes[0]['message'])).not.toContain('[gems-borrador');
      const draft = solicitudes[0]['draft'];
      expect(typeof draft).toBe('string');
      const d = JSON.parse(String(draft)) as Record<string, unknown>;
      expect(d['v']).toBe(1);
      expect(d['borradorId']).toBe(borrador!.borradorId);
      expect(d['b']).toBe('arqueologa');
      expect(typeof d['l']).toBe('object');
      expect(String(draft)).not.toContain('miniatura'); expect(String(draft)).not.toContain('data:image');
      // PR-D6: el lema no viaja en `draft` (el API solo acepta v, borradorId, b, l, i, w; cualquier otra clave anularía el borrador).
      expect(Object.keys(d).sort()).toEqual(['b', 'borradorId', 'i', 'l', 'v', 'w']);
      expect(Buffer.byteLength(String(draft), 'utf8')).toBeLessThanOrEqual(2048);
      // Embudo: cada evento una vez y ninguno con el look.
      const ev = await eventos(page);
      for (const e of ['taps/crear/intento-publicar/sin-cuenta', 'taps/crear/gancho/docente', 'taps/crear/registro/inicio', 'taps/crear/registro/enviado']) expect(ev.filter(x => x === e), e).toHaveLength(1);
      expect(ev.some(e => e.includes('look=') || e.includes(borrador!.borradorId))).toBeFalsy();
      await capturar(page, `enviado-${ancho}x${alto}`);
    });
  }

  test('«Soy estudiante»: copy «pídele a tu docente» y «Copiar enlace» del look; Escape vuelve al diseñador', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/crear');
    await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await dsn.locator('#presets .tarjeta[data-id="senador"]').click();
    await dsn.locator('#publicar').click();
    const hoja = page.locator('gems-tap-disenador .gancho');
    await hoja.getByRole('button', { name: 'Soy estudiante' }).click();
    await expect(hoja).toContainText('Pídele a tu docente que lo publique');
    await expect(hoja.locator('input[type="email"], input[type="tel"]')).toHaveCount(0);
    await capturar(page, 'hoja-estudiante-390x844');
    // Sin hoja del sistema y con portapapeles de mentira: copia el enlace #look= de compartir.js (nunca viaja al servidor).
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t: string) => { (window as unknown as { __copiado: string }).__copiado = t; return Promise.resolve(); } }, configurable: true });
    });
    await hoja.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(hoja.locator('.gancho__estado')).toContainText('Enlace copiado');
    const copiado = await page.evaluate(() => (window as unknown as { __copiado: string }).__copiado);
    expect(copiado).toMatch(/\/crear#look=[A-Za-z0-9_-]+$/);
    expect(copiado).not.toContain('?');
    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();
    expect(await dsn.evaluate(e => (e as HTMLElement).inert)).toBeFalsy();
    const ev = await eventos(page);
    for (const e of ['taps/crear/intento-publicar/sin-cuenta', 'taps/crear/gancho/estudiante', 'taps/crear/gancho/copiar', 'taps/crear/gancho/volver']) expect(ev.filter(x => x === e), e).toHaveLength(1);
    // El enlace copiado abre el look en /crear como «Look de un amigo».
    await page.goto('/'); await page.goto(copiado);   // otra ruta antes: cambiar solo el hash no recarga
    await expect(page.locator('gems-tap-disenador .dsn #recibido')).toBeVisible({ timeout: 20_000 });
  });

  test('/instituciones con ?borrador= que no existe en este navegador: formulario normal, sin adjunto', async ({ page }) => {
    await page.goto('/instituciones?desde=crear&borrador=mh5k2x1a-0a1b2c3');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2#req-title')).toBeVisible();
    await expect(page.locator('.adjunto')).toHaveCount(0);
    expect(await eventos(page)).toContain('taps/crear/registro/inicio');
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
    // «Volver a Taps» en la cabecera de marca devuelve al feed.
    const volver = page.locator('gems-tap-disenador header.marca').getByRole('link', { name: 'Volver a Taps' });
    await expect(volver).toHaveAttribute('href', '/taps');
    await expect(page.locator('gems-tap-disenador .dsn #lienzo')).toBeVisible({ timeout: 20_000 });
    await volver.click();
    await expect(page).toHaveURL(/\/taps(\?|$)/);   // el feed retoma su propio estado (?t=)
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

  test('accesibilidad (PR-E5/E6): foco al h1, lienzo descrito, aria-pressed, sonido de un solo estado, muestra elegida con nombre y check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto('/crear');
    await page.evaluate(() => { try { localStorage.setItem('taps.crear.aviso-publicar', '1'); } catch { /* sin almacenamiento */ } });
    const dsn = page.locator('gems-tap-disenador .dsn');
    await expect(dsn.locator('#lienzo')).toBeVisible({ timeout: 20_000 });
    await expect(dsn.locator('#presets .tarjeta[aria-pressed="true"]')).toHaveCount(1);
    await expect(dsn.locator('#lienzo')).toHaveAttribute('aria-label', /^Tu personaje: .+, peinado .+, ropa .+, en .+/);
    await expect(dsn.locator('#bocadillo')).not.toHaveAttribute('aria-live', /.+/);
    // Un solo mecanismo de estado en el sonido: la etiqueta no cambia, aria-pressed sí.
    const sonido = dsn.locator('#sonido');
    await expect(sonido).not.toHaveAttribute('aria-label', /.+/);
    const antes = await sonido.getAttribute('aria-pressed');
    await sonido.click();
    await expect(sonido).not.toHaveAttribute('aria-pressed', antes!);
    await expect(sonido).not.toHaveAttribute('aria-label', /.+/);
    // Cambiar de paso mueve el foco al h1.
    await dsn.locator('#siguiente').click();
    await expect(dsn.locator('h1')).toBeFocused();
    await expect(dsn.locator('h1')).toHaveText('Hazlo tuyo');
    // Muestra elegida: aria-pressed, check dibujado, nombre visible.
    await dsn.locator('#pestanas [data-id="pelo"]').click();
    const elegida = dsn.locator('#ajustes .muestra[aria-pressed="true"]').first();
    await expect(elegida).toBeVisible();
    expect(await elegida.evaluate(e => getComputedStyle(e, '::after').content)).toBe('""');
    await expect(dsn.locator('#ajustes .muestra-nombre').first()).toHaveText(await elegida.getAttribute('aria-label') ?? '');
    await dsn.locator('#ajustes').screenshot({ path: 'test-results/e56-ajustes-375.png' });
    // Escenario: aria-pressed en las tarjetas.
    await dsn.locator('#siguiente').click();
    await expect(dsn.locator('#escenas .tarjeta[aria-pressed="true"]')).toHaveCount(1);
    const axe = await new AxeBuilder({ page }).include('gems-tap-disenador .dsn').withTags(['wcag2a', 'wcag2aa']).disableRules(['color-contrast']).analyze();
    expect(axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => v.id)).toEqual([]);
  });
});
