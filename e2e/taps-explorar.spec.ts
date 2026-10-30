import { expect, test, type Page } from '@playwright/test';
import { apiFalsa, conSesion, erroresDePagina, type IRegla } from './humo-soporte';

/**
 * Explorar (/taps/explorar): buscador sin tildes, categorías con Minecraft primero, orden «Más vistos» (con y sin datos del
 * API), «Nuevos», entradas desde el feed y estado en la URL. La API es falsa (e2e/humo-soporte.ts). Datos del banco real.
 * Uso: npx playwright test e2e/taps-explorar.spec.ts  (con E2E_ESTATICO=1 contra el build estático)
 */
test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const tarjetas = (page: Page) => page.locator('gems-taps-explorar .rejilla a.card');
const hrefs = (page: Page) => tarjetas(page).evaluateAll(els => els.map(e => e.getAttribute('href')));
const VISTAS = { masVisto: 'cu-datos', taps: [{ tapId: 'cu-datos', vistas: 90 }, { tapId: 'lg-azar', vistas: 40 }, { tapId: 'mc-redstone-1', vistas: 12 }, { tapId: 'tc-git-1', vistas: 3 }] };

async function abrir(page: Page, ruta = '/taps/explorar', api: 'con' | 'sin' = 'sin') {
  await apiFalsa(page, { reglas: api === 'con' ? [{ method: 'GET', path: /^\/public\/taps\/estadisticas$/, respond: () => ({ body: VISTAS }) }] : [] });
  await page.goto(ruta);
  await expect(page.getByRole('heading', { level: 1, name: 'Explorar' })).toBeVisible();
  await expect(tarjetas(page).first()).toBeVisible();
}

