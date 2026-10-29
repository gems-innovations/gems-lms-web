import { expect, test, type Page } from '@playwright/test';
import { apiFalsa, erroresDePagina, type IRegla } from './humo-soporte';

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

/** API social simulada (contrato de GET /public/taps/sociales y POST /public/taps/{tapId}/me-gusta). */
const SOCIAL: IRegla[] = [
  { method: 'GET', path: /^\/public\/taps\/sociales$/, respond: req => {
    const ids = (new URL(req.url()).searchParams.get('ids') ?? '').split(',');
    return { body: { taps: ids.map(tapId => ({ tapId, vistas: tapId === 'mc-gancho' ? 1234 : 7, meGusta: tapId === 'mc-gancho' ? 41 : 0, meGustaYo: false })) } };
  } },
  { method: 'POST', path: /^\/public\/taps\/[^/]+\/me-gusta$/, respond: (req, path) => {
    const meGusta = (req.postDataJSON() as { meGusta: boolean }).meGusta;
    return { body: { tapId: decodeURIComponent(path.split('/')[3]), meGusta, total: meGusta ? 42 : 41 } };
  } },
];

test('tarjetas tipo video: portada viva, vistas compactas y me gusta que cambia aria-pressed (API social simulada)', async ({ page }) => {
  const errores = erroresDePagina(page);
  const api = await apiFalsa(page, { reglas: SOCIAL });
  await page.goto('/taps/explorar?tema=minecraft');
  const celda = page.locator('.rejilla .celda').filter({ has: page.locator('a[href="/t/mc-gancho"]') });
  await expect(celda.locator('a.card')).toContainText('1,2 mil vistas');
  const gusta = celda.getByRole('button', { name: /^Me gusta: .*\(41\)$/ });
  await expect(gusta).toHaveAttribute('aria-pressed', 'false');
  await gusta.click();
  await expect(celda.getByRole('button', { name: /^Me gusta: .*\(42\)$/ })).toHaveAttribute('aria-pressed', 'true');
  expect(api.veces(/^\/public\/taps\/mc-gancho\/me-gusta$/, 'POST')).toBe(1);
  // Portada viva: el motor ligero monta pocas escenas (solo lo visible) y anima como mucho dos; nunca una por Tap.
  await expect.poll(() => page.locator('.card__art .te-stage').count()).toBeGreaterThan(0);
  expect(await page.locator('.card__art .te-stage').count()).toBeLessThanOrEqual(6);
  expect(await page.locator('.card__art .te-stage:not([data-paused])').count()).toBeLessThanOrEqual(2);
  // Comentarios: todavía no existen (ningún botón muerto).
  await expect(page.getByRole('button', { name: /coment/i })).toHaveCount(0);
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
});

test('el Tap abierto tiene «Me gusta» con su cifra en el riel', async ({ page }) => {
  await apiFalsa(page, { reglas: SOCIAL });
  await page.goto('/t/mc-gancho');
  const riel = page.getByRole('navigation', { name: 'Acciones del Tap' });
  await expect(riel.getByRole('button', { name: 'Me gusta (41)' })).toHaveAttribute('aria-pressed', 'false');
  await riel.getByRole('button', { name: 'Me gusta (41)' }).click();
  await expect(riel.getByRole('button', { name: 'Me gusta (42)' })).toHaveAttribute('aria-pressed', 'true');
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
