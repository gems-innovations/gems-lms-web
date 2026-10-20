// Pruebas de la música de fondo de Taps (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
// El manifiesto y los archivos publicados se comprueban contra el script que los genera; el reproductor, con un
// AudioContext y un fetch falsos que solo registran llamadas (nunca suena nada).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const MUSICA_DIR = new URL('../public/taps-musica/', import.meta.url);
const { crearMusica, pistaPara, candidatas, ordenarArchivos, limitesBucle, elegirCelebracion, DUCKING, VOLUMEN_MUSICA, MAX_BUFFERS, PERMANENCIA_MS } = await import(new URL('audio/musica.js', ENGINE).href);
const { verificar, PISTAS, MAPA, LICENCIA } = await import(new URL('../scripts/procesar-musica-taps.mjs', import.meta.url).href);
const manifiesto = JSON.parse(readFileSync(new URL('musica.json', MUSICA_DIR), 'utf8'));
const banco = readFileSync(new URL('../src/app/taps/taps.banco.generated.ts', import.meta.url), 'utf8');

test('manifiesto: coincide con los archivos publicados (hash en el nombre, tamaños) y con el mapa del script', () => {
  assert.deepEqual(verificar(fileURLToPath(MUSICA_DIR)), []);
  assert.equal(manifiesto.licencia, LICENCIA);
  assert.equal(manifiesto.licencia, 'Eleven Music, plan Creator, 2026-10-19');
  assert.deepEqual(manifiesto.mapa, MAPA);
  assert.deepEqual(manifiesto.pistas.map(p => p.id).sort(), PISTAS.map(p => p.id).sort());
});

test('manifiesto: pistas ligeras, volumen igualado, sin la versión infantil y canciones solo como fragmento', () => {
  for (const p of manifiesto.pistas) {
    assert.ok(['fondo', 'celebracion'].includes(p.tipo), `${p.id}: tipo ${p.tipo}`);
    assert.ok(!/infantil/.test(p.id) && p.archivos.every(a => !/infantil/.test(a.src)), 'nunca la versión infantil');
    assert.deepEqual(p.archivos.map(a => a.tipo), ['audio/webm; codecs=opus', 'audio/mp4; codecs=mp4a.40.2'], `${p.id}: Opus y respaldo AAC`);
    for (const a of p.archivos) assert.ok(a.bytes < 560_000, `${a.src} pesa ${a.bytes}`);
    assert.ok(typeof p.bpm === 'number' && p.bpm >= 60 && p.bpm <= 180, `${p.id}: bpm`);
    if (p.letra) {
      assert.equal(p.tipo, 'celebracion');
      assert.equal(p.bucle, false);
      assert.ok(p.duracion >= 10 && p.duracion <= 15, `${p.id}: fragmento de ${p.duracion} s`);
      assert.ok(Math.abs(p.lufs + 16) <= 0.6, `${p.id}: ${p.lufs} LUFS`);
    } else {
      assert.equal(p.bucle, true);
      assert.ok(p.duracion > 50, `${p.id}: ${p.duracion} s`);
      assert.ok(Math.abs(p.lufs + 20) <= 0.6, `${p.id}: ${p.lufs} LUFS`);
    }
  }
  const letra = manifiesto.pistas.filter(p => p.letra).map(p => p.id).sort();
  assert.deepEqual(letra, ['piensa-bien', 'racha-en-racha', 'tap-tap-aprende']);
  assert.equal(manifiesto.pistas.find(p => p.id === manifiesto.mapa.resultado)?.letra, false, 'el resultado normal es instrumental');
});