test('buscar «volcán» (también «VOLCAN»), abrir el Tap y ver el estado en la URL', async ({ page }) => {
  const errores = erroresDePagina(page);
  await abrir(page);
  const buscador = page.getByRole('searchbox', { name: /Buscar Taps/ });
  await buscador.fill('volcán');
  await expect(tarjetas(page)).toHaveCount(1);
  expect(await hrefs(page)).toEqual(['/t/cu-gigantes']);
  await expect(page.locator('.card__hit')).toContainText('volcán');
  await expect(page.getByRole('status').filter({ hasText: '1 Tap' })).toBeVisible();
  await buscador.fill('VOLCAN');
  expect(await hrefs(page)).toEqual(['/t/cu-gigantes']);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('VOLCAN');
  // Sin resultados: mensaje amable con ideas y salida.
  await buscador.fill('zzzzqq');
  await expect(page.getByText('No encontramos Taps para «zzzzqq»')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Ideas para buscar' }).getByRole('button').first()).toBeVisible();
  await page.getByRole('list', { name: 'Ideas para buscar' }).getByRole('button').first().click();
  await expect(tarjetas(page).first()).toBeVisible();
  await page.getByRole('button', { name: 'Borrar la búsqueda' }).click();
  await buscador.fill('volcan');
  await tarjetas(page).first().click();
  await expect(page).toHaveURL(/\/t\/cu-gigantes$/);
  expect(errores).toEqual([]);
});

test('categorías: Minecraft va primero, filtra y muestra sus subtemas; combinada con la búsqueda', async ({ page }) => {
  await abrir(page);
  const chips = page.getByRole('group', { name: 'Categorías', exact: true }).getByRole('button');
  await expect(chips.nth(0)).toHaveText(/Todas/);
  await expect(chips.nth(1)).toContainText('Minecraft');
  await chips.nth(1).click();
  await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
  expect((await hrefs(page)).every(h => h!.startsWith('/t/mc-'))).toBe(true);
  expect((await hrefs(page)).length).toBeGreaterThan(20);
  await page.getByRole('group', { name: 'Subtemas de Minecraft' }).getByRole('button', { name: /Redstone/ }).click();
  const redstone = await hrefs(page);
  expect(redstone.length).toBeGreaterThan(2);
  expect(redstone.every(h => h!.startsWith('/t/mc-redstone'))).toBe(true);
  await page.getByRole('searchbox').fill('volcan');
  await expect(page.getByText('No encontramos Taps para «volcan»')).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos los Taps' }).click();
  await expect(tarjetas(page).first()).toBeVisible();
  await expect(chips.nth(0)).toHaveAttribute('aria-pressed', 'true');
});

test('orden: «Nuevos» pone primero lo último agregado (Minecraft, ronda 3) y «Más vistos» sin datos del API avisa y no inventa cifras', async ({ page }) => {
  await abrir(page);
  await page.getByRole('button', { name: 'Nuevos', exact: true }).click();
  expect((await hrefs(page))[0]).toBe('/t/mc-bloques');
  await page.getByRole('button', { name: 'Más vistos' }).click();
  await expect(page.getByRole('note')).toContainText('Aún no hay suficientes vistas');
  expect((await hrefs(page))[0]).toBe('/t/mc-gancho');                            // el orden curado
  await expect(page.getByRole('heading', { name: 'Lo más visto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ya jugados' }).click();
  await expect(page.getByText('Aún no has completado ningún Tap')).toBeVisible();
  await page.getByRole('button', { name: 'Sin jugar' }).click();
  expect((await hrefs(page)).length).toBeGreaterThan(20);
});

test('orden: «Más vistos» usa las cifras del API y aparece el riel «Lo más visto»', async ({ page }) => {
  await abrir(page, '/taps/explorar', 'con');
  await expect(page.getByRole('heading', { name: 'Lo más visto' })).toBeVisible();
  await expect(page.locator('section.riel').filter({ hasText: 'Lo más visto' }).locator('a.card').first()).toHaveAttribute('href', '/t/cu-datos');
  await page.getByRole('button', { name: 'Más vistos' }).click();
  expect((await hrefs(page)).slice(0, 4)).toEqual(['/t/cu-datos', '/t/lg-azar', '/t/mc-redstone-1', '/t/tc-git-1']);
  await expect(page.getByRole('note')).toHaveCount(0);
});

test('abre directo con el estado de la URL y recuerda el progreso: Seguir jugando y Ya jugados', async ({ page }) => {
  await page.addInitScript(() => {
    const ahora = Date.now();
    localStorage.setItem('gems-taps-interes', JSON.stringify({ score: { minecraft: 3 }, blocked: {}, done: { 'mc-gancho': ahora - 1000 }, days: [] }));
    localStorage.setItem('gems-taps-sesion', JSON.stringify({ ultima: ahora, celebrada: null, puntajes: { 'mc-gancho': 4 } }));
    localStorage.setItem('gems-taps-partidas', JSON.stringify({ v: 2, runs: { 'lg-azar': { tapId: 'lg-azar', index: 2, chosen: null, score: 1, answers: [true, false], finished: false, t: ahora - 500 } } }));
  });
  await abrir(page, '/taps/explorar?tema=minecraft&orden=jugados');
  await expect(page.getByRole('button', { name: /Minecraft/ }).first()).toHaveAttribute('aria-pressed', 'true');
  expect(await hrefs(page)).toEqual(['/t/mc-gancho']);
  await expect(tarjetas(page).first()).toContainText('Completado: 4 de 5');
  await page.goto('/taps/explorar');
  const seguir = page.locator('section.riel').filter({ hasText: 'Seguir jugando' });
  await expect(seguir.locator('a.card')).toHaveCount(1);
  await expect(seguir.locator('a.card')).toContainText('En curso: 2 de 5');
});

test('móvil: el selector de temas trae «Explorar» y lleva a la pantalla', async ({ page }) => {
  await apiFalsa(page);
  await page.goto('/taps');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.getByRole('button', { name: /^Temas/ }).click();
  await page.getByRole('dialog').getByRole('link', { name: /^Explorar/ }).click();
  await expect(page).toHaveURL(/\/taps\/explorar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Explorar' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a Taps' }).click();
  await expect(page).toHaveURL(/\/taps(\?.*)?$/);
});

/**
 * API social simulada (gems-lms-api#33): cifras públicas en GET /public/taps/sociales; con sesión, los propios
 * (/taps/sociales/yo), PUT /taps/{tapId}/me-gusta y los comentarios. `authorization` guarda si llegó el token.
 */
const authorization: string[] = [];
const SOCIAL: IRegla[] = [
  { method: 'GET', path: /^\/public\/taps\/sociales$/, respond: req => {
    const ids = (new URL(req.url()).searchParams.get('ids') ?? '').split(',');
    if (req.headers()['authorization']) authorization.push('publica');
    return { body: { taps: ids.map(tapId => ({ tapId, vistas: tapId === 'mc-gancho' ? 1234 : 7, meGusta: tapId === 'mc-gancho' ? 41 : 0, comentarios: tapId === 'mc-gancho' ? 3 : 0 })) } };
  } },
  { method: 'GET', path: /^\/taps\/sociales\/yo$/, respond: req => {
    const ids = (new URL(req.url()).searchParams.get('ids') ?? '').split(',');
    return { body: { taps: ids.map(tapId => ({ tapId, meGustaYo: false })) } };
  } },
  { method: 'PUT', path: /^\/taps\/[^/]+\/me-gusta$/, respond: (req, path) => {
    authorization.push(req.headers()['authorization'] ?? 'sin');
    const meGusta = (req.postDataJSON() as { meGusta: boolean }).meGusta;
    return { body: { tapId: decodeURIComponent(path.split('/')[2]), meGusta, total: meGusta ? 42 : 41 } };
  } },
  { method: 'GET', path: /^\/taps\/[^/]+\/comentarios$/, respond: () => ({ body: {
    comentarios: [{ id: 1, autor: 'Ana', texto: '<b>hola</b> crack', creado: new Date(Date.now() - 5 * 60_000).toISOString(), mio: false }], siguiente: null,
  } }) },
  { method: 'POST', path: /^\/taps\/[^/]+\/comentarios$/, respond: req => {
    const texto = (req.postDataJSON() as { texto: string }).texto;
    if (texto === 'malo') return { status: 422, body: { message: 'Ese comentario no se puede publicar.' } };
    return { body: { id: 99, autor: 'Tú', texto, creado: new Date().toISOString(), mio: true } };
  } },
  { method: 'DELETE', path: /^\/taps\/comentarios\/[^/]+$/, respond: () => ({ status: 204 }) },
  { method: 'POST', path: /^\/taps\/comentarios\/[^/]+\/reportar$/, respond: () => ({ status: 204 }) },
];

test('tarjetas tipo video: portada viva y vistas; sin sesión el corazón pide iniciar sesión (API social simulada)', async ({ page }) => {
  authorization.length = 0;
  const errores = erroresDePagina(page);
  const api = await apiFalsa(page, { reglas: SOCIAL });
  await page.goto('/taps/explorar?tema=minecraft');
  const celda = page.locator('.rejilla .celda').filter({ has: page.locator('a[href="/t/mc-gancho"]') });
  await expect(celda.locator('a.card')).toContainText('1,2 mil vistas');
  const gusta = celda.getByRole('button', { name: /^Me gusta: .*\(41\)$/ });
  await expect(gusta).toHaveAttribute('aria-pressed', 'false');
  await gusta.click();
  const hoja = page.getByRole('dialog', { name: 'Inicia sesión para dar me gusta y comentar' });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/auth/signin?volver=%2Ftaps%2Fexplorar%3Ftema%3Dminecraft');
  await expect(hoja.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(hoja).toHaveCount(0);
  expect(api.veces(/me-gusta$/)).toBe(0);
  expect(authorization).toEqual([]);
  // Portada viva: el motor ligero monta pocas escenas (solo lo visible) y anima como mucho dos; nunca una por Tap.
  await expect.poll(() => page.locator('.card__art .te-stage').count()).toBeGreaterThan(0);
  expect(await page.locator('.card__art .te-stage').count()).toBeLessThanOrEqual(6);
  expect(await page.locator('.card__art .te-stage:not([data-paused])').count()).toBeLessThanOrEqual(2);
  expect(errores).toEqual([]);
});

test('sin API social: sin corazón ni cifras inventadas; con movimiento reducido, portada fija sin motor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page);
  await expect(page.locator('.card__q').first()).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('.gusta')).toHaveCount(0);
  await expect(page.locator('.card__vistas')).toHaveCount(0);
  await expect(page.locator('.te-stage')).toHaveCount(0);
  await page.goto('/t/mc-gancho');
  await expect(page.getByRole('navigation', { name: 'Acciones del Tap' }).getByRole('button', { name: 'Más opciones' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Me gusta|Comentarios) \(/ })).toHaveCount(0);
});

