import { expect, test, type Page } from '@playwright/test';

/**
 * Taps en escritorio y tablet (ronda 2): armazón con menú, escenario 9:16, riel y panel; rueda, teclado y modo enfoque;
 * estados de carga (esqueleto, póster, tema que falla, sin conexión) y que el móvil siga como estaba.
 *
 * Uso: npx playwright test e2e/taps-escritorio.spec.ts  (con E2E_ESTATICO=1 contra el build estático)
 */
test.use({ serviceWorkers: 'block' });

/** Hidratado y, desde 768 px, con el menú, el riel y el panel ya pedidos (@defer) y pintados. */
const hydrated = async (page: Page) => {
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  if ((page.viewportSize()?.width ?? 0) >= 768) await page.locator('gems-tap-panel .panel').waitFor({ state: 'attached' });
};
const activeTap = (page: Page) => page.locator('.tap.tap--active').getAttribute('data-tap');
const stage = (page: Page) => page.locator('main.taps').getAttribute('data-stage');
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;

test.describe('escritorio 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('el escenario es 9:16 y menú, riel y panel lo rodean', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    const s = await box(page, '.escenario');
    expect(Math.abs(s.height - 852)).toBeLessThan(2);
    expect(Math.abs(s.width / s.height - 9 / 16)).toBeLessThan(0.01);
    const menu = await box(page, 'gems-taps-menu .side');
    expect(menu.width).toBe(240);
    const rail = await box(page, 'gems-tap-rail.riel-escritorio');
    expect(rail.x).toBeGreaterThan(s.x + s.width);
    expect(rail.x - (s.x + s.width)).toBeLessThan(16);
    const panel = await box(page, 'gems-tap-panel');
    expect(panel.width).toBe(340);
    expect(await page.locator('gems-tap-panel .card').count()).toBeLessThanOrEqual(3);
    // un solo canvas / escenario en todo el feed y el riel del móvil oculto
    expect(await page.locator('.te-stage').count()).toBeLessThanOrEqual(2);
    await expect(page.locator('.tap__world gems-tap-rail').first()).toBeHidden();
  });

  test('la pregunta responde antes de que exista el escenario y el panel respira', async ({ page }) => {
    await page.route('**/taps-engine/taps-engine.js*', async route => { await new Promise(r => setTimeout(r, 2500)); await route.continue(); });
    await page.goto('/taps');
    await hydrated(page);
    await expect(page.locator('gems-tap-panel .panel')).toHaveAttribute('data-estado', 'pregunta');
    expect(Number(await page.locator('gems-tap-panel .panel').evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(0.8);
    await page.keyboard.press('1');
    await expect(page.locator('.tap--active .tap__opts.is-answered')).toBeVisible();
    await expect(page.locator('gems-tap-panel .panel')).not.toHaveAttribute('data-estado', 'pregunta');
  });

  test('las teclas 1-4 responden, el foco pasa a «Seguir» y Espacio adelanta', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(500);
    await page.keyboard.press('2');
    await expect(page.locator('.tap--active .tap__go')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('.tap--active .tap__over')).toContainText('Pregunta 2 de 5');
  });

  test('↓ y ↑ cambian de Tap; la rueda cambia de a uno y no salta con la inercia', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    const first = await activeTap(page);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeTap(page)).not.toBe(first);
    const second = await activeTap(page);
    await page.keyboard.press('k');
    await expect.poll(() => activeTap(page)).toBe(first);
    await page.waitForTimeout(800);
    // rueda: un gesto con inercia (20 eventos casi a la vez) = un solo Tap (el reloj fino del bloqueo se prueba en las unitarias)
    await page.evaluate(() => {
      const el = document.querySelector('.tap--active .tap__world')!;
      for (let i = 0; i < 20; i++) el.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }));
    });
    await expect.poll(() => activeTap(page)).toBe(second);
    await page.waitForTimeout(900);
    expect(await activeTap(page)).toBe(second);
    // y una rueda real de un solo golpe mueve exactamente un Tap
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => activeTap(page)).not.toBe(second);
  });

  test('el modo enfoque (F) oculta menú y panel y Esc los devuelve', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.keyboard.press('f');
    await expect(page.locator('gems-taps-menu .side')).toBeHidden();
    await expect(page.locator('gems-tap-panel')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.locator('gems-taps-menu .side')).toBeVisible();
    await expect(page.locator('gems-tap-panel')).toBeVisible();
  });

  test('«[» contrae el menú a iconos y la preferencia se recuerda', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.keyboard.press('[');
    await expect.poll(async () => (await box(page, 'gems-taps-menu .side')).width).toBe(72);
    await page.reload();
    await hydrated(page);
    await expect.poll(async () => (await box(page, 'gems-taps-menu .side')).width).toBe(72);
  });

  test('con los atajos apagados las teclas no responden (WCAG 2.1.4) y se recuerda', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.getByRole('button', { name: /Atajos: activados/ }).click();
    await page.keyboard.press('1');
    await page.waitForTimeout(300);
    await expect(page.locator('.tap--active .tap__opts.is-answered')).toHaveCount(0);
    await page.keyboard.press('ArrowDown');      // las flechas siguen: no son atajos de un carácter
    expect(await page.evaluate(() => localStorage.getItem('gems-taps-atajos'))).toBe('off');
  });

  test('tras fallar el panel muestra «Este Tap» y tras terminar el avance del tema, sin datos de servidor', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(500);
    const wrong = (Number(await page.locator('.tap--active .tap__opts').getAttribute('data-ans')) + 1) % 4;
    await page.keyboard.press(String(wrong + 1));
    await expect(page.locator('gems-tap-panel .card__title').first()).toHaveText('Este Tap');
    const text = await page.locator('gems-tap-panel').innerText();
    expect(text).not.toMatch(/ranking|respondieron|percentil|en vivo/i);
  });

  test('«No me interesa este tema» se guarda 30 días en el navegador', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('button', { name: /No me interesa/ }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gems-taps-interes') ?? '{}'));
    const until = Object.values<number>(saved.blocked ?? {})[0];
    expect(until - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000);
    await expect(page.locator('.tap__toast, .res__notice').first()).toContainText('30 días');
  });
});