test('mapa: cada mundo y tema del banco tiene una pista de fondo (instrumental)', () => {
  const fondo = new Set(manifiesto.pistas.filter(p => p.tipo === 'fondo').map(p => p.id));
  const taps = [...banco.matchAll(/"theme":"([\w-]+)".*?"world":"([\w-]+)".*?"topic":"([\w-]+)"/g)].map(m => ({ motor: m[1], mundo: m[2], tema: m[3] }));
  assert.ok(taps.length > 20);
  for (const t of taps) assert.ok(fondo.has(pistaPara(manifiesto.mapa, t)), `${t.motor}/${t.mundo}/${t.tema}`);
  // Cada categoría tiene su grupo (las pistas que pidió el dueño) y todas son instrumentales de fondo.
  assert.deepEqual(MAPA.grupos.minecraft, ['pixel-quest-loop', 'cave-quiz-crawl', 'magma-quest-loop', 'village-morning-loop', 'island-quiz-loop']);
  assert.deepEqual(MAPA.grupos.logica, ['puzzle-tick-loop', 'cozy-study-loop', 'orbit-quiz-drift']);
  assert.deepEqual(MAPA.grupos.cultura, ['wonder-loop', 'orbit-quiz-drift', 'island-quiz-loop', 'village-morning-loop', 'cozy-study-loop']);
  for (const g of Object.values(MAPA.grupos)) for (const id of g) assert.ok(fondo.has(id), id);
  assert.deepEqual(candidatas(MAPA, { mundo: 'x', tema: 'nuevo', motor: 'estudio' }), MAPA.grupos.estudio, 'categoría sin grupo: el de su motor');
  assert.equal(pistaPara(MAPA, { mundo: 'otro', tema: 'nuevo', motor: 'otro' }), MAPA.defecto);
  assert.equal(pistaPara(MAPA, { mundo: 'cueva', tema: 'nuevo', motor: 'otro' }), 'cave-quiz-crawl', 'sin grupo: la del mundo');
  assert.equal(pistaPara(null, {}), null);
});

test('mapa: elección determinista, nunca la del Tap anterior y el mundo sesga sin forzar', () => {
  const info = { id: 'mc-nether-1', mundo: 'nether', tema: 'minecraft', motor: 'minecraft' };
  assert.equal(pistaPara(MAPA, info), pistaPara(MAPA, { ...info }), 'mismo Tap, misma pista');
  for (const anterior of MAPA.grupos.minecraft) assert.notEqual(pistaPara(MAPA, info, anterior), anterior, anterior);
  // 400 Taps falsos del Nether: magma (su mundo) pesa 2 de 7, como pixel-quest (la firma del grupo); las demás, 1. Sale
  // más que las de peso 1, pero no siempre.
  const cuenta = {};
  for (let i = 0; i < 400; i++) { const id = pistaPara(MAPA, { ...info, id: `n-${i}` }); cuenta[id] = (cuenta[id] ?? 0) + 1; }
  assert.equal(Object.keys(cuenta).length, 5, JSON.stringify(cuenta));
  const magma = cuenta['magma-quest-loop'];
  assert.ok(magma > 80 && magma < 170, `magma ${magma} de 400`);
  for (const id of ['cave-quiz-crawl', 'village-morning-loop', 'island-quiz-loop']) assert.ok(cuenta[id] < magma, `${id} ${cuenta[id]}`);
});

test('utilidades: orden de formatos, límites del bucle y rotación de canciones', () => {
  const archivos = [{ src: 'a.webm', tipo: 'audio/webm; codecs=opus' }, { src: 'a.m4a', tipo: 'audio/mp4; codecs=mp4a.40.2' }];
  assert.deepEqual(ordenarArchivos(archivos, () => 'probably').map(a => a.src), ['a.webm', 'a.m4a']);
  assert.deepEqual(ordenarArchivos(archivos, t => (t.includes('webm') ? '' : 'maybe')).map(a => a.src), ['a.m4a', 'a.webm'], 'Safari antiguo: AAC primero');
  const sr = 1000, datos = new Float32Array(1000).fill(0.3);
  datos.fill(0, 0, 20); datos.fill(0, 990);
  assert.deepEqual(limitesBucle(datos, sr), { inicio: 0.02, fin: 0.99 }, 'se salta el cebado y el relleno del códec');
  assert.deepEqual(limitesBucle(new Float32Array(1000), sr), { inicio: 0, fin: 1 }, 'silencio total: el buffer entero');
  assert.equal(elegirCelebracion(MAPA, 'perfecto', null), 'tap-tap-aprende');
  assert.equal(elegirCelebracion(MAPA, 'perfecto', 'tap-tap-aprende'), 'piensa-bien');
  assert.equal(elegirCelebracion(MAPA, 'perfecto', 'piensa-bien'), 'tap-tap-aprende');
  assert.equal(elegirCelebracion(MAPA, 'racha', 'racha-en-racha'), 'racha-en-racha');
  assert.equal(elegirCelebracion(MAPA, 'otro', null), null);
});

