import { expect, Page, test } from '@playwright/test';

/**
 * Recorrido en celular de lo que ve un visitante: landing, ficha del curso, entrar como invitado,
 * reproductor, bloqueo de secciones y páginas legales. Se corre en dos tamaños de pantalla.
 * Uso: npx playwright test e2e/mobile-public.spec.ts
 */
const PHONES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Android grande', width: 412, height: 915 },
];

/** Ningún elemento debe obligar a desplazarse a los lados. */
async function expectNoHorizontalScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll, 'la página no debe desbordarse a los lados').toBeLessThanOrEqual(width);
}

/** Los botones y enlaces visibles deben poder tocarse con el dedo (mínimo 40 px de alto). */
async function smallTapTargets(page: Page, scope: string) {
  return page.evaluate(sel => [...document.querySelectorAll(`${sel} button, ${sel} a.btn`)]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
    .filter(e => e.getBoundingClientRect().height < 40)
    .map(e => `${(e.textContent ?? '').trim().slice(0, 30)} (${Math.round(e.getBoundingClientRect().height)}px)`), scope);
}

for (const phone of PHONES) {
  test.describe(`Celular · ${phone.name}`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true });

    test('landing: cursos, mini simulacro y botón fijo', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.card').first()).toBeVisible();
      expect(await page.locator('article.card').count(), 'debe haber al menos 4 cursos').toBeGreaterThanOrEqual(4);
      await expectNoHorizontalScroll(page);
      await expect(page.locator('.land-cta button')).toBeVisible();

      // Mini simulacro del hero: responder muestra la explicación.
      await page.locator('gems-hero-quiz .mock__opt').first().tap();
      await expect(page.locator('gems-hero-quiz .mock__why')).toBeVisible();

      expect(await smallTapTargets(page, 'main'), 'botones demasiado pequeños').toEqual([]);
      await page.locator('#preguntas details').first().locator('summary').tap();
      await expect(page.locator('#preguntas details').first()).toHaveAttribute('open', '');
      await expectNoHorizontalScroll(page);
    });

    test('ficha del curso: botón de empezar visible sin desplazarse', async ({ page }) => {
      await page.goto('/');
      await page.locator('article.card h3 a').first().tap();
      await expect(page).toHaveURL(/\/cursos\/\d+/);
      await expect(page.locator('.mobile-cta button')).toBeInViewport();
      await expectNoHorizontalScroll(page);
    });

    test('invitado: entra en un toque, estudia y se le invita a crear cuenta', async ({ page }) => {
      await page.goto('/');
      await page.locator('.card__actions button').first().tap();
      await expect(page).toHaveURL(/\/learn\/courses\/\d+/, { timeout: 15_000 });

      // Reproductor: la lección ocupa el ancho y el menú pasa a ser una barra inferior.
      const content = page.locator('.course-player-container__content');
      await expect(content).toBeVisible({ timeout: 15_000 });
      const box = (await content.boundingBox())!;
      expect(box.width, 'la lección debe usar casi todo el ancho').toBeGreaterThan(phone.width - 40);
      const nav = (await page.locator('.slayout__leftnav').boundingBox())!;
      expect(nav.y, 'el menú debe estar abajo').toBeGreaterThan(phone.height - 120);
      await expectNoHorizontalScroll(page);

      // Barra de invitado visible y sin tapar la barra inferior.
      const bar = (await page.locator('.gsb').boundingBox())!;
      expect(bar.y + bar.height, 'la barra de invitado no debe tapar el menú').toBeLessThanOrEqual(nav.y + 1);

      // Sección bloqueada: se queda en el curso y aparece la invitación.
      await page.locator('.slayout__navlink[href="/learn/catalog"]').tap();
      await expect(page.locator('.gsm h2')).toContainText('Crea tu cuenta');
      await expect(page).toHaveURL(/\/learn\/courses\/\d+/);
      await page.locator('#gsm-pw').fill('Abcdefg1');
      await expect(page.locator('.gsm__rules li.ok')).toHaveCount(4);
      await page.locator('.gsm__skip').tap();
      await expect(page.locator('.gsm')).toHaveCount(0);
    });

    for (const path of ['/terminos', '/privacidad', '/instituciones']) {
      test(`página ${path} legible en celular`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoHorizontalScroll(page);
      });
    }
  });
}
