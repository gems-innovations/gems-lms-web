import { expect, test } from '@playwright/test';
import { apiFalsa, conSesion, sinAnalitica } from './humo-soporte';

/**
 * Humo · empezar como invitado (el gancho de los cursos gratis): desde la portada, la ficha y los retos se abre una
 * sesión de invitado, se inscribe en el curso y se llega al reproductor. Y lo que el invitado no puede abrir.
 * El reproductor completo (lecciones y quiz con datos) lo prueban guest-learning.spec.ts con el stack local.
 * Uso: npx playwright test e2e/humo-invitado.spec.ts
 */

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => { await sinAnalitica(page); });

test.describe('Humo · invitado', () => {
  test('desde la ficha: «Empezar» crea el invitado, lo inscribe y abre el curso', async ({ page }) => {
    const api = await apiFalsa(page);
    await page.goto('/cursos/1');
    await page.getByRole('button', { name: /Empezar (ahora|gratis)/ }).first().click();
    await expect(page).toHaveURL(/\/learn\/courses\/1/, { timeout: 15_000 });
    expect(api.veces(/^\/auth\/guest$/, 'POST')).toBe(1);
    expect(api.veces(/^\/enrollments/, 'POST')).toBe(1);
    const sesion = await page.evaluate(() => JSON.parse(localStorage.getItem('gems_session') ?? '{}'));
    expect(sesion.user?.email).toMatch(/@invitado\.gems\.lat$/);
  });

  test('desde la portada: el botón de la tarjeta abre el curso', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/');
    await page.locator('.card__actions button').first().click();
    await expect(page).toHaveURL(/\/learn\/courses\/\d+/, { timeout: 15_000 });
  });

  test('desde retos: tras tres respuestas invita al curso y lo abre', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/retos');
    for (let k = 0; k < 3; k++) {
      await page.locator('.mock__opt').first().click();
      await page.getByRole('button', { name: 'Siguiente reto' }).click();
    }
    const empezar = page.getByRole('button', { name: 'Empezar gratis, sin registro' });
    await expect(empezar).toBeEnabled();
    await empezar.click();
    await expect(page).toHaveURL(/\/learn\/courses\/1/, { timeout: 15_000 });
  });

  test('si el API rechaza al invitado, se informa sin salir de la ficha', async ({ page }) => {
    await apiFalsa(page, { reglas: [{ method: 'POST', path: /^\/auth\/guest$/, respond: () => ({ status: 429, body: { message: 'Demasiados' } }) }] });
    await page.goto('/cursos/1');
    await page.getByRole('button', { name: /Empezar (ahora|gratis)/ }).first().click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/cursos\/1$/);
  });

  for (const ruta of ['/learn/catalog', '/learn/home', '/learn/profile']) {
    test(`un invitado que abre ${ruta} por enlace va a «Mis cursos»`, async ({ page }) => {
      await apiFalsa(page);
      await conSesion(page, 'invitado');
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/learn\/my-learning$/);
    });
  }
});
