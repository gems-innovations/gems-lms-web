// Estilo del creador en el diseñador (public/taps-engine/estilo.js): mismas reglas y mismo catálogo que el feed (taps.estilo.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARCOS, MAX_CAPAS, MUSICAS, PALETAS, PATRONES, LETRAS, STICKERS, capaNueva, validarEstilo } from '../public/taps-engine/estilo.js';
import { lookOf, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import { armarBorrador, parsearBorrador } from '../public/taps-engine/themes/epoca/guardado.js';

const ts = readFileSync(new URL('../src/app/taps/taps.estilo.ts', import.meta.url), 'utf8');
const bloque = (desde, hasta) => ts.slice(ts.indexOf(`export const ${desde}`), hasta ? ts.indexOf(`export const ${hasta}`) : undefined);

test('el catálogo del diseñador es el mismo que pinta el feed', () => {
  const ids = (txt) => [...txt.matchAll(/^\s+'?([a-z-]+)'?: [{'"]/gm)].map(m => m[1]);
  for (const [nombre, cat, hasta] of [['MARCOS', MARCOS, 'PALETAS'], ['LETRAS', LETRAS, 'PATRONES'], ['PATRONES', PATRONES, 'MUSICAS'], ['MUSICAS', MUSICAS, 'STICKERS']]) {
    const txt = bloque(nombre, hasta);
    for (const id of Object.keys(cat)) assert.ok(txt.includes(id.includes('-') ? `'${id}'` : `${id}:`), `${nombre}: falta ${id} en taps.estilo.ts`);
    assert.equal((txt.match(/: '/g) ?? []).length, Object.keys(cat).length, `${nombre}: distinto número de entradas`);
  }
  for (const [id, p] of Object.entries(PALETAS)) assert.ok(ts.includes(`${id}: { nombre: '${p.nombre}', colores: ['${p.colores.join("', '")}'] }`), `paleta ${id} distinta`);
  for (const [id, s] of Object.entries(STICKERS)) assert.ok(ts.includes(`${id}: { nombre: '${s.nombre}', d: '${s.d}' }`), `sticker ${id} distinto`);
  assert.equal(ids(bloque('STICKERS', 'MAX_CAPAS')).length, Object.keys(STICKERS).length);
});

test('validarEstilo descarta lo raro y recorta como el feed', () => {
  assert.equal(validarEstilo(null), null);
  assert.equal(validarEstilo({ marco: '__proto__', paleta: 'toString', musica: 'victory-sting' }), null);
  assert.equal(validarEstilo({ fondo: { tipo: 'color', color: 'url(x)' } }), null);
  const e = validarEstilo({ marco: 'neon', fondo: { tipo: 'patron', id: 'rayas', color: '#ABCDEF', fuerza: 9 }, capas: [{ tipo: 'texto', texto: 'a\nb'.padEnd(80, 'x'), x: 500, giro: 90 }] });
  assert.deepEqual(e.fondo, { tipo: 'patron', id: 'rayas', color: '#abcdef', fuerza: 0.7 });
  assert.equal(e.capas[0].texto.length, 40); assert.ok(!e.capas[0].texto.includes('\n'));
  assert.equal(e.capas[0].x, 100); assert.equal(e.capas[0].giro, 45);
});

test('capaNueva ocupa sitios libres y para en el máximo', () => {
  let capas = [];
  for (let i = 0; i < MAX_CAPAS; i++) capas = [...capas, capaNueva(capas, i % 2 ? 'sticker' : 'texto', i % 2 ? 'estrella' : 'Hola', '#ffe94d')];
  assert.equal(new Set(capas.map(c => `${c.x},${c.y}`)).size, MAX_CAPAS, 'ninguna encima de otra');
  assert.equal(capaNueva(capas, 'texto', 'otra', '#ffffff'), null);
  assert.equal(capaNueva([], 'sticker', 'no-existe', '#ffffff'), null);
  const sinUna = capas.filter((_, k) => k !== 2), nueva = capaNueva(sinUna, 'texto', 'X', '#ffffff');
  assert.deepEqual([nueva.x, nueva.y], [capas[2].x, capas[2].y], 'reusa el sitio que quedó libre');
  assert.deepEqual(validarEstilo({ capas }).capas, capas, 'lo que crea pasa la validación tal cual');
});

test('el borrador conserva el estilo y lo devuelve para validar', () => {
  const estado = { base: 'grabador', look: lookOf({}), item: 'pluma', world: 'taller-londres' };
  const estilo = { marco: 'brillo', paleta: 'oceano' };
  const raw = JSON.stringify({ ...armarBorrador(estado, 3, null, 1), estilo });
  assert.deepEqual(parsearBorrador(raw, validarLook).estilo, estilo);
  assert.equal('estilo' in parsearBorrador(JSON.stringify(armarBorrador(estado, 3, null, 1)), validarLook), false);
});