// ───────────── reproductor (AudioContext y fetch falsos) ─────────────
function entorno({ fallaWebm = false, lento = 0 } = {}) {
  const log = [], pedidos = [];
  const param = v => ({ value: v, setTargetAtTime(x) { this.value = x; }, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x) { this.value = x; }, cancelScheduledValues() {} });
  const fuentes = [];
  class AC {
    constructor() { this.state = 'running'; this.sampleRate = 48000; this.currentTime = 0; this.destination = { nombre: 'destino' }; }
    createGain() { return { gain: param(1), connect(n) { this.destino = n; }, disconnect() {} }; }
    createBufferSource() {
      const s = { loop: false, loopStart: 0, loopEnd: 0, connect() {}, start(t, o) { s.inicio = o; s.sonando = true; log.push(`start:${s.buffer.id}`); }, stop() { s.sonando = false; log.push(`stop:${s.buffer.id}`); } };
      fuentes.push(s); return s;
    }
    decodeAudioData(datos) {
      const id = new TextDecoder().decode(datos);
      if (fallaWebm && id.endsWith('.webm')) return Promise.reject(new Error('no se puede decodificar'));
      const n = 48000 * (id.includes('tap-tap') || id.includes('racha') || id.includes('piensa') ? 12 : 58);
      log.push(`decode:${id}`);
      const canal = new Float32Array(n).fill(0.2);
      const b = { id: id.replace(/\..*$/, ''), sampleRate: 48000, duration: n / 48000, length: n, getChannelData: () => canal };
      return lento ? new Promise(r => setTimeout(() => r(b), lento)) : Promise.resolve(b);
    }
  }
  const fetch = async url => {
    const ruta = new URL(url).pathname; pedidos.push(ruta);
    if (ruta.endsWith('musica.json')) return { ok: true, json: async () => manifiesto };
    const nombre = ruta.split('/').pop();
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(nombre).buffer };
  };
  return { AC, log, pedidos, fuentes, fetch };
}
const esperar = () => new Promise(r => setTimeout(r, 5));
const nuevo = e => crearMusica({ manifiesto: 'http://x/taps-musica/musica.json', fetch: e.fetch, puede: () => 'maybe' });
const cueva = { id: 't-cueva', mundo: 'cueva', tema: 'minecraft', motor: 'minecraft' };
const aula = { id: 't-aula', mundo: 'aula', tema: 'logica', motor: 'estudio' };
/** Lo que el mapa elige para cada uno (la cueva primero; el aula, después de ella). */
const P_CUEVA = pistaPara(MAPA, cueva), P_AULA = pistaPara(MAPA, aula, P_CUEVA);

test('música: apagada no pide nada; encendida sin AudioContext (sin gesto) tampoco', async () => {
  const e = entorno(), m = nuevo(e);
  await m.alTap(cueva);
  m.silenciar(false);
  await esperar();
  assert.deepEqual(e.pedidos, [], 'apagada: nada a la red');
  m.encender(true);
  await m.alTap(cueva); await esperar();
  assert.deepEqual(e.pedidos, [], 'sin contexto (antes del primer gesto) no se pide nada');
  m.conectar(new e.AC()); await esperar(); await esperar();
  assert.deepEqual(e.pedidos.map(p => p.split('/').pop().replace(/\.[0-9a-f]{8}\./, '.')), ['musica.json', `${P_CUEVA}.webm`], 'solo el manifiesto y la pista necesaria');
  assert.equal(m.pistaActual, P_CUEVA);
  const f = e.fuentes.at(-1);
  assert.equal(f.loop, true);
  assert.ok(f.loopEnd > f.loopStart);
});

