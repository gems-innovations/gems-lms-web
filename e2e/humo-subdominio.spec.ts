import { expect, test } from '@playwright/test';
import { apiFalsa, CURSOS, IRegla, sinAnalitica } from './humo-soporte';

/**
 * Humo · subdominio de institución: `<slug>.localhost` se resuelve como `<slug>.gemsinnovations.com`. Con institución,
 * se aplica su marca (y su landing propia si la tiene); sin institución o sin API, se ve la portada normal de GEMS.
 * Solo en Chromium: resuelve *.localhost sin tocar el archivo hosts.
 * Uso: npx playwright test e2e/humo-subdominio.spec.ts --project=chromium
 */

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'solo Chromium resuelve *.localhost');
  await sinAnalitica(page);
});

function enSubdominio(baseURL: string | undefined, slug: string, ruta = '/'): string {
  const u = new URL(baseURL ?? 'http://localhost:4200');
  test.skip(u.hostname !== 'localhost', 'el subdominio de prueba solo existe en localhost');
  u.hostname = `${slug}.localhost`;
  u.pathname = ruta;
  return u.toString();
}

function institucion(slug: string, color: string): IRegla[] {
  return [
    { method: 'GET', path: new RegExp(`^/public/home/${slug}$`), respond: () => ({ body: {
      institutionId: 'inst-9', name: `Institución ${slug}`, slug, version: 1, mode: 'BASE', html: null, css: null,
      branding: { primaryColor: color, secondaryColor: null, accentColor: null, logoUrl: null, faviconUrl: null, darkMode: null },
    } }) },
    { method: 'GET', path: /^\/public\/institutions\/inst-9\/courses$/, respond: () => ({ body: CURSOS.slice(0, 2) }) },
  ];
}

test.describe('Humo · subdominio de institución', () => {
  test('con landing propia (knowledgecraft) se muestra la suya', async ({ page, baseURL }) => {
    const api = await apiFalsa(page, { reglas: institucion('knowledgecraft', '#3a7d2c') });
    await page.goto(enSubdominio(baseURL, 'knowledgecraft'));
    await expect(page.locator('h1').first()).toContainText('Juega, aprende y');
    expect(api.veces(/^\/public\/home\/knowledgecraft$/, 'GET')).toBe(1);
  });

  test('una institución sin landing propia ve la portada con su color', async ({ page, baseURL }) => {
    await apiFalsa(page, { reglas: institucion('colegiohumo', '#c0392b') });
    await page.goto(enSubdominio(baseURL, 'colegiohumo'));
    await expect(page.locator('h1').first()).toBeVisible();
    const estilo = await page.evaluate(() => document.documentElement.getAttribute('style') ?? '');
    expect(estilo.toLowerCase(), 'se aplica el color de la institución').toContain('#c0392b');
  });

  test('un subdominio que no es institución ve la portada de GEMS', async ({ page, baseURL }) => {
    await apiFalsa(page);
    await page.goto(enSubdominio(baseURL, 'noexiste'));
    await expect(page.locator('article.card').first()).toBeVisible();
  });

  test('con el API caído, el subdominio no se queda en blanco', async ({ page, baseURL }) => {
    await apiFalsa(page, { caida: true });
    await page.goto(enSubdominio(baseURL, 'colegiohumo'));
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
