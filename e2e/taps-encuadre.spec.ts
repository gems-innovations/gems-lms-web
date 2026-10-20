import { expect, test, type Page } from '@playwright/test';
import { sinAudio } from './humo-soporte';

/**
 * Encuadre de los personajes (motor v11, stage.setSafeArea): en el celular la tarjeta de la pregunta ocupa la mitad de abajo,
 * así que el personaje tiene que quedar ENCIMA de ella (entero o, en un primer plano, cabeza, pecho y parte del torso) y debajo
 * de la barra, en los tres temas, en los planos más extremos y con los encuadres de lado. Se mide la caja que da el propio
 * motor (stage.caja(): anclas del renderizador en 3D/2D, caja de la capa ligera si no) y, aparte, la capa ligera (la que ve
 * quien no tiene 3D). En escritorio el panel no tapa al personaje y el encaje no lo mueve.
 *
 * Uso: npx playwright test e2e/taps-encuadre.spec.ts --workers=1  (con E2E_ESTATICO=1 contra el build estático)
 */
test.beforeEach(async ({ page }) => { await sinAudio(page); });
test.use({ serviceWorkers: 'block' });

interface IMedida { modo: string; top: number; pecho: number; pies: number; ligTop: number; ligPies: number; zonaTop: number; panelTop: number; alto: number }
type IStage = { scene: object; mode: string; ready3d: Promise<unknown>; setScene(x: object): Promise<void>; caja(): { modo: string; top: number; pecho: number; pies: number } };

const TAPS = { minecraft: 'mc-gancho', estudio: 'lg-gancho', aventura: 'cu-mitos' } as const;
const SEL = '.tap--active .tap__stage .te-stage';

/** Abre el Tap, espera a que el escenario decida su modo y devuelve una función que pone un plano y mide cuando se quedó quieto. */
async function abrir(page: Page, id: string): Promise<(plano: string, shot?: string) => Promise<IMedida>> {
  await page.goto(`/taps?t=${id}`);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-taps-live'));
  await page.waitForFunction(sel => !!(document.querySelector(sel) as unknown as { tapsStage?: unknown } | null)?.tapsStage, SEL, { timeout: 20_000 });
  await page.evaluate(sel => (document.querySelector(sel) as unknown as { tapsStage: IStage }).tapsStage.ready3d.catch(() => null), SEL);
  const medir = () => page.evaluate(sel => {
    const root = document.querySelector(sel) as HTMLElement & { tapsStage: IStage };
    const r = root.getBoundingClientRect(), c = root.tapsStage.caja(), lig = root.querySelector('.te-light')!.getBoundingClientRect();
    const tap = root.closest('.tap')!;
    return {
      modo: c.modo, top: c.top, pecho: c.pecho, pies: c.pies, ligTop: lig.top - r.top, ligPies: lig.bottom - r.top, alto: r.height,
      zonaTop: tap.querySelector('.tap__world')!.getBoundingClientRect().top - r.top,
      panelTop: tap.querySelector('.tap__panel')!.getBoundingClientRect().top - r.top,
    };
  }, SEL);
  return async (plano: string, shot = 'centro') => {
    await page.evaluate(async ([sel, plano, shot]) => {
      const s = (document.querySelector(sel) as unknown as { tapsStage: IStage }).tapsStage;
      await s.setScene({ ...s.scene, shot, camara: plano, enter: undefined, transicion: undefined });
    }, [SEL, plano, shot] as const);
    // hasta que la caja (3D o ligera) se quede quieta: dos lecturas seguidas iguales (el 3D por software puede ir lento)
    let antes = '';
    await expect.poll(async () => {
      const m = await medir(), clave = [m.modo, m.top, m.pies, m.ligTop, m.ligPies].map(v => (typeof v === 'number' ? Math.round(v) : v)).join('|');
      const quieto = clave === antes; antes = clave; return quieto;
    }, { timeout: 15_000, intervals: [250, 250, 400, 600, 1000] }).toBe(true);
    return medir();
  };
}

/** De la cabeza a los pies; en un primer plano (el personaje no cabe entero, a propósito) basta la cabeza, el pecho y algo del torso. */
const hasta = (m: IMedida, plano: string) => (plano === 'primer-plano' ? m.pecho + 0.25 * (m.pecho - m.top) : m.pies);

function comprobar(m: IMedida, plano: string, donde: string): void {
  // el personaje (o su proyección en 3D) por encima de la tarjeta y por debajo de la barra
  expect(hasta(m, plano), `${donde}: no queda tapado por la tarjeta`).toBeLessThanOrEqual(m.panelTop + 2);
  expect(m.top, `${donde}: la cabeza no se va bajo la barra`).toBeGreaterThanOrEqual(m.zonaTop - 6);
  // la capa ligera (sin 3D) también
  expect(m.ligPies, `${donde}: capa ligera sobre la tarjeta`).toBeLessThanOrEqual(m.panelTop + 2);
  expect(m.ligTop, `${donde}: capa ligera bajo la barra`).toBeGreaterThanOrEqual(m.zonaTop - 6);
}

test.describe('celular 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

  for (const [tema, id] of Object.entries(TAPS)) {
    test(`${tema}: el personaje queda sobre la tarjeta en primer plano, contrapicado y cenital`, async ({ page }, info) => {
      test.setTimeout(180_000);                                         // 12 combinaciones; el 3D por software es lento
      const medir = await abrir(page, id);
      const modos = new Set<string>();
      for (const plano of ['primer-plano', 'contrapicado', 'cenital']) for (const shot of ['centro', 'izquierda', 'cerca-derecha', 'lejos']) {
        const m = await medir(plano, shot), donde = `${tema} ${plano} ${shot} (${m.modo})`;
        modos.add(m.modo);
        expect(['3d', 'light']).toContain(m.modo);
        expect(m.panelTop, `${donde}: la tarjeta ocupa la mitad de abajo`).toBeLessThan(m.alto * 0.75);
        comprobar(m, plano, donde);
      }
      info.annotations.push({ type: 'modo', description: `${tema}: ${[...modos].join(', ')}` });   // 3D o capa ligera, queda en el reporte
    });
  }
});

test.describe('escritorio 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  for (const [tema, plano] of [['estudio', 'general'], ['estudio', 'cenital'], ['estudio', 'primer-plano'], ['aventura', 'general'], ['aventura', 'primer-plano'], ['aventura', 'cenital']] as const) {
    test(`${tema} ${plano}: el panel no tapa al personaje y el encaje no lo mueve sin necesidad`, async ({ page }, info) => {
      const medir = await abrir(page, TAPS[tema]);
      const m = await medir(plano);
      info.annotations.push({ type: 'modo', description: `${tema} ${plano}: ${m.modo}` });
      comprobar(m, plano, `${tema} ${plano} (${m.modo})`);
      // en escritorio nunca se achica y, si el panel roza al personaje (aventura: pies al 68 %), solo el ajuste mínimo
      // (~46 px). Antes el encaje centraba la banda y la movía más de 100 px por un desborde de pocos.
      const v = await page.locator(SEL).evaluate(el => ['--te-f-s', '--te-f-y'].map(p => getComputedStyle(el).getPropertyValue(p).trim()));
      expect(['', '1']).toContain(v[0]);
      expect(Math.abs(parseFloat(v[1] || '0'))).toBeLessThanOrEqual(60);
    });
  }
});
