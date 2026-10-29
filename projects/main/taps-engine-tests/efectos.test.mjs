// Sonido del creador de personajes (PR-D1, producto/taps/disenador-v2-plan.md §3): paleta «epoca» y efectos nuevos de
// audio/efectos.js, el tope por tiempo de sonido.js y el contrato de disenador.js (desbloqueo en el gesto, tecla M, clave).
// Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const { renderizarEfecto, EFECTOS, EFECTOS_CREADOR, PALETAS, DURACION_MAXIMA, DURACION_AMBIENTE, PICO, MUNDOS_AMBIENTE, paletaDeTema, claveEfecto, luminancia } = await import(new URL('audio/efectos.js', ENGINE).href);
const { crearSonido } = await import(new URL('audio/sonido.js', ENGINE).href);
const { nombreValido } = await import(new URL('themes/epoca/medicion.js', ENGINE).href);

const SR = 48000;
const pico = x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const cruces = x => { let n = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) n++; return n; };
const E = o => renderizarEfecto(o.nombre, { paleta: 'epoca', sampleRate: SR, ...o });

test('epoca: la paleta existe, los efectos del feed no cambian y los nuevos solo viven en «epoca»', () => {
  assert.ok(PALETAS.includes('epoca'));
  assert.deepEqual([...EFECTOS], ['toque', 'acierto', 'fallo', 'racha', 'resultado', 'deslizar', 'tic', 'aparece', 'blip'], 'la lista del feed sigue igual');
  assert.deepEqual([...EFECTOS_CREADOR], ['pieza', 'color', 'baraja', 'logro', 'guardar', 'ambiente']);
  assert.equal(paletaDeTema('epoca'), 'epoca');
  assert.equal(paletaDeTema('minecraft'), 'bloque', 'los temas del feed siguen con su paleta');
  for (const n of EFECTOS_CREADOR) assert.equal(renderizarEfecto(n, { paleta: 'suave' }).length, 0, `${n} no existe en suave (no lanza)`);
  for (const n of EFECTOS_CREADOR) assert.equal(renderizarEfecto(n, { paleta: 'bloque' }).length, 0, `${n} no existe en bloque`);
});

test('epoca: cada efecto dura ≤ 400 ms (ambiente ≤ 1,2 s), pico ≤ −6 dBFS, sin NaN y termina sin clic', () => {
  for (const nombre of [...EFECTOS, ...EFECTOS_CREADOR]) {
    const x = E({ nombre, mundo: MUNDOS_AMBIENTE[0] });
    const tope = nombre === 'ambiente' ? DURACION_AMBIENTE : DURACION_MAXIMA;
    assert.ok(x.length > 0, `${nombre} no está vacío`);
    assert.ok(x.length <= Math.ceil(tope * SR), `${nombre} dura ${(x.length / SR).toFixed(3)} s`);
    assert.ok(pico(x) <= PICO + 1e-6 && pico(x) > 0.2, `${nombre} pico ${pico(x)}`);
    assert.ok(x.every(Number.isFinite), `${nombre} sin NaN`);
    assert.ok(Math.abs(x[x.length - 1]) < 0.01, `${nombre} termina sin clic`);
  }
  assert.ok(E({ nombre: 'ambiente' }).length > DURACION_MAXIMA * SR, 'el ambiente es el único que pasa de 400 ms');
  assert.ok(E({ nombre: 'logro' }).length <= Math.ceil(DURACION_MAXIMA * SR));
});

test('epoca: deterministas por semilla y distintos de la paleta suave', () => {
  for (const nombre of [...EFECTOS_CREADOR, 'toque', 'aparece']) assert.deepEqual(E({ nombre, mundo: 'foro-roma' }), E({ nombre, mundo: 'foro-roma' }), nombre);
  assert.notDeepEqual(E({ nombre: 'toque' }), renderizarEfecto('toque', { paleta: 'suave', sampleRate: SR }), 'el toque del creador suena al tema');
  assert.deepEqual(E({ nombre: 'acierto' }), renderizarEfecto('acierto', { paleta: 'suave', sampleRate: SR }), 'acierto y fallo son los del feed (coherencia al probar)');
  assert.deepEqual(E({ nombre: 'fallo' }), renderizarEfecto('fallo', { paleta: 'suave', sampleRate: SR }));
});

