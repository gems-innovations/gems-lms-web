// Fondos con hora del día y tres escenarios nuevos (PR-D8, producto/taps/disenador-v2-plan.md §5): `paintWorld` sin hora (o con
// `dia`) pinta EXACTAMENTE lo de siempre (el feed no cambia), atardecer y noche añaden un velo; biblioteca, observatorio y aula
// existen en todas las tablas (theme.json, nombres, objetos, ambiente sonoro, frases); la hora viaja en enlaces y guardados sin
// romper los de antes y nunca llega al adjunto del API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EXTERIORES, HORAS, HORA_DEFECTO, WORLD_NAMES, paintAmbient, paintWorld } from '../public/taps-engine/themes/epoca/scenery.js';
import { AFINIDAD, HORAS_NOMBRE, MUNDOS, MUNDO_OBJETOS, sugerencias } from '../public/taps-engine/themes/epoca/sugerencias.js';
import { FRASES, POR_MUNDO, crearFrases } from '../public/taps-engine/themes/epoca/frases.js';
import { ITEMS, lookOf, validarLook } from '../public/taps-engine/themes/epoca/rig.js';
import { aBase64url, compactar, decodificarLook, exportarJson, importarJson, normalizarLook } from '../public/taps-engine/themes/epoca/compartir.js';
import { armarBorrador, guardarLook, parsearBorrador, parsearLooks, serializarBorrador, serializarLooks } from '../public/taps-engine/themes/epoca/guardado.js';
import { nombreValido } from '../public/taps-engine/themes/epoca/medicion.js';
import { MUNDOS_AMBIENTE, claveEfecto, renderizarEfecto } from '../public/taps-engine/audio/efectos.js';

const leer = ruta => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const theme = JSON.parse(leer('../public/taps-engine/themes/epoca/theme.json'));
const NUEVOS = ['biblioteca', 'observatorio', 'aula'];

/** Contexto 2D falso que anota cada llamada (método + argumentos) y cada propiedad escrita, en orden: sirve para comparar dibujos. */
function grabadora() {
  const log = [];
  const grad = { addColorStop(o, c) { log.push(['stop', o, c]); } };
  const target = { log, createLinearGradient: (...a) => (log.push(['lin', ...a]), grad), createRadialGradient: (...a) => (log.push(['rad', ...a]), grad) };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : (...a) => { log.push([k, ...a.map(v => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v))]); }),
    set: (t, k, v) => { log.push(['=' + String(k), typeof v === 'object' ? 'grad' : v]); return true; },
  });
}
const dibujo = (mundo, hora, side = 1) => { const c = grabadora(); paintWorld(c, 270, 480, mundo, {}, null, side, hora); return c.log; };

test('PR-D8: hay ocho escenarios (los cinco de antes más biblioteca, observatorio y aula) y tres horas, con `dia` por defecto', () => {
  assert.deepEqual([...WORLD_NAMES], ['taller-londres', 'excavacion-egipto', 'foro-roma', 'sala-medieval', 'laboratorio-moderno', ...NUEVOS]);
  assert.deepEqual([...HORAS], ['dia', 'atardecer', 'noche']); assert.equal(HORA_DEFECTO, 'dia');
  for (const h of HORAS) assert.ok(HORAS_NOMBRE[h], `nombre de ${h}`);
  for (const m of EXTERIORES) assert.ok(WORLD_NAMES.includes(m), m);
});

test('PR-D8: sin hora (como llama el feed) el dibujo es idéntico al de `dia`; con atardecer o noche se pinta algo más, y es determinista', () => {
  for (const mundo of WORLD_NAMES) for (const side of [1, -1]) {
    const base = dibujo(mundo, null, side);
    assert.ok(base.length > 20, mundo);
    assert.deepEqual(dibujo(mundo, undefined, side), base, `${mundo}: undefined = sin hora`);
    assert.deepEqual(dibujo(mundo, 'dia', side), base, `${mundo}: dia = sin hora`);
    assert.deepEqual(dibujo(mundo, 'mediodia', side), base, `${mundo}: una hora desconocida no cambia nada`);
    assert.deepEqual(dibujo(mundo, null, side), base, `${mundo}: determinista`);
    for (const h of ['atardecer', 'noche']) {
      const con = dibujo(mundo, h, side);
      assert.ok(con.length > base.length, `${mundo} ${h}: pinta el velo`);
      assert.deepEqual(con.slice(0, base.length), base, `${mundo} ${h}: el velo va encima, el fondo no cambia`);
      assert.deepEqual(dibujo(mundo, h, side), con, `${mundo} ${h}: determinista`);
    }
    assert.notDeepEqual(dibujo(mundo, 'atardecer', side), dibujo(mundo, 'noche', side), `${mundo}: atardecer y noche se distinguen`);
  }
  // el ambiente animado de los nuevos tampoco lanza y pinta algo
  for (const mundo of NUEVOS) { const c = grabadora(); paintAmbient(c, 270, 480, mundo, 1.3); assert.ok(c.log.length > 5, mundo); }
});