test('música: silenciada no suena; fundido cruzado al cambiar de mundo y la misma pista sigue sin cortes', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(true);
  await m.alTap(cueva); await esperar();
  assert.equal(e.fuentes.length, 0, 'con el sonido apagado no arranca ninguna pista');
  m.silenciar(false); await esperar(); await esperar();
  assert.equal(m.pistaActual, P_CUEVA);
  await m.alTap({ ...cueva, id: 't-noche', mundo: 'noche' });
  assert.equal(e.fuentes.length, 1, 'otro Tap de Minecraft antes de 20 s: la pista que suena le vale y no se reinicia');
  await m.alTap(aula); await esperar();
  assert.equal(m.pistaActual, P_AULA);
  assert.ok(e.log.includes(`stop:${P_CUEVA}`), 'la anterior se suelta (con fundido)');
});

test('música: pausa por pestaña oculta o pausa sana y vuelve donde iba; apagar para', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  ac.currentTime = 10;
  m.pausar('oculta');
  assert.equal(m.pistaActual, null);
  m.pausar('pausa-sana'); m.reanudar('oculta'); await esperar();
  assert.equal(m.pistaActual, null, 'sigue en pausa mientras quede un motivo');
  m.reanudar('pausa-sana'); await esperar(); await esperar();
  assert.equal(m.pistaActual, P_CUEVA);
  assert.ok(Math.abs(e.fuentes.at(-1).inicio - 10) < 0.1, 'retoma en el mismo punto del bucle');
  m.encender(false);
  assert.equal(m.pistaActual, null);
});

test('música: 5/5 → fragmento con letra sin bucle y luego la instrumental de premios; resultado normal, solo instrumental', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  assert.equal(await m.alResultado({ perfecto: true }), 'tap-tap-aprende');
  const cancion = e.fuentes.at(-1);
  assert.equal(cancion.buffer.id, 'tap-tap-aprende');
  assert.equal(cancion.loop, false, 'la canción suena una vez');
  cancion.onended();
  await esperar(); await esperar();
  assert.equal(m.pistaActual, 'prize-parade-loop');
  assert.equal(await m.alResultado({ racha: true }), 'racha-en-racha', 'la racha manda');
  await m.alTap(aula); await esperar();
  assert.equal(m.pistaActual, P_AULA, 'al volver a una pregunta la canción se va');
  assert.equal(await m.alResultado({}), 'prize-parade-loop');
});

test('música: callar u ocultar mientras suena la canción → al volver entra la instrumental de premios (no se queda muda)', async () => {
  for (const callar of [m => m.silenciar(true), m => m.pausar('oculta'), m => m.encender(false)]) {
    const e = entorno(), m = nuevo(e), ac = new e.AC();
    m.conectar(ac); m.encender(true); m.silenciar(false);
    await m.alTap(cueva); await esperar(); await esperar();
    await m.alResultado({ perfecto: true }); await esperar(); await esperar();
    assert.equal(m.pistaActual, 'tap-tap-aprende');
    callar(m);
    assert.equal(m.pistaActual, null);
    m.silenciar(false); m.reanudar('oculta'); m.encender(true);
    await esperar(); await esperar(); await esperar();
    assert.equal(m.pistaActual, 'prize-parade-loop', 'antes no volvía nada hasta el Tap siguiente');
    assert.ok(!e.fuentes.some(x => x.buffer.id === 'tap-tap-aprende' && x.sonando), 'la canción no se repite');
  }
});