test('epoca: la pieza sube con el índice, el color con la luminancia, deshacer baja y la baraja no es solo «aparece»', () => {
  const p0 = E({ nombre: 'pieza', indice: 0, total: 8 }), p7 = E({ nombre: 'pieza', indice: 7, total: 8 });
  assert.ok(cruces(p7) > cruces(p0) * 1.2, 'Sol5 más agudo que Do5');
  assert.deepEqual(E({ nombre: 'pieza', indice: 40, total: 8 }), p7, 'el índice se acota al grupo');
  const oscuro = E({ nombre: 'color', luminancia: 0.05 }), claro = E({ nombre: 'color', luminancia: 0.95 });
  assert.ok(cruces(claro) > cruces(oscuro) * 1.4, 'claro agudo, oscuro grave');
  assert.deepEqual(E({ nombre: 'color', luminancia: 7 }), E({ nombre: 'color', luminancia: 1 }), 'la luminancia se acota a 0-1');
  const sube = E({ nombre: 'deslizar' }), baja = E({ nombre: 'deslizar', inverso: true });
  assert.notDeepEqual(sube, baja);
  const mitad = x => [cruces(x.subarray(0, x.length >> 1)), cruces(x.subarray(x.length >> 1))];
  assert.ok(mitad(sube)[0] < mitad(sube)[1] && mitad(baja)[0] > mitad(baja)[1], 'el «fiu» sube y el de deshacer baja');
  assert.notDeepEqual(E({ nombre: 'baraja' }), E({ nombre: 'aparece' }));
  assert.ok(E({ nombre: 'baraja' }).length > E({ nombre: 'aparece' }).length);
});

test('epoca: cada mundo tiene su ambiente, se funde a cero y un mundo desconocido suena como el primero', () => {
  const todos = MUNDOS_AMBIENTE.map(mundo => E({ nombre: 'ambiente', mundo }));
  assert.equal(new Set(todos.map(x => x.join(',').slice(0, 4000))).size, MUNDOS_AMBIENTE.length, 'cinco ambientes distintos');
  for (const x of todos) { assert.ok(x.length <= Math.ceil(DURACION_AMBIENTE * SR)); assert.ok(pico(x.subarray(x.length - SR * 0.02)) < 0.1, 'se funde a cero'); }
  assert.deepEqual(E({ nombre: 'ambiente', mundo: 'marte' }), todos[0]);
  assert.deepEqual(E({ nombre: 'ambiente' }), todos[0]);
});

test('claveEfecto: variantes del creador en la caché (pieza por tono, color por escalón, ambiente por mundo, deshacer invertido)', () => {
  assert.equal(claveEfecto('pieza', { paleta: 'epoca', indice: 0, total: 8 }), 'epoca:pieza:6');
  assert.equal(claveEfecto('pieza', { paleta: 'epoca', indice: 7, total: 8 }), 'epoca:pieza:20');
  assert.equal(claveEfecto('pieza', { paleta: 'epoca', indice: 3, total: 8 }), claveEfecto('pieza', { paleta: 'epoca', indice: 3, total: 8 }));
  assert.equal(claveEfecto('color', { paleta: 'epoca', luminancia: 0 }), 'epoca:color:0');
  assert.equal(claveEfecto('color', { paleta: 'epoca', luminancia: 1 }), 'epoca:color:8');
  assert.equal(claveEfecto('color', { paleta: 'epoca', luminancia: 0.5 }), claveEfecto('color', { paleta: 'epoca', luminancia: 0.52 }), 'pocas variantes en caché');
  assert.equal(claveEfecto('ambiente', { paleta: 'epoca', mundo: 'sala-medieval' }), 'epoca:ambiente:sala-medieval');
  assert.equal(claveEfecto('ambiente', { paleta: 'epoca', mundo: 'marte' }), 'epoca:ambiente:excavacion-egipto');
  assert.equal(claveEfecto('deslizar', { paleta: 'epoca', inverso: true }), 'epoca:deslizar:inverso');
  assert.equal(claveEfecto('deslizar', { paleta: 'epoca' }), 'epoca:deslizar');
  assert.equal(claveEfecto('toque', { paleta: 'suave' }), 'suave:toque', 'las claves del feed no cambian');
});