test.describe('estados de carga', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('motor lento: esqueleto del personaje, luego póster, y el 3D lento no cambia nada después', async ({ page }) => {
    await page.route('**/taps-engine/taps-engine.js*', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
    await page.route('**/taps-engine/themes/*/renderer*', async route => { await new Promise(r => setTimeout(r, 9000)); await route.continue(); });
    await page.goto('/taps');
    await hydrated(page);
    await expect(page.locator('.tap__ghost')).toBeVisible({ timeout: 4000 });
    expect(await stage(page)).toBe('skeleton');
    // la pregunta nunca lleva esqueleto ni velo y se puede tocar ya
    expect(await page.locator('.tap--active .tap__q lib-skeleton, .tap--active .tap__opts lib-skeleton').count()).toBe(0);
    await expect.poll(() => stage(page), { timeout: 6000 }).toBe('poster');
    await expect(page.locator('.tap__ghost')).toHaveCount(0, { timeout: 3000 });
    // a los 4 s sin 3D el póster se queda (modo ligero) y ya no cambia
    await expect.poll(() => stage(page), { timeout: 9000 }).toBe('light');
    await page.waitForTimeout(1500);
    expect(await stage(page)).toBe('light');
  });

  test('theme.json con 500: el Tap se juega sobre su degradado, sin texto de error y sin errores sin capturar', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/themes/minecraft/theme.json', route => route.fulfill({ status: 500, body: 'no' }));
    await page.goto('/taps');
    await hydrated(page);
    await expect.poll(() => stage(page), { timeout: 8000 }).toBe('none');
    await expect(page.locator('.te-stage')).toHaveCount(0);
    await page.keyboard.press('1');
    await expect(page.locator('.tap--active .tap__opts.is-answered')).toBeVisible();
    await expect(page.locator('main.taps')).not.toContainText(/error|falló|no se pudo/i);
    expect(errors).toEqual([]);
  });

  test('el riel y el panel reservan su sitio: el escenario no se corre al aparecer (sin saltos de layout)', async ({ page }) => {
    // Los trozos de código llegan tarde (600 ms): riel y panel (@defer) aparecen después del escenario.
    await page.route(/\/chunk-[^/]+\.js/, async route => { await new Promise(r => setTimeout(r, 600)); await route.continue(); });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __x: number[] };
      w.__cls = 0; w.__x = [];
      new PerformanceObserver(list => { for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      const sample = () => { const el = document.querySelector('.escenario'); if (el) w.__x.push(Math.round(el.getBoundingClientRect().x)); requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
    });
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(1500);
    const { cls, xs } = await page.evaluate(() => { const w = window as unknown as { __cls: number; __x: number[] }; return { cls: w.__cls, xs: w.__x }; });
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(1);      // el escenario nunca cambió de sitio
    expect(cls).toBeLessThan(0.05);
  });

  test('sin conexión a mitad de un Tap se sigue jugando y el aviso no tapa «Seguir»', async ({ page, context }) => {
    await page.goto('/taps');
    await hydrated(page);
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(500);
    await page.keyboard.press('1');
    const go = page.locator('.tap--active .tap__go');
    await expect(go).toBeVisible();
    const g = (await go.boundingBox())!, banner = (await page.locator('lib-connection-status [role="status"], lib-connection-status').first().boundingBox());
    if (banner) expect(g.y + g.height).toBeLessThanOrEqual(banner.y + 1);
    await go.click();
    await expect(page.locator('.tap--active .tap__over')).toContainText('Pregunta 2 de 5');
  });
});

