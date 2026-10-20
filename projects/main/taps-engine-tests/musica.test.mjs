// Pruebas de la música de fondo de Taps (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
// El manifiesto y los archivos publicados se comprueban contra el script que los genera; el reproductor, con un
// AudioContext y un fetch falsos que solo registran llamadas (nunca suena nada).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const MUSICA_DIR = new URL('../public/taps-musica/', import.meta.url);
const { crearMusica, pistaPara, ordenarArchivos, limitesBucle, elegirCelebracion, DUCKING, VOLUMEN_MUSICA, MAX_BUFFERS } = await import(new URL('audio/musica.js', ENGINE).href);
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
  assert.equal(pistaPara(MAPA, { mundo: 'cueva', tema: 'minecraft', motor: 'minecraft' }), 'cave-quiz-crawl');
  assert.equal(pistaPara(MAPA, { mundo: 'nether', tema: 'minecraft', motor: 'minecraft' }), 'magma-quest-loop');
  assert.equal(pistaPara(MAPA, { mundo: 'pradera', tema: 'minecraft', motor: 'minecraft' }), 'pixel-quest-loop');
  assert.equal(pistaPara(MAPA, { mundo: 'aula', tema: 'logica', motor: 'estudio' }), 'puzzle-tick-loop');
  assert.equal(pistaPara(MAPA, { mundo: 'espacio', tema: 'cultura', motor: 'estudio' }), 'orbit-quiz-drift');
  // Lógica manda sobre el mundo (temaPrimero): espacio, observatorio y biblioteca suenan a lógica.
  for (const mundo of ['espacio', 'observatorio', 'biblioteca']) assert.equal(pistaPara(MAPA, { mundo, tema: 'logica', motor: 'estudio' }), 'puzzle-tick-loop', mundo);
  assert.equal(pistaPara(MAPA, { mundo: 'biblioteca', tema: 'cultura', motor: 'estudio' }), 'cozy-study-loop');
  assert.equal(pistaPara(MAPA, { mundo: 'otro', tema: 'nuevo', motor: 'otro' }), MAPA.defecto);
  assert.equal(pistaPara(null, {}), null);
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
const cueva = { mundo: 'cueva', tema: 'minecraft', motor: 'minecraft' };
const aula = { mundo: 'aula', tema: 'logica', motor: 'estudio' };

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
  assert.deepEqual(e.pedidos.map(p => p.split('/').pop().replace(/\.[0-9a-f]{8}\./, '.')), ['musica.json', 'cave-quiz-crawl.webm'], 'solo el manifiesto y la pista necesaria');
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
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
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
  await m.alTap({ ...cueva, mundo: 'noche' });
  assert.equal(e.fuentes.length, 1, 'cueva y noche comparten pista: no se reinicia');
  await m.alTap(aula); await esperar();
  assert.equal(m.pistaActual, 'puzzle-tick-loop');
  assert.ok(e.log.includes('stop:cave-quiz-crawl'), 'la anterior se suelta (con fundido)');
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
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
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
  assert.equal(m.pistaActual, 'puzzle-tick-loop', 'al volver a una pregunta la canción se va');
  assert.equal(await m.alResultado({}), 'prize-parade-loop');
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
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
  assert.ok(e.log.some(l => /^decode:cave-quiz-crawl\.[0-9a-f]{8}\.m4a$/.test(l)), e.log.join(' '));
});

test('música: anticipar baja la pista siguiente sin decodificarla ni sonar', async () => {
  const e = entorno(), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar();
  await m.anticipar(aula); await esperar();
  assert.ok(e.pedidos.some(p => p.includes('puzzle-tick-loop')));
  assert.ok(!e.log.some(l => l.startsWith('decode:puzzle')), 'sin decodificar');
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
});

test('música: al pasar a la pregunta, la canción se va ya aunque la pista siguiente tarde en decodificar, y no vuelve la de premios', async () => {
  const e = entorno({ lento: 300 }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await new Promise(r => setTimeout(r, 350));
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
  await m.alResultado({ perfecto: true });
  assert.equal(m.pistaActual, 'tap-tap-aprende');
  const cancion = e.fuentes.at(-1);
  const pendiente = m.alTap(aula);                                      // la pista de lógica tarda 300 ms en decodificar
  await esperar();
  assert.equal(m.pistaActual, null, 'la canción no sigue encima de la pregunta mientras se decodifica');
  assert.ok(e.log.includes('stop:tap-tap-aprende'));
  cancion.onended?.();                                                  // el fin de la canción ya no pone nada
  await pendiente; await esperar();
  assert.equal(m.pistaActual, 'puzzle-tick-loop');
  await new Promise(r => setTimeout(r, 350));
  assert.equal(m.pistaActual, 'puzzle-tick-loop', 'prize-parade no pisa la pista del mundo');
  assert.ok(!e.fuentes.some(x => x.buffer.id === 'prize-parade-loop' && x.sonando), 'la de premios no arrancó');
});

test('música: si WebM no decodifica, se recuerda y las siguientes pistas (y anticipar) piden directamente el M4A', async () => {
  const e = entorno({ fallaWebm: true }), m = nuevo(e), ac = new e.AC();
  m.conectar(ac); m.encender(true); m.silenciar(false);
  await m.alTap(cueva); await esperar(); await esperar(); await esperar();
  assert.equal(m.pistaActual, 'cave-quiz-crawl');
  e.pedidos.length = 0;
  await m.anticipar(aula); await esperar();
  await m.alTap(aula); await esperar(); await esperar();
  assert.equal(m.pistaActual, 'puzzle-tick-loop');
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