test('música: apagarla y volverla a encender en el mismo Tap sigue donde iba (no vuelve a empezar)', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  ac.currentTime = 12;
  m.encender(false);
  assert.equal(m.pistaActual, null);
  m.encender(true);
  await m.alTap(cueva); await esperar(); await esperar();                // el feed pide la del Tap a la vista al encenderla
  assert.equal(m.pistaActual, P_CUEVA);
  const arranques = e.fuentes.filter(x => x.buffer.id === P_CUEVA);
  assert.ok(Math.abs(arranques.at(-1).inicio - 12) < 0.1, `retoma en ${arranques.at(-1).inicio}, no en 0`);
});

test('música: anticipar en el resultado baja la pista que de verdad sonará en el Tap siguiente', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  await m.alResultado({ perfecto: true }); await esperar(); await esperar();
  // Varios Taps de Minecraft: lo anticipado (con la canción sonando) es lo que alTap elige después.
  let pedidas = 0;
  for (let i = 0; i < 12; i++) {
    const otro = { id: `mc-${i}`, mundo: 'pradera', tema: 'minecraft', motor: 'minecraft' };
    e.pedidos.length = 0;
    await m.anticipar(otro); await esperar();
    const esperada = pistaPara(MAPA, otro, P_CUEVA), pistas = e.pedidos.filter(p => /\.(webm|m4a)$/.test(p));
    for (const p of pistas) assert.ok(p.includes(`/${esperada}.`), `${otro.id}: se pidió ${p} y sonará ${esperada}`);
    pedidas += pistas.length;
  }
  assert.ok(pedidas > 0);
});

test('música: apagada o en silencio, ninguna celebración suena', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.silenciar(false);
  assert.equal(await m.alResultado({ perfecto: true }), null);
  m.encender(true); m.silenciar(true);
  await m.alResultado({ perfecto: true }); await esperar();
  assert.equal(e.fuentes.length, 0);
});

test('música: ducking al 30 % con la voz y un instante con los efectos', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  const ganancias = [], crear = ac.createGain.bind(ac);
  ac.createGain = () => { const g = crear(); ganancias.push(g); return g; };
  m.conectar(ac); m.encender(true); m.silenciar(false);
  const [bus, duck] = ganancias;
  assert.equal(duck.destino, ac.destination, 'bus propio de música directo al destino (no pasa por el compresor de efectos)');
  await m.alTap(cueva); await esperar(); await esperar();
  assert.equal(bus.gain.value, 1);
  m.voz(true);
  assert.equal(duck.gain.value, DUCKING);
  m.voz(false);
  assert.equal(duck.gain.value, 1);
  m.efecto();
  assert.equal(duck.gain.value, DUCKING);
  await new Promise(r => setTimeout(r, 700));
  assert.equal(duck.gain.value, 1, 'vuelve sola tras el efecto');
  assert.ok(VOLUMEN_MUSICA <= 0.6, 'volumen sobrio');
});

test('música: si el navegador no decodifica Opus/WebM, cae al AAC', async () => {
  const e = entorno({ fallaWebm: true }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar(); await esperar();
  assert.equal(m.pistaActual, P_CUEVA);
  assert.ok(e.log.some(l => l.startsWith(`decode:${P_CUEVA}.`) && /\.[0-9a-f]{8}\.m4a$/.test(l)), e.log.join(' '));
});

test('música: anticipar baja la pista siguiente sin decodificarla ni sonar (y no antes de que suene la primera)', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.anticipar(aula); await esperar();
  assert.ok(!e.pedidos.some(p => p.includes(P_AULA)), 'sin nada sonando aún, la siguiente no compite por la red');
  await m.alTap(cueva); await esperar(); await esperar();
  await m.anticipar(aula); await esperar();
  assert.ok(e.pedidos.some(p => p.includes(P_AULA)));
  assert.ok(!e.log.some(l => l.startsWith(`decode:${P_AULA}`)), 'sin decodificar');
  assert.equal(m.pistaActual, P_CUEVA);
});

