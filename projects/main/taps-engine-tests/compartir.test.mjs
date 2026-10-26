// Compartir (PR-4): ida y vuelta por enlace y JSON, rechazo de looks inválidos, hash enorme, base64 roto,
// campos desconocidos descartados y nombre recortado. Nada toca window ni la red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, lookOf, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import { WORLD_NAMES } from '../public/taps-engine/themes/epoca/scenery.js';
import {
  MAX_HASH, MAX_LEMA, MAX_NOMBRE, VERSION, VERSIONES_LEIDAS, aBase64url, codificarLook, compactar, deBase64url, decodificarLook, enlaceDeLook, exportarJson, importarJson,
  lookDesdeHash, normalizarLook,
} from '../public/taps-engine/themes/epoca/compartir.js';

const OPC = { items: Object.keys(ITEMS), mundos: [...WORLD_NAMES] };
const estado = () => ({ base: 'grabador', look: { ...lookOf({}), vest: null, glasses: true, hat: 'copa' }, item: 'pluma', world: 'taller-londres' });
const dec = (b64) => decodificarLook(b64, validarLook, OPC);

test('compartir: base64url ida y vuelta con tildes y sin padding', () => {
  for (const t of ['', 'a', 'ab', 'abc', 'Capitana Inés ñ', '{"x":"ü"}']) assert.equal(deBase64url(aBase64url(t)), t, JSON.stringify(t));
  assert.doesNotMatch(aBase64url('{"a":"????>>>"}'), /[+/=]/, 'solo caracteres seguros en la URL');
});

