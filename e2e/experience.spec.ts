import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const instructorEmail = process.env.E2E_INSTRUCTOR_EMAIL;
const studentEmail = process.env.E2E_STUDENT_EMAIL;

async function dismissTour(page: Page): Promise<void> {
  const closeTour = page.locator('.driver-popover-close-btn');
  if (await closeTour.waitFor({ state: 'visible', timeout: 1_500 }).then(() => true).catch(() => false)) {
    await closeTour.click();
    await page.locator('.driver-overlay').waitFor({ state: 'detached' });
  }
}

async function signIn(page: Page): Promise<void> {
  return signInAs(page, email!, password!, /\/admin\//);
}

async function signInAs(page: Page, userEmail: string, userPassword: string, destination: RegExp): Promise<void> {
  await page.goto('/auth/signin');
  const emailInput = page.getByLabel('Correo electrónico');
  const passwordInput = page.getByLabel('Contraseña');
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });
  await submit.waitFor();
  // La hidratación puede restaurar el formulario mientras aparece la vista.
  // Llenar la contraseña primero y comprobar ambos valores evita clics inestables.
  await passwordInput.fill(userPassword);
  await emailInput.fill(userEmail);
  await expect(emailInput).toHaveValue(userEmail);
  await expect(passwordInput).toHaveValue(userPassword);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL(destination);

  await dismissTour(page);
}

test.describe('experiencia y accesibilidad', () => {
  test('la pantalla de acceso no tiene violaciones graves de accesibilidad', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page).toHaveTitle('Iniciar sesión | GEMS LMS');
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
    expect(severe, severe.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  });

  test('las páginas privadas redirigen al acceso', async ({ page }) => {
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('el administrador abre su perfil desde el buscador rápido', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Navegación rápida' })).toBeVisible();
    await page.getByLabel('Buscar una sección o acción').fill('perfil');
    await page.getByLabel('Buscar una sección o acción').press('Enter');
    await expect(page).toHaveURL(/\/account\/profile/);
    await expect(page).toHaveTitle('Mi perfil | GEMS LMS');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  });

  test('las preferencias visuales se guardan en el dispositivo', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.goto('/account/profile');
    await page.getByRole('button', { name: 'Claro' }).click();
    await page.getByLabel('Interfaz compacta').check();
    await expect(page.locator('html')).toHaveClass(/light-mode/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('gems-display-preferences')))
      .toContain('"compact":true');
  });

  test('la guía se puede abrir manualmente', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.getByRole('button', { name: 'Ver guía de la plataforma' }).click();
    await expect(page.locator('.driver-popover')).toBeVisible();
    await expect(page.locator('.driver-popover-title')).not.toBeEmpty();
  });

  test('las pantallas principales no tienen violaciones graves de accesibilidad', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    for (const route of ['/admin/dashboard', '/account/profile', '/admin/reports']) {
      await page.goto(route);
      await page.locator('body').waitFor({ state: 'visible' });
      await dismissTour(page);
      const results = await new AxeBuilder({ page }).analyze();
      const severe = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
      expect(severe, `${route}\n${severe.map(item => `${item.id}: ${item.help}`).join('\n')}`).toEqual([]);
    }
  });

  test('las zonas de estudiante e instructor cumplen la auditoría principal', async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!password || !instructorEmail || !studentEmail,
      'Define E2E_INSTRUCTOR_EMAIL, E2E_STUDENT_EMAIL y E2E_ADMIN_PASSWORD para la prueba por roles.');
    const audit = async (routes: string[]): Promise<void> => {
      for (const route of routes) {
        await page.goto(route);
        await dismissTour(page);
        const results = await new AxeBuilder({ page }).analyze();
        const severe = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
        expect(severe, `${route}\n${severe.map(item => `${item.id}: ${item.help}`).join('\n')}`).toEqual([]);
      }
    };

    await signInAs(page, instructorEmail!, password!, /\/instructor/);
    await audit(['/instructor', '/education/courses']);
    await page.evaluate(() => localStorage.removeItem('gems_session'));
    await page.goto('/auth/signin');
    await signInAs(page, studentEmail!, password!, /\/learn\//);
    await audit(['/learn/home', '/learn/catalog']);
  });
});
