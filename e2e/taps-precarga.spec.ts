import { expect, test, type Page } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Precarga del Tap vecino (motor v12): al deslizar rápido adelante y atrás, cambiando de tema, nunca hay más de 2 escenarios
 * WebGL vivos (el activo + uno en pausa) ni fotos fijas o capas de espera huérfanas (fuera de su ranura o lejos del Tap a la vista).
 *
 * Uso: npx playwright test e2e/taps-precarga.spec.ts --workers=1  (con E2E_ESTATICO=1 contra el build estático)
 */
test.beforeEach(async ({ page }) => { await sinAudio(page); });
test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

type IStage = { mode: string; stats(): { canvas?: string | null } };

const revisar = (page: Page) => page.evaluate(() => {
  const taps = [...document.querySelectorAll('.tap')], activo = taps.findIndex(t => t.classList.contains('tap--active'));
  const reales = [...document.querySelectorAll('.te-stage')] as (HTMLElement & { tapsStage?: IStage })[];
  const webgl = reales.filter(r => r.tapsStage && r.tapsStage.stats().canvas !== '2d' && r.tapsStage.mode === '3d').length;
  const capas = [...document.querySelectorAll('.te-huella')] as HTMLElement[];
  const huerfanas = capas.filter(c => {
    const i = taps.findIndex(t => t.contains(c));
    return !c.parentElement?.classList.contains('tap__stage') || i < 0 || Math.abs(i - activo) > 2 || !c.inert || !!c.querySelector('[id]');
  }).length;
  return { webgl, reales: reales.length, capas: capas.length, huerfanas };
});

async function deslizar(page: Page, pasos: number): Promise<void> {
  await page.evaluate(n => {
    const s = document.querySelector('.tap--active') as HTMLElement, f = s.parentElement as HTMLElement;
    f.scrollBy({ top: n * s.getBoundingClientRect().height, behavior: 'instant' as ScrollBehavior });
  }, pasos);
}

test('deslizar rápido adelante y atrás: como mucho 2 WebGL y ninguna foto o capa huérfana', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/taps');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForFunction(() => !!document.querySelector('.tap--active .te-stage'), null, { timeout: 20_000 });
  const temas = new Set<string>();
  for (const paso of [1, 1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1, 1, 1]) {
    await deslizar(page, paso);
    await page.waitForTimeout(paso > 0 ? 350 : 150);
    const r = await revisar(page);
    expect(r.webgl, 'WebGL vivos').toBeLessThanOrEqual(2);
    expect(r.huerfanas, 'capas huérfanas').toBe(0);
    const t = await page.evaluate(() => (document.querySelector('.tap--active .te-stage') as HTMLElement | null)?.dataset['theme']);
    if (t) temas.add(t);
  }
  await page.waitForTimeout(2500);                                     // que termine lo que quedó en reposo
  const fin = await revisar(page);
  expect(fin.webgl).toBeLessThanOrEqual(2);
  expect(fin.huerfanas).toBe(0);
  expect(fin.reales, 'un escenario por tema como mucho').toBeLessThanOrEqual(3);
  expect(fin.capas, 'fotos y capas solo a ±2 Taps').toBeLessThanOrEqual(5);
  expect(temas.size, 'cambió de tema al deslizar').toBeGreaterThan(1);
});