test('compartir: codificar → enlace → decodificar devuelve el mismo personaje y el nombre', () => {
  const e = estado();
  const url = enlaceDeLook('https://gems.example/taps-engine/disenador.html?x=1#viejo', e, 'Tomás');
  assert.match(url, /^https:\/\/gems\.example\/taps-engine\/disenador\.html#look=[A-Za-z0-9_-]+$/);
  assert.ok(url.length < 900 && url.length < MAX_HASH / 2, 'enlace corto: ' + url.length);
  const r = lookDesdeHash(new URL(url).hash, validarLook, OPC);
  assert.equal(r.ok, true); assert.equal(r.nombre, 'Tomás');
  assert.equal(r.estado.base, 'grabador'); assert.equal(r.estado.item, 'pluma'); assert.equal(r.estado.world, 'taller-londres');
  const esperado = { ...e.look }; delete esperado.vest;
  assert.deepEqual(r.estado.look, esperado, 'vest nulo no viaja; el resto igual');
  assert.equal(lookDesdeHash('', validarLook, OPC), null); assert.equal(lookDesdeHash('#otra=cosa', validarLook, OPC), null);
  assert.equal(lookDesdeHash('#a=1&look=' + codificarLook(e), validarLook, OPC).ok, true, 'acepta otros pares en el hash');
  assert.equal(dec(codificarLook({ ...e, item: null }, '')).estado.item, null);
});

test('compartir: exportar JSON e importar (archivo o pegado) pasa la misma validación', () => {
  const txt = exportarJson(estado(), 'Marta');
  const o = JSON.parse(txt); assert.equal(o.nombre, 'Marta'); assert.equal(o.base, 'grabador'); assert.ok(!('vest' in o.look));
  const r = importarJson(txt, validarLook, OPC); assert.equal(r.ok, true); assert.equal(r.nombre, 'Marta'); assert.equal(r.estado.look.hat, 'copa');
  assert.equal(importarJson('', validarLook, OPC).ok, false); assert.equal(importarJson('   ', validarLook, OPC).ok, false);
  assert.equal(importarJson('{"look":', validarLook, OPC).ok, false);
  assert.equal(importarJson('"texto"', validarLook, OPC).ok, false); assert.equal(importarJson('[1,2]', validarLook, OPC).ok, false);
  assert.equal(importarJson('x'.repeat(MAX_HASH * 4 + 1), validarLook, OPC).ok, false, 'texto enorme');
  for (const r of [importarJson('{', validarLook, OPC), dec('!!!'), normalizarLook(null, validarLook)]) assert.equal(typeof r.motivo, 'string');
});

test('compartir: rechaza looks inválidos con un motivo para personas', () => {
  const malos = [
    { ...estado(), look: { ...lookOf({}), outfit: 'pijama' } },
    { ...estado(), look: { ...lookOf({}), skin: 'rojo' } },
    { ...estado(), look: { ...lookOf({}), glasses: 'sí' } },
    { ...estado(), look: null }, { ...estado(), look: [1] }, { ...estado(), look: 'x' },
  ];
  for (const m of malos) { const r = dec(aBase64url(JSON.stringify({ v: 1, b: m.base, l: m.look, i: m.item, w: m.world }))); assert.equal(r.ok, false, JSON.stringify(m.look)); assert.ok(r.motivo.length > 10); }
  assert.equal(normalizarLook({ look: lookOf({}), world: 'taller-londres' }, validarLook, { mundos: [] }).ok, false, 'sin escenario posible');
});

test('compartir: hash demasiado grande y base64 roto no lanzan, dan motivo', () => {
  const grande = 'A'.repeat(MAX_HASH + 1);
  assert.equal(dec(grande).ok, false); assert.match(dec(grande).motivo, /largo/);
  assert.equal(lookDesdeHash('#look=' + grande, validarLook, OPC).ok, false);
  assert.equal(lookDesdeHash('#otra=' + grande, validarLook, OPC), null, 'un hash enorme ajeno no es nuestro');
  for (const roto of ['%%%', 'a b', 'eyJ', aBase64url('{no json'), aBase64url('null'), aBase64url('42'), '_-_-_-', 'ÿÿÿ']) {
    const r = dec(roto); assert.equal(r.ok, false, roto); assert.equal(typeof r.motivo, 'string');
  }
  assert.equal(dec('').ok, false);
  // bytes que no son UTF-8 válido
  assert.equal(dec(btoa('\xff\xfe\xfd').replace(/=+$/, '')).ok, false);
});

test('compartir: campos desconocidos se descartan (look y raíz), objeto o escenario raros se corrigen', () => {
  const o = { v: 1, b: 'grabador', l: { ...lookOf({}), inventado: 1, otro: 'x' }, i: 'pluma', w: 'taller-londres', extra: { peligro: true }, script: '<img>' };
  const r = dec(aBase64url(JSON.stringify(o)));
  assert.equal(r.ok, true);
  assert.ok(!('inventado' in r.estado.look) && !('otro' in r.estado.look)); assert.equal(validarLook(r.estado.look).length, 0);
  assert.deepEqual(Object.keys(r.estado).sort(), ['base', 'hora', 'item', 'look', 'world']);
  assert.deepEqual(Object.keys(r).sort(), ['estado', 'lema', 'nombre', 'ok']);
  const raro = dec(aBase64url(JSON.stringify({ ...o, i: 'espada', w: 'marte', b: 7 })));
  assert.equal(raro.estado.item, null, 'objeto desconocido → nada'); assert.equal(raro.estado.world, WORLD_NAMES[0]); assert.equal(raro.estado.base, 'sorpresa');
});

test('compartir: el nombre se recorta a 20 y se limpia; si no es texto, va vacío', () => {
  const r = dec(codificarLook(estado(), '  Un nombre   demasiado largo para caber  '));
  assert.ok(Array.from(r.nombre).length <= MAX_NOMBRE); assert.equal(r.nombre, 'Un nombre demasiado');
  assert.equal(dec(aBase64url(JSON.stringify({ l: lookOf({}), w: 'foro-roma', n: 'ñ'.repeat(40) }))).nombre, 'ñ'.repeat(20));
  assert.equal(dec(aBase64url(JSON.stringify({ l: lookOf({}), w: 'foro-roma', n: 12 }))).nombre, '');
  assert.equal(dec(codificarLook(estado())).nombre, '');
});

// PR-D6: el enlace pasa a v2 (gana `m`, el lema) y DEBE seguir leyendo los v1 ya compartidos.
test('compartir (PR-D6): se escribe v2; sin lema no hay `m`; el lema viaja en `m`, recortado a 40, y vuelve igual', () => {
  assert.equal(VERSION, 2); assert.deepEqual([...VERSIONES_LEIDAS], [1, 2]);
  const c = compactar(estado(), 'Tomás');
  assert.equal(c.v, 2); assert.ok(!('m' in c), 'sin lema no viaja `m`'); assert.ok(!('lema' in c));
  const url = enlaceDeLook('https://gems.example/crear', estado(), 'Tomás', '  Hoy   aprendemos algo nuevo  ');
  const r = lookDesdeHash(new URL(url).hash, validarLook, OPC);
  assert.equal(r.ok, true); assert.equal(r.nombre, 'Tomás'); assert.equal(r.lema, 'Hoy aprendemos algo nuevo');
  assert.equal(JSON.parse(deBase64url(url.split('#look=')[1])).m, 'Hoy aprendemos algo nuevo');
  const largo = dec(codificarLook(estado(), '', 'x'.repeat(60))); assert.equal(Array.from(largo.lema).length, MAX_LEMA); assert.equal(MAX_LEMA, 40);
  assert.equal(dec(codificarLook(estado(), '', 'ñ'.repeat(45))).lema, 'ñ'.repeat(40), 'puntos de código, no bytes');
  assert.equal(dec(codificarLook(estado())).lema, '', 'sin lema vuelve vacío, nunca undefined');
  const txt = exportarJson(estado(), 'Marta', 'Ciencia con calma'); const o = JSON.parse(txt);
  assert.equal(o.v, 2); assert.equal(o.lema, 'Ciencia con calma'); assert.ok(!('m' in o), 'el archivo usa claves largas');
  assert.equal(importarJson(txt, validarLook, OPC).lema, 'Ciencia con calma');
  assert.ok(!('lema' in JSON.parse(exportarJson(estado(), 'Marta'))), 'sin lema el archivo no trae la clave');
  assert.ok(url.length < MAX_HASH / 2, 'sigue siendo corto: ' + url.length);
});

test('compartir (PR-D6): un enlace v1 (sin `m`) se lee igual que antes, con lema vacío; `m` raro no rompe', () => {
  const e = estado();
  const v1 = aBase64url(JSON.stringify({ v: 1, b: e.base, l: { ...e.look, vest: undefined }, i: e.item, w: e.world, n: 'Tomás' }));
  const r = dec(v1);
  assert.equal(r.ok, true); assert.equal(r.nombre, 'Tomás'); assert.equal(r.lema, ''); assert.equal(r.estado.base, 'grabador'); assert.equal(r.estado.item, 'pluma');
  const esperado = { ...e.look }; delete esperado.vest; assert.deepEqual(r.estado.look, esperado);
  // v1 → (re)codificar → v2 → decodificar: el mismo personaje, ahora con lema; y v2 sin lema vuelve a leerse como v1.
  const v2 = codificarLook(r.estado, r.nombre, 'Nuevo lema'); const o2 = JSON.parse(deBase64url(v2));
  assert.equal(o2.v, 2); assert.equal(o2.m, 'Nuevo lema'); assert.deepEqual(o2.l, esperado);
  const r2 = dec(v2); assert.deepEqual(r2.estado, r.estado); assert.equal(r2.lema, 'Nuevo lema'); assert.equal(r2.nombre, 'Tomás');
  // sin `v`, con `v` futuro o con `m` que no es texto: se leen los campos conocidos y el lema va vacío
  assert.equal(dec(aBase64url(JSON.stringify({ l: lookOf({}), w: 'foro-roma' }))).ok, true);
  assert.equal(dec(aBase64url(JSON.stringify({ v: 3, l: lookOf({}), w: 'foro-roma', m: 'x' }))).lema, 'x');
  for (const m of [12, null, { a: 1 }, ['x'], true]) assert.equal(dec(aBase64url(JSON.stringify({ v: 2, l: lookOf({}), w: 'foro-roma', m }))).lema, '', JSON.stringify(m));
  assert.equal(dec(aBase64url(JSON.stringify({ v: 2, l: lookOf({}), w: 'foro-roma', lema: 'clave larga' }))).lema, 'clave larga', 'también la clave larga (archivos)');
});
