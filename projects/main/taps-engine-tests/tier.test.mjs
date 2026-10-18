// Pruebas de la lógica pura del motor (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/tier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

// taps-engine.js usa import.meta.url y no toca el DOM al importarse: se puede cargar en Node.
const { pickTier, TIERS } = await import('../public/taps-engine/taps-engine.js');

const nav = (o = {}) => ({ navigator: { hardwareConcurrency: 8, ...o.nav }, coarse: o.coarse ?? true });

test('ahorro de datos o red 2G → capa ligera', () => {
  assert.equal(pickTier(nav({ nav: { connection: { saveData: true } } })), 'light');
  assert.equal(pickTier(nav({ nav: { connection: { effectiveType: '2g' } } })), 'light');
  assert.equal(pickTier(nav({ nav: { connection: { effectiveType: 'slow-2g' } } })), 'light');
});

test('poca memoria o pocos núcleos → capa ligera', () => {
  assert.equal(pickTier(nav({ nav: { deviceMemory: 1 } })), 'light');
  assert.equal(pickTier(nav({ nav: { hardwareConcurrency: 2 } })), 'light');
});

test('memoria media → baja resolución', () => {
  assert.equal(pickTier(nav({ nav: { deviceMemory: 2 } })), 'low');
  assert.equal(pickTier(nav({ nav: { deviceMemory: 3 } })), 'low');
});

test('celular normal → 540x960 a 30 fps; escritorio → alta', () => {
  assert.equal(pickTier(nav({ nav: { deviceMemory: 4 } })), 'normal');
  assert.equal(pickTier(nav({ nav: {} })), 'normal');            // iPhone: no informa deviceMemory
  assert.equal(pickTier(nav({ nav: { deviceMemory: 8 }, coarse: false })), 'high');
  assert.deepEqual(TIERS.normal, { w: 540, h: 960, fps: 30 });
});
