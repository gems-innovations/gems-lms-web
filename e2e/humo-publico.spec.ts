import { expect, test } from '@playwright/test';
import { apiFalsa, CURSOS, erroresDePagina, sinAnalitica, sinScrollHorizontal } from './humo-soporte';

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
});

test.afterEach(() => {
  expect(errores, 'errores de JavaScript sin atrapar').toEqual([]);
});

test.describe('Humo · visitante', () => {
  test('portada: titular, cursos del catálogo y mini simulacro', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('article.card')).toHaveCount(CURSOS.length);
    await expect(page.locator('article.card h3 a').first()).toHaveAttribute('href', /\/cursos\/\d+/);
    await page.locator('gems-hero-quiz .mock__opt').first().click();
    await expect(page.locator('gems-hero-quiz .mock__why')).toBeVisible();
    await sinScrollHorizontal(page);
  });

  test('portada con el API caído: no queda en blanco', async ({ page }) => {
    await apiFalsa(page, { caida: true });
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('gems-hero-quiz .mock__opt').first()).toBeEnabled();
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
    const tap = page.locator('section.tap.tap--active');
    await expect(tap.locator('.tap__q')).not.toBeEmpty();
    await tap.locator('.tap__opt').first().click();
    await expect(tap.locator('.tap__why')).toBeVisible();
    await expect(tap.locator('.tap__next')).toBeVisible();
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