test('luminancia: negro 0, blanco 1, el marfil más claro que el azul noche, y colores raros 0,5', () => {
  assert.equal(luminancia('#000000'), 0);
  assert.equal(luminancia('#ffffff'), 1);
  assert.ok(luminancia('#f3ead7') > 0.75 && luminancia('#1b2a4a') < 0.05);
  assert.equal(luminancia('azul'), 0.5); assert.equal(luminancia(null), 0.5); assert.equal(luminancia('#fff'), 0.5);
});

// ───────────── reproductor: tope por tiempo y «sin Web Audio no lanza» ─────────────
function audioFalso() {
  const log = [];
  const param = () => ({ value: 1, setTargetAtTime(v) { this.value = v; } });
  const nodo = extra => ({ connect() {}, ...extra });
  class AC {
    constructor() { this.state = 'running'; this.sampleRate = 48000; this.currentTime = 0; this.destination = {}; }
    createGain() { return nodo({ gain: param() }); }
    createDynamicsCompressor() { return nodo({ threshold: param(), ratio: param() }); }
    createBuffer(c, n, sr) { const d = new Float32Array(n); return { length: n, sampleRate: sr, getChannelData: () => d }; }
    createBufferSource() { return nodo({ playbackRate: param(), start() { log.push('start'); }, stop() {} }); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  return { AC, log };
}

test('sonido: `cadaMs` deja pasar un «color» cada 80 ms y descarta el resto; otros efectos no se ven afectados', () => {
  const { AC, log } = audioFalso(); globalThis.AudioContext = AC;
  const reloj = performance.now; let t = 1000; performance.now = () => t;
  try {
    const s = crearSonido(); s.desbloquear(); s.silenciar(false);
    const color = l => s.tocar('color', { paleta: 'epoca', luminancia: l, cadaMs: 80 });
    assert.equal(color(0.2), true);
    t += 30; assert.equal(color(0.3), false, 'a los 30 ms se descarta');
    t += 30; assert.equal(color(0.4), false, 'a los 60 ms también');
    assert.equal(s.tocar('pieza', { paleta: 'epoca', indice: 2, total: 8 }), true, 'la pieza no comparte el tope');
    t += 25; assert.equal(color(0.5), true, 'a los 85 ms vuelve a sonar');
    assert.equal(log.filter(x => x === 'start').length, 3);
    s.destruir();
  } finally { performance.now = reloj; delete globalThis.AudioContext; }
});

test('sonido: sin Web Audio, desbloquear devuelve false y tocar no lanza; el ambiente se toca como cualquier efecto', () => {
  delete globalThis.AudioContext; delete globalThis.webkitAudioContext;
  const s = crearSonido();
  assert.equal(s.desbloquear(), false);
  assert.equal(s.tocar('pieza', { paleta: 'epoca' }), false);
  assert.equal(s.tocar('ambiente', { paleta: 'epoca', mundo: 'foro-roma' }), false);
  const { AC } = audioFalso(); globalThis.AudioContext = AC;
  try {
    const u = crearSonido(); u.desbloquear(); u.silenciar(false);
    assert.equal(u.tocar('ambiente', { paleta: 'epoca', mundo: 'foro-roma', vol: 0.45 }), true);
    assert.equal(u.tocar('logro', { paleta: 'epoca' }), true);
    assert.equal(u.tocar('pieza', { paleta: 'suave' }), false, 'fuera de epoca no existe: nada suena, nada lanza');
    u.destruir();
  } finally { delete globalThis.AudioContext; }
});

test('sonido: precalentar acepta la lista del creador y su paleta (una vez por paleta)', async () => {
  const { AC } = audioFalso(); globalThis.AudioContext = AC;
  const antes = globalThis.requestIdleCallback; const colas = []; globalThis.requestIdleCallback = fn => colas.push(fn);
  try {
    const s = crearSonido(); s.desbloquear();
    s.precalentar('epoca', { paleta: 'epoca', lista: [['pieza', { indice: 0, total: 8 }], ['ambiente', { mundo: 'taller-londres' }]] });
    s.precalentar('epoca', { paleta: 'epoca', lista: [['logro']] });
    assert.equal(colas.length, 1, 'la segunda llamada con la misma paleta no encola nada');
    while (colas.length) colas.shift()();
    s.destruir();
  } finally { globalThis.requestIdleCallback = antes; delete globalThis.AudioContext; }
});

// ───────────── contrato de disenador.js (se lee el código: el comportamiento vivo lo cubre tap-disenador.component.spec.ts) ─────────────
const codigo = readFileSync(new URL('disenador.js', ENGINE), 'utf8');
const cuerpo = codigo.slice(codigo.indexOf('export async function montarDisenador'));

test('disenador.js: el sonido se desbloquea solo en pointerup/click/keydown dentro del diseñador, nunca en pointerdown ni touchstart', () => {
  assert.match(cuerpo, /for \(const ev of \['pointerup', 'click', 'keydown'\]\) escuchar\(raiz, ev, gesto\);/);
  assert.doesNotMatch(cuerpo, /escuchar\(raiz, 'pointerdown'|escuchar\(\w+, 'touchstart'/);
  assert.match(cuerpo, /if \(!sonidoActivo \|\| !huboGesto\) return false;/, 'nada suena antes del primer gesto');
  assert.match(cuerpo, /const sonido = crearSonido\(\);/);
  assert.match(cuerpo, /sonido\.destruir\(\)/, 'destruir() cierra el audio');
  assert.match(cuerpo, /if \(document\.hidden\) sonido\.pausar\(\); else sonido\.reanudar\(\);/);
});

test('disenador.js: altavoz dibujado (sin emojis) y tecla M; clave propia o enlace con el silencio general; movimiento reducido quita glisandos y ambiente', () => {
  assert.match(codigo, /export const CLAVE_SONIDO = 'taps\.disenador\.sonido';/);
  assert.match(codigo, /id=\\"sonido\\" class=\\"altavoz\\" aria-pressed=\\"false\\"/);
  assert.match(codigo, /<symbol id=\\"i-altavoz\\"/); assert.match(codigo, /<symbol id=\\"i-altavoz-off\\"/);
  assert.doesNotMatch(codigo, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sin emojis en la interfaz');
  assert.match(cuerpo, /if \(e\.key !== 'm' && e\.key !== 'M'\) return;/);
  assert.match(cuerpo, /sonidoEnlace \? sonidoEnlace\.activo\(\) !== false : almacen\.leer\(CLAVE_SONIDO\) === 'on'/);
  assert.match(cuerpo, /almacen\.escribir\(CLAVE_SONIDO, sonidoActivo \? 'on' : 'off'\)/);
  assert.match(cuerpo, /contar\('sonido\/' \+ \(sonidoActivo \? 'on' : 'off'\)\)/);
  assert.match(cuerpo, /tipo === 'sorpresa'\) return sonar\(reducido \? 'toque' : 'baraja'\)/);
  assert.match(cuerpo, /tipo === 'world'\) \{ if \(reducido\) return sonar\('toque'\);/);
  assert.match(cuerpo, /cadaMs: CADA_COLOR_MS/);
  assert.match(codigo, /export const CADA_COLOR_MS = 80;/);
  assert.match(codigo, /GANANCIA_BAJA = 0\.2, GANANCIA_ERROR = 0\.25/, '−14 dB y −12 dB');
  assert.equal(nombreValido('sonido/on'), 'sonido/on'); assert.equal(nombreValido('sonido/off'), 'sonido/off'); assert.equal(nombreValido('sonido/alto'), null);
});
