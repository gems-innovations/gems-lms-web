// El 3D que llega tarde (pasó a la capa ligera) no debe seguir dibujando en segundo plano: se libera y su bucle nunca arranca.
// DOM mínimo falso (sin dependencias): solo lo que usa create() del motor.
import test from 'node:test';
import assert from 'node:assert/strict';

function el(tag = 'div') {
  const e = {
    tagName: tag, style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    width: 0, height: 0, clientWidth: 375, clientHeight: 812, offsetWidth: 100, isConnected: true, textContent: '',
    appendChild(c) { this.children.push(c); c.parentElement = this; return c; }, remove() {}, setAttribute() {}, addEventListener() {}, getBoundingClientRect: () => ({ width: 375, height: 812, left: 0, top: 0 }),
    getContext: () => new Proxy({}, { get: () => () => {} }),
    querySelector(sel) { return (this._q ??= {})[sel] ??= el(sel.includes('canvas') || /te-(gl|char)/.test(sel) ? 'canvas' : 'div'); },
    set innerHTML(_v) { /* las capas se crean al pedirlas con querySelector */ },
  };
  return e;
}
globalThis.document ??= { createElement: el, head: el('head'), querySelector: () => null, addEventListener() {}, removeEventListener() {}, hidden: false, fonts: { add() {} } };
globalThis.window ??= { addEventListener() {}, removeEventListener() {} };
globalThis.location ??= { href: 'http://localhost/' };
globalThis.requestAnimationFrame ??= fn => setTimeout(() => fn(performance.now()), 16);
globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
const { create } = await import(new URL('../public/taps-engine/taps-engine.js', import.meta.url).href);
const espera = ms => new Promise(r => setTimeout(r, ms));

/** Tema 2D falso cuyo renderizador tarda `ms` en crearse y cuenta fotogramas y liberaciones. */
function tema(ms) {
  const n = (globalThis.__cuenta = { frames: 0, dispose: 0, setScene: 0 });
  const code = `export async function createRenderer() { await new Promise(r => setTimeout(r, ${ms})); const n = globalThis.__cuenta;
    return { setScene() { n.setScene++; return Promise.resolve(); }, preload() {}, play() {}, fx() {}, frame() { n.frames++; }, anchor: () => [10, 10], setSize() {}, dispose() { n.dispose++; } }; }`;
  return [{ id: 'falso', canvas: '2d', renderer: 'data:text/javascript,' + encodeURIComponent(code), __url: 'http://localhost/t/theme.json', reactions: {} }, n];
}

test('3D que llega tarde: queda la capa ligera, el renderizador se libera y no dibuja nada en segundo plano', async () => {
  const [theme, n] = tema(150);
  const modos = [];
  const stage = create(el(), { theme, slowMs: 40, onEvent: (k, d) => k === 'mode' && modos.push(d.mode) });
  await stage.ready;
  await stage.setScene({ world: 'x' });                     // pedir escenas mientras carga no debe arrancar el bucle
  await espera(400);
  await stage.setScene({ world: 'y' });
  await espera(200);
  assert.equal(stage.mode, 'light');
  assert.deepEqual(modos, ['light']);
  assert.equal(n.dispose, 1, 'el renderizador que llegó tarde se libera');
  assert.equal(n.frames, 0, 'ni un fotograma: el bucle no corre escondido');
  stage.destroy();
});

test('3D a tiempo: se ve, usa la última escena pedida mientras cargaba y dibuja', async () => {
  const [theme, n] = tema(20);
  const stage = create(el(), { theme, slowMs: 2000 });
  await stage.ready;
  void stage.setScene({ world: 'x' });
  assert.equal(await stage.ready3d, '3d');
  await espera(120);
  assert.ok(n.setScene >= 1 && n.frames > 1, 'dibuja');
  assert.equal(n.dispose, 0);
  stage.destroy();
  assert.equal(n.dispose, 1, 'destroy libera el renderizador');
});
