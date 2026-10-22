// Tema «época»: cada personaje del theme.json tiene un look válido (piezas del catálogo y colores #rrggbb), cada escenario
// declarado se pinta y el rig dibuja todas las piezas del catálogo sin lanzar. Es la base del diseñador de personajes 2D.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOGO, POSES, drawHost, lookOf, poseFor, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import { WORLD_NAMES, paintWorld } from '../public/taps-engine/themes/epoca/scenery.js';

const theme = JSON.parse(readFileSync(new URL('../public/taps-engine/themes/epoca/theme.json', import.meta.url), 'utf8'));

/** Contexto 2D falso: acepta cualquier método y propiedad (solo cuenta las llamadas). */
function ctx() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = { calls, createLinearGradient: () => grad, createRadialGradient: () => grad };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : (...a) => { calls.n++; }),
    set: () => true,
  });
}

test('época: el look de cada personaje es válido', () => {
  for (const [id, ch] of Object.entries(theme.characters)) assert.deepEqual(validarLook(ch.look), [], id);
});

test('época: validarLook rechaza piezas y colores que no existen', () => {
  assert.match(validarLook({ hat: 'sombrerito' }).join(), /hat/);
  assert.match(validarLook({ skin: 'rojo' }).join(), /skin/);
  assert.match(validarLook({ alas: true }).join(), /desconocido/);
  assert.deepEqual(validarLook({}), []);
});

test('época: todos los escenarios del theme.json existen en scenery.js', () => {
  for (const mundo of Object.keys(theme.scenes)) assert.ok(WORLD_NAMES.includes(mundo), `falta pintar ${mundo}`);
  for (const mundo of WORLD_NAMES) assert.ok(theme.scenes[mundo], `${mundo} no está en theme.json`);
});

test('época: se pintan los escenarios y se dibuja cada pieza del catálogo con cada pose', () => {
  for (const mundo of WORLD_NAMES) { const c = ctx(); paintWorld(c, 270, 480, mundo, {}, null, 1); paintWorld(c, 270, 480, mundo, {}, null, -1); assert.ok(c.calls.n > 20, mundo); }
  for (const [campo, valores] of Object.entries(CATALOGO)) for (const v of valores) {
    const c = ctx(); drawHost(c, 135, 200, 0.7, poseFor('idle', 0, 0), lookOf({ look: { [campo]: v } }), { item: 'pluma', T: 0 });
    assert.ok(c.calls.n > 20, `${campo}=${v}`);
  }
  for (const pose of Object.keys(POSES)) { const c = ctx(); drawHost(c, 135, 200, 0.7, poseFor(pose, 0.4, 1), lookOf({}), { blink: true }); assert.ok(c.calls.n > 20, pose); }
});
