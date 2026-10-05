import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import { Browser, BrowserContext, expect, Page, test } from '@playwright/test';

/**
 * Barrido de experiencia: entra una vez por rol y recorre cada sección de su navegación en tema
 * oscuro y claro, en escritorio y móvil. En cada pantalla falla si
 *  - la API responde con error o una petición no llega (front desconectado del back),
 *  - hay errores en consola,
 *  - un control visible queda tapado por otro elemento o la página desborda en horizontal,
 *  - axe encuentra problemas graves de accesibilidad.
 * Guarda una captura de cada pantalla en test-results/ux-sweep para revisión visual.
 */

const password = process.env.E2E_ADMIN_PASSWORD;
const roles = [
  { name: 'superadmin', email: process.env.E2E_SUPER_ADMIN_EMAIL, home: /\/admin\// },
  { name: 'admin', email: process.env.E2E_ADMIN_EMAIL, home: /\/admin\// },
  { name: 'instructor', email: process.env.E2E_INSTRUCTOR_EMAIL, home: /\/instructor\// },
  { name: 'estudiante', email: process.env.E2E_STUDENT_EMAIL, home: /\/learn\// },
];
const themes = ['dark', 'light'] as const;
const viewports = [
  { name: 'escritorio', width: 1440, height: 900 },
  { name: 'movil', width: 390, height: 844 },
];

async function signIn(browser: Browser, email: string, home: RegExp): Promise<BrowserContext> {
  // Sin animaciones: axe mediría colores a mitad de un fundido de entrada.
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/auth/signin');
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });
  await submit.waitFor();
  await page.waitForLoadState('networkidle');
  // Hydration can reset fields typed before Angular takes over; retry until the form accepts them.
  await expect(async () => {
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password!);
    await expect(submit).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
  await submit.click();
  await expect(page).toHaveURL(home);
  // La guía de bienvenida se marca como vista para que no tape la pantalla en el barrido.
  await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem('gems_session') ?? '{}').user;
    if (user) localStorage.setItem(`gems-onboarding-${user.id}-${user.role}`, '1');
  });
  await page.close();
  return context;
}

/** Rutas internas de la navegación lateral del rol, más el perfil. */
async function navigationRoutes(page: Page): Promise<string[]> {
  const hrefs = await page.locator('aside a[href^="/"], nav a[href^="/"]').evaluateAll(links =>
    links.map(a => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
  return [...new Set(hrefs.filter(h => h && !h.startsWith('/auth')))];
}

/** Controles visibles cuyo centro está cubierto por otro elemento ajeno. */
async function coveredControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [role="button"], [role="tab"]');
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.opacity === '0' || el.closest('[aria-hidden="true"]')) continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      // Recortado por un contenedor con scroll: no está tapado, solo fuera de su área visible.
      let clipped = false;
      for (let p = el.parentElement; p && !clipped; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(o.overflowY + o.overflowX)) {
          const b = p.getBoundingClientRect();
          clipped = x < b.left || x > b.right || y < b.top || y > b.bottom;
        }
      }
      if (clipped) continue;
      const top = document.elementFromPoint(x, y);
      if (!top || el.contains(top) || top.contains(el)) continue;
      // Un control dentro de un contenedor con scroll puede quedar bajo su propio borde: se ignora
      // solo si el elemento encima es su contenedor desplazable.
      if (top.contains(el.parentElement)) continue;
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
      const over = `${top.tagName.toLowerCase()}.${[...top.classList].join('.')}`.slice(0, 60);
      out.push(`"${label}" tapado por ${over}`);
    }
    return out;
  });
}

for (const role of roles) {
  test.describe(`barrido UX: ${role.name}`, () => {
    test.skip(!role.email || !password, 'Define las credenciales E2E.');
    let context: BrowserContext;
    test.beforeAll(() => fs.mkdirSync('test-results/ux-sweep', { recursive: true }));

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      context = await signIn(browser, role.email!, role.home);
    });

    test.afterAll(async () => context?.close());

    for (const viewport of viewports) {
      for (const theme of themes) {
        test(`${viewport.name} · tema ${theme}`, async () => {
          test.setTimeout(240_000);
          const page = await context.newPage();
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.addInitScript(t => {
            const key = 'gems-display-preferences';
            const current = JSON.parse(localStorage.getItem(key) ?? '{}');
            localStorage.setItem(key, JSON.stringify({ ...current, theme: t }));
          }, theme);

          const problems: string[] = [];
          let current = '';
          page.on('console', msg => {
            if (msg.type() === 'error') problems.push(`${current} consola: ${msg.text().slice(0, 160)}`);
          });
          page.on('response', res => {
            if (res.url().includes('/api/') && res.status() >= 400) {
              problems.push(`${current} API ${res.status()} ${res.request().method()} ${new URL(res.url()).pathname}`);
            }
          });
          page.on('requestfailed', req => {
            // Navigating away cancels pending requests (net::ERR_ABORTED); that is not a backend failure.
            if (req.url().includes('/api/') && !req.failure()?.errorText.includes('ABORTED')) problems.push(`${current} sin respuesta: ${new URL(req.url()).pathname}`);
          });

          await page.goto('/');
          await page.waitForLoadState('networkidle');
          const routes = await navigationRoutes(page);
          expect(routes.length, 'la navegación del rol no tiene enlaces').toBeGreaterThan(0);

          for (const route of routes) {
            current = route;
            await page.goto(route);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('body')).not.toContainText('Ocurrió un error inesperado');

            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            if (overflow > 1) problems.push(`${route} desborda ${overflow}px en horizontal`);

            for (const covered of await coveredControls(page)) problems.push(`${route} ${covered}`);

            const axe = await new AxeBuilder({ page }).exclude('.driver-popover').analyze();
            for (const v of axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')) {
              problems.push(`${route} a11y ${v.id}: ${v.nodes.length} elemento(s)`);
              for (const n of v.nodes.slice(0, 6)) {
                fs.appendFileSync('test-results/ux-sweep/a11y.log', `${role.name}|${theme}|${viewport.name}|${route}|${v.id}|${n.target.join(' ')}|${(n.any[0]?.message ?? n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 220)}\n`);
              }
            }

            const file = `${role.name}-${viewport.name}-${theme}${route.replace(/\//g, '_')}.png`;
            await page.screenshot({ path: `test-results/ux-sweep/${file}`, fullPage: false });
          }

          await page.close();
          expect(problems, problems.join('\n')).toEqual([]);
        });
      }
    }
  });
}
