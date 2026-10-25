// Guardado en el dispositivo (PR-3): límite de 12, nombre a 20, descarte de looks inválidos, JSON roto y almacén caído.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lookOf, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import {
  CLAVE_BORRADOR, CLAVE_LOOKS, MAX_LOOKS, MAX_NOMBRE, armarBorrador, borrarLook, crearAlmacen, duplicarLook, fechaCorta, guardarLook,
  parsearBorrador, parsearLooks, recortarNombre, renombrarLook, serializarBorrador, serializarLooks,
} from '../public/taps-engine/themes/epoca/guardado.js';

const estado = () => ({ base: 'grabador', look: lookOf({}), item: 'pluma', world: 'taller-londres' });
/** Storage en memoria, con interruptor para simular que el navegador lo bloquea. */
function memoria({ roto = false } = {}) {
  const m = new Map();
  const falla = () => { if (roto) throw new DOMException('bloqueado', 'SecurityError'); };
  return { getItem: k => (falla(), m.has(k) ? m.get(k) : null), setItem: (k, v) => (falla(), m.set(k, String(v))), removeItem: k => (falla(), m.delete(k)), mapa: m };
}

test('guardado: el nombre se recorta a 20 caracteres y se limpia', () => {
  assert.equal(recortarNombre('  Capitana   Inés  '), 'Capitana Inés');
  assert.equal(recortarNombre('a'.repeat(50)).length, MAX_NOMBRE);
  assert.equal(Array.from(recortarNombre('ñ'.repeat(30))).length, 20, 'cuenta puntos de código, no bytes');
  assert.equal(recortarNombre('', 'Tomás'), 'Tomás');
  assert.equal(recortarNombre(null, 'X'), 'X');
  const { look } = guardarLook([], estado(), { nombre: 'Un nombre demasiado largo para caber' });
  assert.ok(look.nombre.length <= MAX_NOMBRE); assert.equal(look.nombre, 'Un nombre demasiado', 'sin espacio final tras el corte');
});

test('guardado: hasta 12 looks; el 13 no entra y se avisa (lleno), duplicar también respeta el límite', () => {
  let lista = [];
  for (let i = 0; i < MAX_LOOKS; i++) { const r = guardarLook(lista, estado(), { nombre: 'L' + i, id: 'id' + i, ahora: i }); assert.equal(r.lleno, false); lista = r.lista; }
  assert.equal(lista.length, 12); assert.equal(lista[0].nombre, 'L11', 'el más nuevo primero');
  const r = guardarLook(lista, estado(), { nombre: 'de más' });
  assert.equal(r.lleno, true); assert.equal(r.lista.length, 12); assert.equal(r.look, null);
  assert.equal(duplicarLook(lista, 'id3').lleno, true);
  lista = borrarLook(lista, 'id3'); assert.equal(lista.length, 11);
  const d = duplicarLook(lista, 'id4', 99, 'nuevo'); assert.equal(d.lleno, false); assert.equal(d.lista.length, 12);
  assert.equal(d.lista[d.lista.indexOf(d.look) - 1].id, 'id4', 'la copia va junto al original'); assert.equal(d.look.nombre, 'L4 copia');
  assert.equal(duplicarLook(lista, 'no-existe').look, null);
  assert.equal(renombrarLook(lista, 'id5', '  Nuevo  ').find(l => l.id === 'id5').nombre, 'Nuevo');
  assert.equal(renombrarLook(lista, 'id5', '').find(l => l.id === 'id5').nombre, 'L5', 'nombre vacío conserva el anterior');
  const ids = new Set(lista.map(l => l.id)); assert.equal(ids.size, lista.length);
});

