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
    // La portada llega prerenderizada: un toque antes de hidratar puede perderse, así que se reintenta.
    await expect(async () => {
      await page.locator('gems-hero-quiz .mock__opt').first().click();
      await expect(page.locator('gems-hero-quiz .mock__why')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
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