test('PR-D8: el feed no recibe hora en el tema época (cine.horasMundos vacío) y los tres mundos nuevos están en theme.json', () => {
  assert.deepEqual(theme.cine.horasMundos, [], 'ningún Tap del feed lleva hora: generar-taps la borra si el mundo no está aquí');
  for (const m of NUEVOS) { assert.ok(theme.scenes[m], m); assert.equal(theme.scenes[m].sky.length, 2, m); }
  // ningún Tap generado usa los escenarios nuevos: solo aparecen en el creador
  // ningún Tap generado del tema época usa los escenarios nuevos ni lleva hora: solo aparecen en el creador (`aula` también
  // existe en el tema «estudio», que es otro scenery.js; por eso se mira solo lo que corre con época)
  const dir = new URL('../public/taps-engine/taps/', import.meta.url);
  const epoca = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => readFileSync(new URL(f, dir), 'utf8')).filter(t => /"theme":\s*"epoca"/.test(t)).join('\n');
  for (const m of NUEVOS) assert.ok(!new RegExp(`"world":\\s*"${m}"`).test(epoca), `${m} no está en el feed`);
  assert.ok(!/"hora":/.test(epoca), 'ningún Tap de época lleva hora');
});

test('PR-D8: cada escenario tiene nombre, artículo, objetos afines, ambiente sonoro propio y dos frases de ambiente', () => {
  for (const m of WORLD_NAMES) {
    assert.ok(MUNDOS[m]?.[0] && MUNDOS[m]?.[1], `nombre y subtítulo de ${m}`);
    assert.ok(MUNDO_OBJETOS[m]?.length >= 2, `objetos de ${m}`);
    for (const o of MUNDO_OBJETOS[m]) assert.ok(o in ITEMS, `${m}: objeto ${o}`);
    assert.ok(MUNDOS_AMBIENTE.includes(m), `ambiente de ${m}`);
    assert.equal(POR_MUNDO[m]?.length, 2, `frases de ${m}`);
    for (const f of POR_MUNDO[m]) { assert.match(f, /[.!?]$/, f); assert.doesNotMatch(f, /\p{Extended_Pictographic}/u, f); assert.ok(!FRASES.world.includes(f), f); }
  }
  assert.equal(new Set(MUNDOS_AMBIENTE).size, WORLD_NAMES.length);
  const ambientes = NUEVOS.map(m => renderizarEfecto('ambiente', { paleta: 'epoca', mundo: m, sampleRate: 22050 }));
  assert.equal(new Set(ambientes.map(x => x.join(',').slice(0, 3000))).size, 3, 'tres ambientes distintos entre sí');
  for (const [i, x] of ambientes.entries()) { assert.ok(x.length > 0.4 * 22050 && x.length <= 1.2 * 22050 + 1, NUEVOS[i]); assert.ok(Math.max(...x.map(Math.abs)) <= 0.5 + 1e-6, NUEVOS[i] + ': pico'); }
  for (const m of NUEVOS) assert.equal(claveEfecto('ambiente', { paleta: 'epoca', mundo: m }), `epoca:ambiente:${m}`);
  // algún atuendo lleva a cada mundo nuevo (Sorpréndeme y las sugerencias pueden proponerlo)
  for (const m of NUEVOS) assert.ok(Object.values(AFINIDAD).some(a => a.mundos.includes(m)), `${m} es afín a alguna prenda`);
  // una sugerencia de escenario con un mundo nuevo nombra el lugar con artículo
  assert.match(sugerencias({ look: { ...lookOf({}), outfit: 'safari' }, item: 'cepillo', world: 'aula' }, 'escenario')[0].texto, /Egipto/);
  // la frase del lugar entra en la voz del personaje al entrar al mundo
  const lcg = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; })();
  const { frase } = crearFrases({ aleatorio: lcg }); const vistas = new Set();
  for (let i = 0; i < 300; i++) { const f = frase('world', 'grabador', 'aula'); vistas.add(f); assert.ok(FRASES.world.includes(f) || POR_MUNDO.aula.includes(f) || f === 'Huele a tinta y a lluvia.', f); }
  assert.ok(POR_MUNDO.aula.some(f => vistas.has(f)), 'alguna vez dice la frase del aula');
  assert.ok(FRASES.hora.length === 6);
  assert.equal(nombreValido('hora/noche'), 'hora/noche'); assert.equal(nombreValido('hora/tarde'), null);
});

