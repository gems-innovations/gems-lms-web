// Encaje del personaje en la zona visible (motor v11). Ejecutar:  node --test projects/main/taps-engine-tests/encuadre.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const { encajar, BANDA_DEFECTO } = await import('../public/taps-engine/taps-engine.js');
const aplica = (f, y) => f.s * y + f.ty;
const EPS = 1e-3;

test('si la banda ya cabe (escritorio), no cambia nada', () => {
  assert.deepEqual(encajar({ arriba: 0.15, abajo: 0.68 }, { arriba: 0.05, abajo: 0.95 }), { s: 1, ty: 0 });
  assert.deepEqual(encajar({ arriba: 0.15, abajo: 0.68 }, { arriba: 0.15, abajo: 0.68 }), { s: 1, ty: 0 });
});

test('datos raros: identidad (nunca rompe el escenario)', () => {
  assert.deepEqual(encajar({ arriba: 0.6, abajo: 0.2 }, { arriba: 0, abajo: 1 }), { s: 1, ty: 0 });
  assert.deepEqual(encajar({ arriba: 0.1, abajo: 0.7 }, { arriba: 0.5, abajo: 0.5 }), { s: 1, ty: 0 });
  assert.deepEqual(encajar(null, undefined), { s: 1, ty: 0 });
});

test('celular 375×812: la tarjeta tapa la mitad de abajo y el personaje sube a la zona visible', () => {
  const zona = { arriba: 76 / 812, abajo: 501 / 812 };            // bajo la barra, sobre la tarjeta (medido en el feed)
  // bandas medidas en el lienzo 9:16 (de la cabeza a los pies) en el plano base y en los más extremos de cada tema
  const bandas = { minecraft: [0.106, 0.638], 'minecraft contrapicado': [0.204, 0.704], 'minecraft primer plano': [0.126, 0.706],
    estudio: [0.145, 0.48], 'estudio cenital': [0.054, 0.318], aventura: [0.385, 0.68], 'aventura primer plano': [0.35, 0.82], defecto: [BANDA_DEFECTO.arriba, BANDA_DEFECTO.abajo] };
  for (const [id, [arriba, abajo]] of Object.entries(bandas)) {
    const banda = { arriba, abajo }, f = encajar(banda, zona);
    assert.ok(aplica(f, banda.abajo) <= zona.abajo + EPS, `${id}: los pies quedan sobre la tarjeta`);
    assert.ok(aplica(f, banda.arriba) >= zona.arriba - EPS, `${id}: la cabeza no se va bajo la barra`);
    assert.ok(f.s >= 0.5 && f.s <= 1);
  }
});

test('desplaza lo mínimo: un desborde de 1 px mueve 1 px, no la centra', () => {
  const H = 812, zona = { arriba: 76 / H, abajo: 501 / H };
  const f = encajar({ arriba: 0.3, abajo: 502 / H }, zona);         // los pies se pasan 1 px
  assert.equal(f.s, 1);
  assert.ok(Math.abs(f.ty * H + 1) < 0.1, `subió ${-f.ty * H} px`);
  const g = encajar({ arriba: 75 / H, abajo: 0.4 }, zona);          // la cabeza se pasa 1 px por arriba: baja 1 px
  assert.ok(Math.abs(g.ty * H - 1) < 0.1);
});

test('continuidad: desbordes chicos dan movimientos chicos (sin saltos)', () => {
  const zona = { arriba: 0.1, abajo: 0.6 };
  const prev = new Map();
  let pasos = 0;
  for (let abajo = 0.55; abajo <= 0.75; abajo += 0.001) {
    for (const alto of [0.3, 0.49, 0.5, 0.51, 0.6]) {
      const banda = { arriba: abajo - alto, abajo }, f = encajar(banda, zona);
      const pos = [aplica(f, banda.arriba), aplica(f, banda.abajo)], p = prev.get(alto);
      if (p) { pasos++; assert.ok(Math.abs(pos[1] - p[1]) < 0.003 && Math.abs(pos[0] - p[0]) < 0.003, `salto en abajo=${abajo.toFixed(3)} alto=${alto}`); }
      prev.set(alto, pos);
    }
  }
  assert.ok(pasos > 900);
  // y al cruzar el borde de «cabe justo» → «hay que achicar»
  const a = encajar({ arriba: 0.1, abajo: 0.6 }, zona), b = encajar({ arriba: 0.1, abajo: 0.601 }, zona);
  assert.ok(Math.abs(aplica(a, 0.6) - aplica(b, 0.601)) < 0.002 && Math.abs(aplica(a, 0.1) - aplica(b, 0.1)) < 0.002);
});

test('se achica lo justo y la banda llena la zona', () => {
  const f = encajar({ arriba: 0.2, abajo: 0.7 }, { arriba: 0.1, abajo: 0.5 });
  assert.equal(f.s, 0.8);
  assert.ok(Math.abs(aplica(f, 0.2) - 0.1) < EPS && Math.abs(aplica(f, 0.7) - 0.5) < EPS);
});

test('zona muy baja (celular acostado): nunca por debajo de sMin y manda la cabeza', () => {
  const f = encajar({ arriba: 0.1, abajo: 0.7 }, { arriba: 0.1, abajo: 0.3 }, 0.5);
  assert.equal(f.s, 0.5);
  assert.ok(Math.abs(aplica(f, 0.1) - 0.1) < EPS, 'la cabeza arriba de la zona');
});