test('música: al pasar a la pregunta, la canción se va ya aunque la pista siguiente tarde en decodificar, y no vuelve la de premios', async () => {
  const e = entorno({ lento: 300 }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await new Promise(r => setTimeout(r, 350));
  assert.equal(m.pistaActual, P_CUEVA);
  await m.alResultado({ perfecto: true });
  assert.equal(m.pistaActual, 'tap-tap-aprende');
  const cancion = e.fuentes.at(-1);
  const pendiente = m.alTap(aula);                                      // la pista de lógica tarda 300 ms en decodificar
  await esperar();
  assert.equal(m.pistaActual, null, 'la canción no sigue encima de la pregunta mientras se decodifica');
  assert.ok(e.log.includes('stop:tap-tap-aprende'));
  cancion.onended?.();                                                  // el fin de la canción ya no pone nada
  await pendiente; await esperar();
  assert.equal(m.pistaActual, P_AULA);
  await new Promise(r => setTimeout(r, 350));
  assert.equal(m.pistaActual, P_AULA, 'prize-parade no pisa la pista del mundo');
  assert.ok(!e.fuentes.some(x => x.buffer.id === 'prize-parade-loop' && x.sonando), 'la de premios no arrancó');
});

test('música: si WebM no decodifica, se recuerda y las siguientes pistas (y anticipar) piden directamente el M4A', async () => {
  const e = entorno({ fallaWebm: true }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar(); await esperar();
  assert.equal(m.pistaActual, P_CUEVA);
  e.pedidos.length = 0;
  await m.anticipar(aula); await esperar();
  await m.alTap(aula); await esperar(); await esperar();
  assert.equal(m.pistaActual, P_AULA);
  assert.ok(e.pedidos.length > 0 && e.pedidos.every(p => p.endsWith('.m4a')), e.pedidos.join(' '));
  e.pedidos.length = 0;
  await m.alTap(cueva); await esperar();
  assert.deepEqual(e.pedidos, [], 'lo que sí decodificó queda guardado');
});

test('música: nunca hay más de ' + MAX_BUFFERS + ' buffers vivos (guardados + decodificándose)', async () => {
  const e = entorno({ lento: 40 }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  let max = 0;
  const vigilar = setInterval(() => { max = Math.max(max, m.buffersVivos); }, 2);
  const mundos = ['cueva', 'nether', 'aldea', 'playa', 'espacio', 'pradera', 'biblioteca'];
  for (const mundo of mundos) { void m.alTap({ mundo, tema: 'x', motor: 'x' }); await esperar(); }
  await m.alResultado({ perfecto: true });
  await new Promise(r => setTimeout(r, 400));
  clearInterval(vigilar);
  assert.ok(max <= MAX_BUFFERS, `máximo ${max}`);
  assert.ok(m.buffersVivos <= MAX_BUFFERS);
});

test('música: deslizar rápido no corta la pista; pasados 20 s, el Tap siguiente trae otra; al volver, la misma de antes', async () => {
  let reloj = 0;
  const e = entorno(), ac = new e.AC();
  const m = crearMusica({ manifiesto: 'http://x/taps-musica/musica.json', fetch: e.fetch, puede: () => 'maybe', reloj: () => reloj });
  m.conectar(ac); m.encender(true); m.silenciar(false);
  const tap = i => ({ id: `mc-${i}`, mundo: 'pradera', tema: 'minecraft', motor: 'minecraft' });
  await m.alTap(tap(0)); await esperar(); await esperar();
  const primera = m.pistaActual;
  assert.ok(primera);
  reloj = 5_000;
  assert.equal(await m.alTap(tap(1)), primera, 'a los 5 s la pista sigue (también vale para Minecraft)');
  assert.equal(e.fuentes.length, 1);
  reloj = PERMANENCIA_MS + 1;
  const otra = await m.alTap(tap(2)); await esperar(); await esperar();
  assert.notEqual(otra, primera, 'pasados 20 s, el Tap nuevo no repite la del anterior');
  assert.equal(m.pistaActual, otra);
  reloj += PERMANENCIA_MS + 1;
  assert.equal(await m.alTap(tap(0)), primera, 'volver a un Tap trae su misma pista');
});

test('música: entra con un fundido de entrada (no de golpe) y el cambio de pista es un fundido cruzado', async () => {
  const e = entorno(), ac = new e.AC();
  const rampas = [], crear = ac.createGain.bind(ac);
  ac.createGain = () => { const g = crear(); const r = g.gain.linearRampToValueAtTime; g.gain.linearRampToValueAtTime = (v, t) => { rampas.push({ v, t }); return r.call(g.gain, v, t); }; return g; };
  const m = nuevo(e);
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  assert.deepEqual(rampas[0], { v: VOLUMEN_MUSICA, t: 0.6 }, 'primera pista de la visita: fundido corto (600 ms), que se note ya en la primera respuesta');
  await m.alTap(aula); await esperar(); await esperar();
  assert.ok(rampas.some(r => r.v === VOLUMEN_MUSICA && r.t === 0.8), 'cambio de pista: 800 ms');
  m.pausar('oculta'); await esperar();
  rampas.length = 0;
  m.reanudar('oculta'); await esperar(); await esperar();
  assert.ok(rampas.some(r => r.v === VOLUMEN_MUSICA && r.t === 1.5), 'al volver de una pausa: de 0 al volumen en 1,5 s');
});

test('música: preparar baja y decodifica antes del gesto con un contexto suspendido; al conectar suena sin esperar', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  ac.state = 'suspended';
  m.encender(true); m.silenciar(false);
  assert.equal(await m.preparar(cueva, ac), P_CUEVA, 'la misma pista que elegirá alTap');
  assert.deepEqual(e.pedidos.map(p => p.split('/').pop().replace(/\.[0-9a-f]{8}\./, '.')), ['musica.json', `${P_CUEVA}.webm`]);
  assert.equal(e.log.filter(l => l.startsWith('decode:')).length, 1, 'decodificada de antemano');
  assert.deepEqual(m.listas, [P_CUEVA]);
  assert.equal(e.fuentes.length, 0, 'nada suena antes del gesto');
  // El gesto: el mismo contexto se conecta y el Tap pide su pista. Arranca sin red ni decodificar otra vez.
  m.conectar(ac);
  await m.alTap(cueva);
  assert.equal(m.pistaActual, P_CUEVA);
  assert.equal(e.fuentes.length, 1);
  assert.equal(e.pedidos.length, 2, 'sin pedir nada más');
  assert.equal(e.log.filter(l => l.startsWith('decode:')).length, 1, 'sin decodificar otra vez');
});

test('música: preparar con la música apagada no pide nada; sin contexto solo baja los bytes', async () => {
  const e = entorno(), m = nuevo(e);
  assert.equal(await m.preparar(cueva, new e.AC()), null);
  assert.deepEqual(e.pedidos, []);
  m.encender(true);
  await m.preparar(cueva, null);
  assert.equal(e.pedidos.length, 2);
  assert.equal(e.log.filter(l => l.startsWith('decode:')).length, 0);
});

test('música: al pasar de la portada a /taps (continuar) la pista sigue si le vale al Tap, aunque lleve más de 20 s', async () => {
  let reloj = 0;
  const e = entorno(), ac = new e.AC();
  const m = crearMusica({ manifiesto: 'http://x/taps-musica/musica.json', fetch: e.fetch, puede: () => 'maybe', reloj: () => reloj });
  m.conectar(ac); m.encender(true); m.silenciar(false);
  const tap = i => ({ id: `mc-${i}`, mundo: 'pradera', tema: 'minecraft', motor: 'minecraft' });
  await m.alTap(tap(0)); await esperar(); await esperar();
  const primera = m.pistaActual;
  reloj = PERMANENCIA_MS * 3;
  assert.equal(await m.alTap(tap(1), { continuar: true }), primera);
  assert.equal(e.fuentes.length, 1, 'no se reinicia');
  assert.notEqual(await m.alTap(aula, { continuar: true }), primera, 'si no le vale, cambia (con fundido cruzado)');
});