test('Tap abierto sin sesión: me gusta y comentarios muestran su cifra y abren la hoja de acceso', async ({ page }) => {
  await apiFalsa(page, { reglas: SOCIAL });
  await page.goto('/t/mc-gancho');
  const riel = page.getByRole('navigation', { name: 'Acciones del Tap' });
  await expect(riel.getByRole('button', { name: 'Me gusta (41)' })).toBeVisible();
  await riel.getByRole('button', { name: 'Comentarios (3)' }).click();
  const hoja = page.getByRole('dialog', { name: 'Inicia sesión para dar me gusta y comentar' });
  await expect(hoja.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/auth/signin?volver=%2Ft%2Fmc-gancho');
  await expect(hoja.getByRole('link', { name: 'Iniciar sesión' })).toBeFocused();
  await hoja.getByRole('button', { name: 'Ahora no' }).click();
  await expect(hoja).toHaveCount(0);
});

test('Tap abierto con sesión: me gusta contra PUT y comentarios (publicar, 422, borrar y reportar)', async ({ page }) => {
  authorization.length = 0;
  const errores = erroresDePagina(page);
  await conSesion(page, 'student');
  const api = await apiFalsa(page, { reglas: SOCIAL });
  await page.goto('/t/mc-gancho');
  const riel = page.getByRole('navigation', { name: 'Acciones del Tap' });
  await expect(riel.getByRole('button', { name: 'Me gusta (41)' })).toHaveAttribute('aria-pressed', 'false');
  await riel.getByRole('button', { name: 'Me gusta (41)' }).click();
  await expect(riel.getByRole('button', { name: 'Me gusta (42)' })).toHaveAttribute('aria-pressed', 'true');
  expect(api.veces(/^\/taps\/mc-gancho\/me-gusta$/, 'PUT')).toBe(1);
  expect(authorization).toEqual([expect.stringMatching(/^Bearer /)]);          // el PUT lleva el token; las cifras públicas, no

  await riel.getByRole('button', { name: 'Comentarios (3)' }).click();
  const hoja = page.getByRole('dialog', { name: /Comentarios/ });
  await expect(hoja.getByText('<b>hola</b> crack')).toBeVisible();          // texto plano: Angular lo escapa
  await expect(hoja.locator('b')).toHaveCount(0);
  const campo = hoja.getByRole('textbox', { name: 'Escribe un comentario' });
  await expect(campo).toBeFocused();
  await expect(campo).toHaveAttribute('maxlength', '200');
  await campo.fill('malo');
  await campo.press('Enter');
  await expect(hoja.getByText('Ese comentario no se puede publicar.')).toBeVisible();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  await campo.fill('¡Qué buen Tap!');
  await expect(hoja.getByText('14/200')).toBeVisible();
  await campo.press('Enter');
  await expect(hoja.getByRole('status')).toHaveText('Comentario publicado');
  await expect(hoja.getByText('¡Qué buen Tap!')).toBeVisible();
  await expect(campo).toHaveValue('');
  await expect(riel.getByRole('button', { name: 'Comentarios (4)' })).toHaveCount(1);
  await hoja.getByRole('button', { name: 'Borrar tu comentario: ¡Qué buen Tap!' }).click();
  await hoja.getByRole('button', { name: 'Sí, borrar' }).click();
  await expect(hoja.getByRole('status')).toHaveText('Comentario borrado');
  await hoja.getByRole('button', { name: 'Reportar el comentario de Ana' }).click();
  await hoja.getByRole('button', { name: 'Sí, reportar' }).click();
  await expect(hoja.getByRole('status')).toContainText('Comentario reportado');
  expect(api.veces(/^\/taps\/comentarios\/1\/reportar$/, 'POST')).toBe(1);
  expect(api.veces(/^\/taps\/comentarios\/99$/, 'DELETE')).toBe(1);
  await page.keyboard.press('Escape');
  await expect(hoja).toHaveCount(0);
  await expect(riel.getByRole('button', { name: 'Comentarios (3)' })).toBeFocused();
  expect(errores).toEqual([]);
});

test.describe('escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });
  test('el menú del feed tiene «Explorar» en el grupo «Jugar» y la pantalla no se desborda', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/taps');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
    await page.getByRole('navigation', { name: 'Menú de Taps' }).getByRole('link', { name: 'Explorar' }).click();
    await expect(page).toHaveURL(/\/taps\/explorar$/);
    await expect(tarjetas(page).first()).toBeVisible();
    // «/» enfoca el buscador.
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
    const ancho = await page.locator('gems-taps-explorar').evaluate(el => ({ scroll: el.scrollWidth, ancho: el.clientWidth }));
    expect(ancho.scroll).toBeLessThanOrEqual(ancho.ancho);
  });
});