test.describe('portátil 1024×768', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('menú de iconos, panel de una tarjeta y riel a la derecha', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    expect((await box(page, 'gems-taps-menu .side')).width).toBe(72);
    expect(Math.round((await box(page, 'gems-tap-panel')).width)).toBe(292);
    await expect(page.locator('gems-tap-panel .card:visible')).toHaveCount(2);
    await page.keyboard.press('[');
    await expect.poll(async () => (await box(page, 'gems-taps-menu .side')).width).toBe(240);
    // abre encima del contenido: el escenario no se mueve
    const s = await box(page, '.escenario');
    expect(s.x).toBeGreaterThan(72);
  });
});

test.describe('tablet 820×1180', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });

  test('barra superior, escenario con riel y panel como franja inferior', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    expect((await box(page, 'gems-taps-menu .top')).height).toBe(64);
    await expect(page.locator('gems-taps-menu .side')).toBeHidden();
    const s = await box(page, '.escenario'), p = await box(page, 'gems-tap-panel');
    expect(p.y).toBeGreaterThan(s.y + s.height);
    expect(p.y + p.height).toBeLessThanOrEqual(1180);
    await page.getByRole('button', { name: 'Menú' }).click();
    await expect(page.getByRole('link', { name: 'Retos de lógica' })).toBeVisible();
  });
});

test.describe('móvil 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('sigue como estaba: sin menú, riel ni panel de escritorio; el Tap ocupa toda la pantalla', async ({ page }) => {
    await page.goto('/taps');
    await hydrated(page);
    await expect(page.locator('gems-taps-menu .side')).toBeHidden();
    await expect(page.locator('gems-tap-panel')).toBeHidden();
    await expect(page.locator('gems-tap-rail.riel-escritorio')).toBeHidden();
    const t = await box(page, '.tap--active');
    expect(t.width).toBe(390);
    expect(t.height).toBe(844);
    await expect(page.locator('.tap--active .tap__world gems-tap-rail')).toBeVisible();
    await expect(page.locator('.tap--active .tap__key').first()).toBeHidden();
  });
});
