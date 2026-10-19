import { expect, test } from '@playwright/test';
import { apiFalsa, conSesion, erroresDePagina, INICIO, Rol, sinAnalitica, usuarioApi } from './humo-soporte';

/**
 * Humo · cuentas y permisos: iniciar sesión (cada rol llega a su inicio), recuperar clave, guards sin sesión y con
 * el rol equivocado, sesión vencida y que el panel de cada rol abra. Sin backend (API falsa) ni cuentas reales.
 * Uso: npx playwright test e2e/humo-cuentas.spec.ts
 */

test.use({ serviceWorkers: 'block' });

let errores: string[] = [];
test.beforeEach(async ({ page }) => {
  errores = erroresDePagina(page);
  await sinAnalitica(page);
});
test.afterEach(() => {
  expect(errores, 'errores de JavaScript sin atrapar').toEqual([]);
});

test.describe('Humo · iniciar sesión', () => {
  for (const rol of ['student', 'instructor', 'admin', 'super_admin'] as Rol[]) {
    test(`${rol}: entra con su correo y llega a su inicio`, async ({ page }) => {
      const api = await apiFalsa(page);
      await page.goto('/auth/signin');
      await expect(page.locator('h1')).toHaveText('Entra con tu cuenta');
      await page.getByLabel('Correo electrónico').fill(usuarioApi(rol).email);
      await page.getByLabel('Contraseña').fill('clave-de-prueba-1');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page).toHaveURL(INICIO[rol], { timeout: 15_000 });
      expect(api.veces(/^\/auth\/login$/, 'POST')).toBe(1);
      expect(await page.evaluate(() => !!localStorage.getItem('gems_session')), 'la sesión queda guardada').toBe(true);
    });
  }

  test('credenciales incorrectas: se informa y se queda en el formulario', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/auth/signin');
    await page.getByLabel('Correo electrónico').fill('nadie@prueba.test');
    await page.getByLabel('Contraseña').fill('clave-de-prueba-1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.locator('.login-form__error-banner')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/signin$/);
  });

  test('recuperar clave: pide el correo y confirma el envío', async ({ page }) => {
    const api = await apiFalsa(page);
    await page.goto('/auth/signin');
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await page.getByLabel('Correo electrónico').fill('alguien@prueba.test');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.locator('.password__banner--ok')).toBeVisible();
    expect(api.veces(/^\/auth\/forgot-password$/, 'POST')).toBe(1);
  });

  test('restablecer clave sin token avisa que el enlace está incompleto', async ({ page }) => {
    await apiFalsa(page);
    await page.goto('/auth/reset-password');
    await expect(page.locator('.password__banner--error')).toContainText('incompleto');
  });
});

test.describe('Humo · permisos', () => {
  for (const ruta of ['/learn/home', '/learn/my-learning', '/instructor', '/education/courses', '/admin/dashboard', '/admin/institutions', '/solicitudes', '/account/password']) {
    test(`sin sesión, ${ruta} pide iniciar sesión`, async ({ page }) => {
      await apiFalsa(page);
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/auth\/signin$/);
    });
  }

  for (const ruta of ['/admin/dashboard', '/instructor', '/education/courses', '/solicitudes']) {
    test(`un estudiante que abre ${ruta} vuelve a su inicio`, async ({ page }) => {
      await apiFalsa(page);
      await conSesion(page, 'student');
      await page.goto(ruta);
      await expect(page).toHaveURL(INICIO.student);
    });
  }

  test('con sesión abierta, /auth/signin lleva al inicio del rol', async ({ page }) => {
    await apiFalsa(page);
    await conSesion(page, 'admin');
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(INICIO.admin);
  });

  test('una sesión vencida se descarta y pide iniciar sesión', async ({ page }) => {
    await apiFalsa(page);
    await conSesion(page, 'student', { vencida: true });
    await page.goto('/learn/home');
    await expect(page).toHaveURL(/\/auth\/signin$/);
    expect(await page.evaluate(() => localStorage.getItem('gems_session'))).toBeNull();
  });

  test('un 401 del API cierra la sesión y lleva a iniciar sesión', async ({ page }) => {
    await apiFalsa(page, { reglas: [{ method: 'GET', path: /.*/, respond: () => ({ status: 401, body: { message: 'Token inválido' } }) }] });
    await conSesion(page, 'student');
    await page.goto('/learn/home');
    await expect(page).toHaveURL(/\/auth\/signin$/, { timeout: 15_000 });
  });
});

test.describe('Humo · el panel de cada rol abre', () => {
  const PANELES: { rol: Rol; ruta: string; marco: string }[] = [
    { rol: 'student', ruta: '/learn/home', marco: '.slayout__leftnav' },
    { rol: 'student', ruta: '/learn/my-learning', marco: '.slayout__leftnav' },
    { rol: 'instructor', ruta: '/instructor/courses', marco: 'lib-app-sidebar' },
    { rol: 'instructor', ruta: '/education/courses', marco: '.edu-layout__sidebar' },
    { rol: 'admin', ruta: '/admin/dashboard', marco: '.main-layout__sidebar' },
    { rol: 'admin', ruta: '/admin/people', marco: '.main-layout__sidebar' },
    { rol: 'admin', ruta: '/admin/enrollments', marco: '.main-layout__sidebar' },
    { rol: 'admin', ruta: '/admin/reports', marco: '.main-layout__sidebar' },
    { rol: 'super_admin', ruta: '/admin/institutions', marco: '.main-layout__sidebar' },
  ];
  for (const { rol, ruta, marco } of PANELES) {
    test(`${rol} en ${ruta}`, async ({ page }) => {
      await apiFalsa(page);
      await conSesion(page, rol);
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      await expect(page.locator(marco).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('main').first()).toBeVisible();
    });
  }
});