test('PR-D8: la hora viaja en el enlace solo si no es de día (`h`), y los enlaces v1/v2 sin `h` se leen como siempre', () => {
  const OPC = { items: Object.keys(ITEMS), mundos: [...WORLD_NAMES], horas: [...HORAS] };
  const e = { base: 'grabador', look: { ...lookOf({}), vest: null }, item: 'pluma', world: 'biblioteca', hora: 'dia' };
  assert.ok(!('h' in compactar(e)), 'de día no hay h: el enlace es el mismo que antes de PR-D8');
  assert.ok(!('h' in compactar({ ...e, hora: undefined })));
  assert.equal(compactar({ ...e, hora: 'noche' }).h, 'noche');
  const ida = decodificarLook(aBase64url(JSON.stringify(compactar({ ...e, hora: 'noche' }))), validarLook, OPC);
  assert.equal(ida.ok, true); assert.equal(ida.estado.hora, 'noche'); assert.equal(ida.estado.world, 'biblioteca');
  const v1 = decodificarLook(aBase64url(JSON.stringify({ v: 1, b: 'grabador', l: lookOf({}), i: 'pluma', w: 'taller-londres', n: 'Tomás' })), validarLook, OPC);
  assert.equal(v1.ok, true); assert.equal(v1.estado.hora, 'dia', 'un enlace de antes abre de día');
  const v2 = decodificarLook(aBase64url(JSON.stringify({ v: 2, b: 'grabador', l: lookOf({}), i: 'pluma', w: 'aula', m: 'Hola' })), validarLook, OPC);
  assert.equal(v2.ok, true); assert.equal(v2.estado.hora, 'dia'); assert.equal(v2.estado.world, 'aula', 'un mundo nuevo se acepta');
  for (const raro of ['mediodia', 7, null, { x: 1 }]) assert.equal(normalizarLook({ ...compactar(e), h: raro }, validarLook, OPC).estado.hora, 'dia', JSON.stringify(raro));
  assert.equal(normalizarLook(compactar({ ...e, hora: 'noche' }), validarLook, { mundos: [...WORLD_NAMES] }).estado.hora, 'noche', 'sin lista de horas se respeta la que viene');
  // exportar e importar JSON conservan la hora; sin hora no aparece la clave
  const json = exportarJson({ ...e, hora: 'atardecer' }); assert.match(json, /"hora": "atardecer"/);
  assert.equal(importarJson(json, validarLook, OPC).estado.hora, 'atardecer');
  assert.doesNotMatch(exportarJson(e), /hora/);
});

test('PR-D8: la hora se guarda en Mis looks y en el borrador; los guardados de antes (sin hora) siguen leyéndose', () => {
  const e = { base: 'grabador', look: lookOf({}), item: 'pluma', world: 'observatorio', hora: 'noche' };
  const { look } = guardarLook([], e, { nombre: 'Noche' });
  assert.equal(look.hora, 'noche');
  const leidos = parsearLooks(serializarLooks([look, { id: 'viejo', nombre: 'Viejo', fecha: 1, base: 'grabador', look: lookOf({}), item: null, world: 'foro-roma' }]), validarLook);
  assert.equal(leidos.length, 2); assert.equal(leidos[0].hora, 'noche'); assert.ok(!('hora' in leidos[1]), 'un look de antes no trae hora (el diseñador lo abre de día)');
  assert.equal(parsearLooks(serializarLooks([{ ...look, id: 'raro', hora: 7 }]), validarLook).length, 0, 'hora que no es texto: look inválido');
  const b = armarBorrador(e, 2, null, 1000);
  assert.equal(b.hora, 'noche'); assert.equal(parsearBorrador(serializarBorrador(b), validarLook).hora, 'noche');
  const viejo = parsearBorrador(serializarBorrador({ v: 1, borradorId: 'abc-0000000', paso: 2, fecha: 1, base: 'grabador', look: lookOf({}), item: 'pluma', world: 'taller-londres' }), validarLook);
  assert.ok(viejo && !('hora' in viejo), 'un borrador anterior a PR-D8 se lee igual');
});

test('PR-D8: el diseñador trae el selector de hora con iconos dibujados (sin emojis) y pinta vista, tarjetas y marco del Tap con la hora', () => {
  const codigo = leer('../public/taps-engine/disenador.js');
  assert.match(codigo, /id=\\"horas\\" role=\\"group\\"/); for (const id of ['i-sol', 'i-atardecer', 'i-luna']) assert.ok(codigo.includes(`id=\\"${id}\\"`), id);
  assert.doesNotMatch(codigo, /\p{Extended_Pictographic}/u);
  assert.ok((codigo.match(/, null, 1, (estado\.)?hora\)/g) || []).length >= 3, 'vista, miniaturas y marco del Tap pasan la hora');
  assert.ok(!/paintWorld\([^;]*, null, 1\);/.test(codigo), 'ninguna llamada a paintWorld se queda sin hora');
  assert.match(codigo, /hora: HORA_DEFECTO/); assert.match(codigo, /contar\('hora\/' \+ h\)/);
  // el adjunto del API no lleva hora: taps.crear.ts arma el objeto campo a campo (v, borradorId, b, l, i, w)
  const crear = leer('../src/app/taps/taps.crear.ts');
  assert.match(crear, /\{ v: 1, borradorId, b: b\['base'\], l: look, i: b\['item'\] \?\? null, w: b\['world'\] \}/);
  assert.doesNotMatch(crear, /b\['hora'\]/);
  for (const m of NUEVOS) assert.ok(crear.includes(`${m}: '`), `${m} tiene nombre legible en el panel de solicitudes`);
});
