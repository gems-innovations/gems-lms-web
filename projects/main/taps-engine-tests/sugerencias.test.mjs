// Diseñador «época»: las tablas de afinidad solo nombran piezas, objetos y escenarios que existen, cada conjunto de colores
// pasa validarLook, y «Sorpréndeme» (todo, por pestaña y de escenario) y las sugerencias siempre dejan un look válido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, ITEMS, lookOf, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import { WORLD_NAMES } from '../public/taps-engine/themes/epoca/scenery.js';
import { AFINIDAD, MUNDO_OBJETOS, NOMBRES_COLOR, PALETAS, aplicarCambios, nombreColor, sorprenderEscenario, sorprenderPestana, sorprenderTodo, sugerencias } from '../public/taps-engine/themes/epoca/sugerencias.js';

/** Aleatorio determinista para que la prueba sea repetible. */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const objetos = Object.keys(ITEMS);
const valido = (e, msg) => { assert.deepEqual(validarLook(e.look), [], msg); assert.ok(e.item === null || objetos.includes(e.item), `${msg}: objeto ${e.item}`); assert.ok(WORLD_NAMES.includes(e.world), `${msg}: mundo ${e.world}`); };

test('sugerencias: cada prenda del catálogo tiene afinidad y las tablas solo nombran cosas que existen', () => {
  for (const outfit of CATALOGO.outfit) {
    const A = AFINIDAD[outfit]; assert.ok(A, `falta ${outfit}`);
    for (const h of A.sombreros) assert.ok(CATALOGO.hat.includes(h), `${outfit}: sombrero ${h}`);
    for (const m of A.manga) assert.ok(CATALOGO.sleeve.includes(m), `${outfit}: manga ${m}`);
    for (const o of A.objetos) assert.ok(objetos.includes(o), `${outfit}: objeto ${o}`);
    for (const w of A.mundos) assert.ok(WORLD_NAMES.includes(w), `${outfit}: mundo ${w}`);
    assert.ok(A.conjuntos.length >= 3 && A.objetos.length && A.mundos.length && A.sombreros.length, outfit);
    for (const c of A.conjuntos) assert.deepEqual(validarLook({ ...lookOf({}), outfit, ...c }), [], `${outfit}: conjunto ${c.coat}`);
  }
  for (const w of WORLD_NAMES) { assert.ok(MUNDO_OBJETOS[w]?.length, `faltan objetos para ${w}`); for (const o of MUNDO_OBJETOS[w]) assert.ok(objetos.includes(o), `${w}: ${o}`); }
  for (const [campo, lista] of Object.entries(PALETAS)) {
    const colores = Array.isArray(lista) ? lista : Object.values(lista).flat();
    for (const col of colores) assert.deepEqual(validarLook({ [campo === 'coat' ? 'coat' : campo]: col }), [], `${campo}: ${col}`);
  }
});

test('sugerencias: Sorpréndeme completo da looks válidos y coherentes (300 tiradas)', () => {
  const r = rng(7);
  for (let i = 0; i < 300; i++) {
    const e = sorprenderTodo(r); valido(e, `tirada ${i}`);
    const A = AFINIDAD[e.look.outfit];
    assert.ok(A.sombreros.includes(e.look.hat) && A.manga.includes(e.look.sleeve) && A.objetos.includes(e.item) && A.mundos.includes(e.world), `tirada ${i} no es coherente`);
  }
});

test('sugerencias: Sorpréndeme por pestaña solo toca su pestaña y queda válido', () => {
  const r = rng(11);
  let e = sorprenderTodo(r);
  for (let i = 0; i < 100; i++) for (const p of ['cara', 'pelo', 'ropa', 'objeto']) {
    const n = sorprenderPestana(p, e, r); valido(n, `${p} ${i}`);
    if (p !== 'objeto') assert.equal(n.item, e.item, p); if (p !== 'ropa') assert.equal(n.look.outfit, e.look.outfit, p);
    assert.equal(n.world, e.world, p); e = n;
  }
});

test('sugerencias: Sorpréndeme del paso 2 elige escenario y objeto afines a la prenda', () => {
  const r = rng(3);
  for (let i = 0; i < 100; i++) {
    const e = sorprenderTodo(r), n = sorprenderEscenario(e, r); valido(n, `escenario ${i}`);
    assert.ok(AFINIDAD[n.look.outfit].objetos.includes(n.item), `objeto ${n.item} no va con ${n.look.outfit}`);
    if (AFINIDAD[n.look.outfit].mundos.length > 1) assert.notEqual(n.world, e.world, 'repite escenario cuando hay otro afín');
  }
});

test('sugerencias: las frases son para personas y aplicarlas deja un look válido y sin nada que sugerir', () => {
  const r = rng(19);
  for (let i = 0; i < 200; i++) {
    let e = sorprenderTodo(r);
    e = { ...e, look: { ...e.look, hat: 'copa', sleeve: 'larga' }, item: i % 3 ? 'matraz' : null, world: WORLD_NAMES[i % WORLD_NAMES.length] };
    for (const ctx of ['personaje', 'escenario']) {
      let vueltas = 0;
      for (let s = sugerencias(e, ctx); s.length; s = sugerencias(e, ctx)) {
        assert.ok(vueltas++ < 6, `${ctx}: las sugerencias no convergen`);
        assert.match(s[0].texto, /^[A-ZÁÉÍÓÚ][^{}_]+$/, s[0].texto); assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(s[0].texto), 'sin emojis');
        e = aplicarCambios(e, s[0].cambios); valido(e, `${ctx} ${i}`);
      }
    }
  }
  assert.deepEqual(sugerencias({ look: { ...lookOf({}), outfit: 'toga', sleeve: 'corta', hat: 'laurel' }, item: 'pergamino', world: 'foro-roma' }, 'personaje'), []);
  assert.match(sugerencias({ look: { ...lookOf({}), outfit: 'toga', sleeve: 'corta', hat: 'none' }, item: 'pergamino', world: 'foro-roma' })[0].texto, /laurel/);
  assert.match(sugerencias({ look: { ...lookOf({}), outfit: 'bata' }, item: 'pluma', world: 'laboratorio-moderno' })[0].texto, /lupa/);
  assert.match(sugerencias({ look: { ...lookOf({}), outfit: 'safari' }, item: 'cepillo', world: 'foro-roma' }, 'escenario')[0].texto, /Egipto/);
});

test('sugerencias (PR-D3): cada color de las paletas tiene nombre para personas; fuera de paleta, «Color personalizado»', () => {
  const colores = Object.values(PALETAS).flatMap(l => Array.isArray(l) ? l : Object.values(l).flat());
  for (const col of colores) {
    const n = nombreColor(col);
    assert.ok(n && n !== 'Color personalizado', `sin nombre: ${col}`);
    assert.match(n, /^[A-ZÁÉÍÓÚ][a-záéíóúñ ]+$/, n);
    assert.equal(nombreColor(col.toUpperCase()), n, 'no distingue mayúsculas');
  }
  assert.equal(nombreColor('#123456'), 'Color personalizado');
  assert.equal(nombreColor(undefined), 'Color personalizado');
  for (const [hex, n] of Object.entries(NOMBRES_COLOR)) assert.match(hex, /^#[0-9a-f]{6}$/, n);
});
