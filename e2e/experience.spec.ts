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

  test('una dirección inexistente muestra una salida clara', async ({ page }) => {
    await page.goto('/contenido-que-no-existe');
    await expect(page).toHaveURL(/\/not-found/);
    await expect(page).toHaveTitle('Página no encontrada | GEMS LMS');
    await expect(page.getByRole('heading', { name: 'Este enlace no lleva a ningún contenido' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
  });

  test('el administrador abre su perfil desde el buscador rápido', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Navegación rápida' })).toBeVisible();
    await page.getByLabel('Buscar una sección o acción').fill('perfil');
    await page.getByLabel('Buscar una sección o acción').press('Enter');
    await expect(page).toHaveURL(/\/admin\/profile/);
    await expect(page).toHaveTitle('Mi perfil | GEMS LMS');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.locator('.app-sidebar')).toBeVisible();
  });

  test('el perfil conserva la navegación y las notificaciones caben en pantalla para cada rol', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!email || !password || !instructorEmail || !studentEmail,
      'Define las credenciales E2E de administrador, instructor y estudiante.');

    const roles = [
      { email: email!, destination: /\/admin\//, profile: /\/admin\/profile/, sidebar: '.app-sidebar', logo: '.app-sidebar__brand-icon img' },
      { email: instructorEmail!, destination: /\/instructor/, profile: /\/instructor\/profile/, sidebar: '.app-sidebar', logo: '.app-sidebar__brand-icon img' },
      { email: studentEmail!, destination: /\/learn\//, profile: /\/learn\/profile/, sidebar: '.slayout__leftnav', logo: '.slayout__brand-icon img' },
    ];

    for (const role of roles) {
      await signInAs(page, role.email, password!, role.destination);
      await page.goto('/account/profile');
      await expect(page).toHaveURL(role.profile);
      await expect(page.locator(role.sidebar)).toBeVisible();
      await expect(page.locator(role.logo)).toHaveJSProperty('naturalWidth', 144);

      await page.getByRole('button', { name: 'Notificaciones' }).click();
      const panel = page.getByRole('dialog', { name: 'Notificaciones' });
      await expect(panel).toBeVisible();
      const bounds = await panel.boundingBox();
      const viewport = page.viewportSize()!;
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
      await page.evaluate(() => localStorage.removeItem('gems_session'));
      await page.goto('/auth/signin');
    }
  });

  test('las secciones principales de cada rol mantienen navegación y ancho útil', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!email || !password || !instructorEmail || !studentEmail,
      'Define las credenciales E2E de administrador, instructor y estudiante.');

    const cases = [
      { email: email!, destination: /\/admin\//, sidebar: '.app-sidebar',
        routes: ['/admin/dashboard', '/admin/people', '/admin/enrollments', '/admin/periods', '/admin/reports', '/admin/audit', '/education/courses', '/education/learning-paths'] },
      { email: instructorEmail!, destination: /\/instructor/, sidebar: '.app-sidebar',
        routes: ['/instructor/courses', '/instructor/stats', '/instructor/question-bank', '/instructor/profile'] },
      { email: studentEmail!, destination: /\/learn\//, sidebar: '.slayout__leftnav',
        routes: ['/learn/home', '/learn/my-learning', '/learn/catalog', '/learn/profile'] },
    ];

    for (const role of cases) {
      await signInAs(page, role.email, password!, role.destination);
      for (const route of role.routes) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}$`));
        const sidebar = route.startsWith('/education/') ? '.edu-layout__sidebar' : role.sidebar;
        await expect(page.locator(sidebar)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Notificaciones' })).toBeVisible();
        const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
        expect(width.content, `${route} produce desbordamiento horizontal`).toBeLessThanOrEqual(width.viewport + 2);
      }
      await page.evaluate(() => localStorage.removeItem('gems_session'));
      await page.goto('/auth/signin');
    }
  });

  test('el perfil y las notificaciones conservan espacio útil en móvil', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!email || !password || !instructorEmail || !studentEmail,
      'Define las credenciales E2E de administrador, instructor y estudiante.');
    await page.setViewportSize({ width: 390, height: 844 });
    const roles = [
      { email: email!, destination: /\/admin\//, sidebar: '.app-sidebar', main: '.main-layout__content' },
      { email: instructorEmail!, destination: /\/instructor/, sidebar: '.app-sidebar', main: '.ilayout__main' },
      { email: studentEmail!, destination: /\/learn\//, sidebar: '.slayout__leftnav', main: '.slayout__main' },
    ];
    for (const role of roles) {
      await signInAs(page, role.email, password!, role.destination);
      await page.goto('/account/profile');
      const sidebar = await page.locator(role.sidebar).boundingBox();
      const main = await page.locator(role.main).boundingBox();
      expect(sidebar!.width).toBeLessThanOrEqual(65);
      expect(main!.width).toBeGreaterThanOrEqual(280);
      await page.getByRole('button', { name: 'Notificaciones' }).click();
      const panel = await page.getByRole('dialog', { name: 'Notificaciones' }).boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(0);
      expect(panel!.x + panel!.width).toBeLessThanOrEqual(391);
      await page.evaluate(() => localStorage.removeItem('gems_session'));
      await page.goto('/auth/signin');
    }
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

  test('los controles clave conservan contraste y tamaño en el panel', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await signIn(page);
    await page.goto('/admin/profile');
    const save = page.getByRole('button', { name: 'Guardar cambios' });
    await expect(save).toBeVisible();
    const buttonStyle = await save.evaluate(element => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor, height: element.getBoundingClientRect().height };
    });
    expect(buttonStyle.foreground).toBe('rgb(255, 255, 255)');
    expect(buttonStyle.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyle.height).toBeGreaterThanOrEqual(43.5);

    await page.goto('/admin/periods');
    await page.getByRole('button', { name: 'Nuevo período' }).click();
    const dates = page.locator('input[type="date"]');
    await expect(dates).toHaveCount(2);
    for (const input of await dates.all()) {
      const height = await input.evaluate(element => element.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(44);
    }
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