test('guardado: al cargar se descartan looks inválidos, repetidos o con forma rara y se respeta el tope', () => {
  const bueno = i => ({ id: 'ok' + i, nombre: 'Bueno', fecha: 1, miniatura: 'data:image/png;base64,AAAA', ...estado() });
  const lista = [
    bueno(1),
    { ...bueno(2), look: { ...lookOf({}), outfit: 'pijama' } },           // prenda que no existe
    { ...bueno(3), look: { ...lookOf({}), skin: 'rojo' } },                // color inválido
    { ...bueno(4), look: { ...lookOf({}), inventado: 1 } },                // campo desconocido
    { ...bueno(5), id: 7 },                                                // id que no es texto
    { ...bueno(6), look: null },
    { ...bueno(7), item: 42 },
    bueno(1),                                                              // repetido
    { ...bueno(8), nombre: 'x'.repeat(40), miniatura: 'javascript:alert(1)' },
    'basura', null, 5,
  ];
  const r = parsearLooks(serializarLooks(lista), validarLook);
  assert.deepEqual(r.map(l => l.id), ['ok1', 'ok8']);
  assert.equal(r[1].nombre.length, MAX_NOMBRE); assert.equal(r[1].miniatura, '', 'solo miniaturas data:image/');
  assert.equal(r[0].miniatura, 'data:image/png;base64,AAAA');
  const muchos = Array.from({ length: 30 }, (_, i) => bueno(i));
  assert.equal(parsearLooks(JSON.stringify(muchos), validarLook).length, MAX_LOOKS);
});

test('guardado: JSON corrupto o de otra forma en localStorage → lista vacía y sin borrador, sin lanzar', () => {
  for (const raw of ['{', '{"a":1}', '"texto"', 'null', '[1,2', '', null, undefined, '42']) {
    assert.deepEqual(parsearLooks(raw, validarLook), [], String(raw));
    assert.equal(parsearBorrador(raw, validarLook), null, String(raw));
  }
  const b = armarBorrador(estado(), 2, null, 1000);
  assert.ok(/^[0-9a-z]+-[0-9a-z]{7,}$/.test(b.borradorId));
  const leido = parsearBorrador(serializarBorrador(b), validarLook);
  assert.equal(leido.borradorId, b.borradorId); assert.equal(leido.paso, 2); assert.equal(leido.world, 'taller-londres');
  assert.equal(armarBorrador(estado(), 9, leido, 2000).borradorId, b.borradorId, 'el borradorId se conserva entre autoguardados');
  assert.equal(armarBorrador(estado(), 9, leido).paso, 3);
  assert.equal(parsearBorrador(serializarBorrador({ ...b, look: { ...b.look, hat: 'casco' } }), validarLook), null, 'look inválido → se descarta');
  assert.equal(parsearBorrador(serializarBorrador({ ...b, borradorId: undefined }), validarLook), null);
});

test('guardado: almacenamiento no disponible → nada lanza y se informa', () => {
  const roto = crearAlmacen(memoria({ roto: true }));
  assert.equal(roto.disponible, false);
  assert.equal(roto.leer(CLAVE_LOOKS), null); assert.equal(roto.escribir(CLAVE_LOOKS, '[]'), false); assert.equal(roto.quitar(CLAVE_BORRADOR), false);
  assert.equal(crearAlmacen(undefined).disponible, false, 'sin objeto Storage tampoco lanza');
  const m = memoria(), ok = crearAlmacen(m);
  assert.equal(ok.disponible, true); assert.equal(m.mapa.size, 0, 'la prueba de escritura se limpia');
  assert.equal(ok.escribir(CLAVE_LOOKS, serializarLooks(guardarLook([], estado(), { nombre: 'A' }).lista)), true);
  assert.equal(parsearLooks(ok.leer(CLAVE_LOOKS), validarLook)[0].nombre, 'A');
  assert.equal(fechaCorta(0), ''); assert.equal(fechaCorta(5000, 5000), 'hoy'); assert.equal(fechaCorta(1, 86400000 * 2 + 1), 'hace 2 días'); assert.equal(fechaCorta(1, 86400000 + 1), 'ayer');
});
