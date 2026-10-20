#!/usr/bin/env node
// Procesa la música de Taps (Eleven Music) para la web: bucle limpio, volumen igualado y archivos ligeros con hash.
//
//   node projects/main/scripts/procesar-musica-taps.mjs --origen ../producto/taps/musica
//   node projects/main/scripts/procesar-musica-taps.mjs --verificar      (solo comprueba lo publicado; sin ffmpeg)
//
// Origen (fuera del repo, carpeta producto/taps/musica): 10 instrumentales de 1:00 y 3 canciones con letra en con-letra/.
// Destino: projects/main/public/taps-musica/ con musica.json (manifiesto que lee taps-engine/audio/musica.js) y LICENCIA.md.
//
// Qué hace con cada pista (necesita ffmpeg con libopus en el PATH):
//   · Instrumentales (fondo): a mono; se corta el final si la pista se desvanece (cola de Eleven Music) y se cierra el
//     bucle con un fundido cruzado de 2 s entre la cola y el arranque: la pista resultante se repite sin corte ni clic.
//     Loudness a −20 LUFS integrados (pico real ≤ −2 dBTP): queda de fondo bajo la voz y los efectos.
//   · Con letra (celebración): solo un fragmento de 12 s del coro, que se toma del tramo más fuerte de la canción (o del
//     que fije `coro` abajo tras escucharla), con fundido de entrada de 0,3 s y de salida de 1,5 s; a −16 LUFS.
//   · Formatos: Opus en WebM a 48 kb/s (Chrome, Edge, Firefox, Android y Safari reciente) y AAC-LC en M4A a 64 kb/s como
//     respaldo (Safari en iOS/macOS antiguos, donde decodeAudioData no abre WebM/Opus). El reproductor prueba en ese orden.
//     Mono: en el altavoz de un teléfono no se nota y la pista decodificada ocupa la mitad de memoria.
//   · Nombre con hash del contenido (pixel-quest-loop.1a2b3c4d.webm): un archivo nuevo es otra URL, así que el audio se puede
//     guardar en caché para siempre; musica.json se revalida siempre (nginx: no-cache + ETag).
//   · Reproducible: la misma entrada da los mismos archivos (ffmpeg con -bitexact y parámetros fijos).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const DESTINO = resolve(AQUI, '../public/taps-musica');
export const LICENCIA = 'Eleven Music, plan Creator, 2026-10-19';
/** Fundido cruzado del bucle (s). */
const CRUCE = 2;
/** Fragmento de las canciones con letra (s) y sus fundidos. */
const CORO = 12, CORO_ENTRA = 0.3, CORO_SALE = 1.5;
/** Loudness integrada (LUFS): instrumentales de fondo y canciones con letra. */
export const OBJETIVO = { fondo: -20, celebracion: -16 };
const PICO_REAL = -2;
export const FORMATOS = [
  { ext: 'webm', tipo: 'audio/webm; codecs=opus', args: ['-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-application', 'audio', '-ar', '48000'] },
  { ext: 'm4a', tipo: 'audio/mp4; codecs=mp4a.40.2', args: ['-c:a', 'aac', '-b:a', '64k', '-ar', '44100', '-movflags', '+faststart'] },
];

/**
 * Las pistas. `temas`/`mundos` documentan para qué se pensó cada una (el mapa que usa el feed está en MAPA). `bpm`: el de la
 * descripción con que se generó (LEEME.md); en las canciones, estimado por el script. `coro`: [inicio, fin] en segundos si
 * alguien la escuchó y quiere fijar el fragmento; sin él se toma el tramo de 12 s más fuerte.
 */
export const PISTAS = [
  { id: 'pixel-quest-loop', tipo: 'fondo', bpm: 120, nombre: 'Aventura pixelada', temas: ['minecraft'], mundos: ['pradera', 'bosque', 'nieve', 'desierto'] },
  { id: 'cave-quiz-crawl', tipo: 'fondo', bpm: 95, nombre: 'Cueva y mina', temas: ['minecraft'], mundos: ['cueva', 'noche'] },
  { id: 'magma-quest-loop', tipo: 'fondo', bpm: 128, nombre: 'Nether', temas: ['minecraft'], mundos: ['nether', 'end'] },
  { id: 'village-morning-loop', tipo: 'fondo', bpm: 95, nombre: 'Mañana en la aldea', temas: ['minecraft'], mundos: ['aldea', 'casa'] },
  { id: 'island-quiz-loop', tipo: 'fondo', bpm: 100, nombre: 'Playa', temas: ['minecraft'], mundos: ['playa'] },
  { id: 'cozy-study-loop', tipo: 'fondo', bpm: 85, nombre: 'Estudio tranquilo', temas: ['estudio'], mundos: ['biblioteca'] },
  { id: 'puzzle-tick-loop', tipo: 'fondo', bpm: 105, nombre: 'Lógica', temas: ['logica'], mundos: [] },
  { id: 'wonder-loop', tipo: 'fondo', bpm: 110, nombre: 'Asombro', temas: ['cultura'], mundos: [] },
  { id: 'orbit-quiz-drift', tipo: 'fondo', bpm: 90, nombre: 'Espacio', temas: ['cultura'], mundos: ['espacio', 'observatorio'] },
  { id: 'prize-parade-loop', tipo: 'celebracion', bpm: 118, nombre: 'Desfile de premios', temas: [], mundos: [] },
  { id: 'tap-tap-aprende', tipo: 'celebracion', letra: true, origen: 'con-letra/tap-tap-aprende.mp3', nombre: 'Tap, tap, aprende', momento: 'perfecto', temas: [], mundos: [] },
  { id: 'piensa-bien', tipo: 'celebracion', letra: true, origen: 'con-letra/piensa-bien.mp3', nombre: 'Piensa bien', momento: 'perfecto', temas: [], mundos: [] },
  { id: 'racha-en-racha', tipo: 'celebracion', letra: true, origen: 'con-letra/racha-en-racha.mp3', nombre: 'Racha en racha', momento: 'racha', temas: [], mundos: [] },
];

/**
 * Qué pista suena en cada Tap: primero por su mundo (scene.world), luego por su categoría (topic) y luego por su motor
 * (theme); salvo en las categorías de `temaPrimero` (Lógica), donde la de la categoría va antes que la del mundo.
 * Un mundo o tema nuevo sin entrada cae en `defecto`. El resultado normal usa `resultado`; 5/5 y racha nueva,
 * un fragmento de una canción de `celebraciones`.
 */
export const MAPA = {
  mundos: {
    cueva: 'cave-quiz-crawl', noche: 'cave-quiz-crawl', nether: 'magma-quest-loop', end: 'magma-quest-loop',
    aldea: 'village-morning-loop', casa: 'village-morning-loop', playa: 'island-quiz-loop',
    espacio: 'orbit-quiz-drift', observatorio: 'orbit-quiz-drift', biblioteca: 'cozy-study-loop',
  },
  temas: { minecraft: 'pixel-quest-loop', logica: 'puzzle-tick-loop', cultura: 'wonder-loop' },
  /** Categorías cuya pista manda sobre la del mundo: Lógica suena a lógica también en espacio, observatorio o biblioteca. */
  temaPrimero: ['logica'],
  motores: { minecraft: 'pixel-quest-loop', estudio: 'cozy-study-loop' },
  defecto: 'cozy-study-loop',
  resultado: 'prize-parade-loop',
  celebraciones: { perfecto: ['tap-tap-aprende', 'piensa-bien'], racha: ['racha-en-racha'] },
};

// ───────────── ffmpeg ─────────────
function ff(args, { salida = false } = {}) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`No se pudo ejecutar ffmpeg (${r.error.message}). Instálalo y déjalo en el PATH.`);
  if (r.status !== 0) throw new Error(`ffmpeg falló:\n${r.stderr.slice(-2000)}`);
  return salida ? r : r.stderr;
}

/** Loudness momentánea (LUFS) cada 100 ms, en mono. */
function curva(archivo) {
  const r = ff(['-nostats', '-i', archivo, '-af', 'aformat=channel_layouts=mono,ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=-', '-f', 'null', '-'], { salida: true });
  const puntos = []; let t = null;
  for (const linea of r.stdout.split('\n')) {
    const a = linea.match(/pts_time:([\d.]+)/); if (a) t = Number(a[1]);
    const b = linea.match(/r128\.M=(-?[\d.]+|-inf)/); if (b && t !== null) puntos.push({ t, m: b[1] === '-inf' ? -120 : Number(b[1]) });
  }
  const cada = []; let siguiente = 0;
  for (const p of puntos) if (p.t >= siguiente - 1e-6) { cada.push(p); siguiente = Math.round((p.t + 0.1) * 10) / 10; }
  return cada;
}

function integrada(archivo) {
  const txt = ff(['-nostats', '-i', archivo, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const i = txt.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  const tp = txt.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  return { lufs: Number(i), pico: Number(tp) };
}

function duracion(archivo) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

/** Fin útil de una instrumental: antes del desvanecimiento final (último momento a ≤ 8 LU de su loudness integrada). */
export function finUtil(puntos, lufs, total) {
  const vivos = puntos.filter(p => p.t > 1 && p.m >= lufs - 8);
  const ultimo = vivos.length ? vivos[vivos.length - 1].t : total;
  return Math.min(total, Math.round(ultimo * 10) / 10);
}

/** Inicio del tramo de `largo` s más fuerte (media de la loudness momentánea), evitando el arranque y el desvanecimiento. */
export function tramoMasFuerte(puntos, largo, total) {
  let mejor = { inicio: 0, media: -Infinity };
  for (let inicio = 4; inicio + largo <= total - 1; inicio += 0.5) {
    const dentro = puntos.filter(p => p.t >= inicio + 0.4 && p.t <= inicio + largo);
    if (!dentro.length) continue;
    const media = dentro.reduce((s, p) => s + Math.max(p.m, -60), 0) / dentro.length;
    if (media > mejor.media + 0.05) mejor = { inicio, media };
  }
  return mejor.inicio;
}

/** Tempo aproximado por autocorrelación de la envolvente de ataques (75-165 BPM). Solo informativo. */
function estimarBpm(archivo) {
  const sr = 11025;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-i', archivo, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4));
  const hop = 110, env = [];
  for (let i = 0; i + hop < x.length; i += hop) { let s = 0; for (let k = 0; k < hop; k++) s += x[i + k] * x[i + k]; env.push(Math.sqrt(s / hop)); }
  const on = env.map((v, i) => Math.max(0, v - (env[i - 1] ?? v)));
  const fps = sr / hop; let mejor = { bpm: 0, v: -1 };
  for (let bpm = 75; bpm <= 165; bpm += 0.5) {
    const lag = (60 / bpm) * fps, l0 = Math.floor(lag), f = lag - l0; let s = 0;
    for (let i = 0; i + l0 + 1 < on.length; i++) s += on[i] * (on[i + l0] * (1 - f) + on[i + l0 + 1] * f);
    if (s > mejor.v) mejor = { bpm, v: s };
  }
  return Math.round(mejor.bpm);
}

/** Normaliza (loudnorm en dos pasadas, lineal) y codifica en cada formato. Devuelve los archivos publicados. */
function normalizarYCodificar(wav, id, objetivo, tmp) {
  const medida = ff(['-nostats', '-i', wav, '-af', `loudnorm=I=${objetivo}:TP=${PICO_REAL}:LRA=11:print_format=json`, '-f', 'null', '-']);
  const json = JSON.parse(medida.slice(medida.lastIndexOf('{'), medida.lastIndexOf('}') + 1));
  const filtro = `loudnorm=I=${objetivo}:TP=${PICO_REAL}:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
  const listo = join(tmp, `${id}.norm.wav`);
  ff(['-i', wav, '-af', `${filtro},aresample=48000`, '-c:a', 'pcm_f32le', listo]);
  const archivos = [];
  for (const f of FORMATOS) {
    const tmpSalida = join(tmp, `${id}.${f.ext}`);
    ff(['-i', listo, '-ac', '1', ...f.args, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', tmpSalida]);
    const datos = readFileSync(tmpSalida);
    const hash = createHash('sha256').update(datos).digest('hex').slice(0, 8);
    const nombre = `${id}.${hash}.${f.ext}`;
    copyFileSync(tmpSalida, join(DESTINO, nombre));
    archivos.push({ src: nombre, tipo: f.tipo, bytes: datos.length });
  }
  return { archivos, medida: integrada(listo), duracion: Math.round(duracion(listo) * 1000) / 1000 };
}

function procesar(origen) {
  if (!existsSync(origen)) throw new Error(`No existe la carpeta de origen: ${origen}`);
  const tmp = mkdtempSync(join(tmpdir(), 'taps-musica-'));
  mkdirSync(DESTINO, { recursive: true });
  for (const f of readdirSync(DESTINO)) if (/\.(webm|m4a|mp3|ogg)$/.test(f)) rmSync(join(DESTINO, f));
  const pistas = [];
  try {
    for (const p of PISTAS) {
      const fuente = join(origen, p.origen ?? `${p.id}.mp3`);
      if (!existsSync(fuente)) throw new Error(`Falta ${fuente}`);
      if (/v1-infantil/.test(fuente)) throw new Error('La versión infantil de «Piensa bien» no se publica.');
      const total = duracion(fuente), puntos = curva(fuente), { lufs } = integrada(fuente);
      const wav = join(tmp, `${p.id}.wav`);
      const extra = {};
      if (p.letra) {
        const inicio = p.coro?.[0] ?? tramoMasFuerte(puntos, CORO, total);
        const largo = p.coro ? p.coro[1] - p.coro[0] : CORO;
        ff(['-ss', String(inicio), '-t', String(largo), '-i', fuente, '-af',
          `aformat=channel_layouts=mono,afade=t=in:d=${CORO_ENTRA}:curve=qsin,afade=t=out:st=${largo - CORO_SALE}:d=${CORO_SALE}:curve=qsin`, '-c:a', 'pcm_f32le', wav]);
        extra.fragmento = { inicio, fin: inicio + largo };
        extra.bpm = estimarBpm(fuente);
      } else {
        // Bucle: cuerpo [CRUCE, fin] y su cola mezclada con el arranque [0, CRUCE]. Al repetir, el final (que ya suena como el
        // arranque) enlaza con el segundo CRUCE del original: continuidad exacta, sin silencio ni clic.
        const fin = finUtil(puntos, lufs, total);
        ff(['-i', fuente, '-filter_complex',
          `[0:a]aformat=channel_layouts=mono,atrim=end=${fin},asetpts=PTS-STARTPTS,asplit=2[a][b];` +
          `[a]atrim=start=${CRUCE},asetpts=PTS-STARTPTS[cuerpo];[b]atrim=end=${CRUCE},asetpts=PTS-STARTPTS[arranque];` +
          `[cuerpo][arranque]acrossfade=d=${CRUCE}:c1=qsin:c2=qsin[bucle]`, '-map', '[bucle]', '-c:a', 'pcm_f32le', wav]);
        extra.bucle = { fin, cruce: CRUCE };
        extra.bpm = p.bpm;
      }
      const objetivo = OBJETIVO[p.letra ? 'celebracion' : 'fondo'];
      const hecho = normalizarYCodificar(wav, p.id, objetivo, tmp);
      pistas.push({
        id: p.id, nombre: p.nombre, tipo: p.tipo, ...(p.momento ? { momento: p.momento } : {}), bpm: extra.bpm,
        letra: !!p.letra, temas: p.temas, mundos: p.mundos, duracion: hecho.duracion, bucle: !p.letra,
        lufs: Math.round(hecho.medida.lufs * 10) / 10, ...(extra.fragmento ? { fragmento: extra.fragmento } : {}),
        archivos: hecho.archivos,
      });
      const pesos = hecho.archivos.map(a => `${a.src.split('.').pop()} ${(a.bytes / 1024).toFixed(0)} kB`).join(', ');
      console.log(`${p.id.padEnd(22)} ${String(hecho.duracion).padStart(6)} s  ${hecho.medida.lufs.toFixed(1)} LUFS  ${pesos}` +
        (extra.fragmento ? `  coro ${extra.fragmento.inicio}-${extra.fragmento.fin} s, ~${extra.bpm} BPM` : `  bucle hasta ${extra.bucle.fin} s`));
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const manifiesto = { version: 1, licencia: LICENCIA, formatos: FORMATOS.map(f => f.tipo), mapa: MAPA, pistas };
  writeFileSync(join(DESTINO, 'musica.json'), JSON.stringify(manifiesto, null, 1) + '\n');
  const total = pistas.flatMap(p => p.archivos).reduce((s, a) => s + a.bytes, 0);
  console.log(`\nmusica.json con ${pistas.length} pistas; ${(total / 1024 / 1024).toFixed(2)} MB en ${DESTINO}`);
}

/** Comprueba que el manifiesto y los archivos publicados coinciden (lo usan las pruebas; no necesita ffmpeg). */
export function verificar(dir = DESTINO) {
  const errores = [];
  const m = JSON.parse(readFileSync(join(dir, 'musica.json'), 'utf8'));
  if (m.licencia !== LICENCIA) errores.push('licencia distinta');
  const ids = new Set(m.pistas.map(p => p.id));
  for (const p of PISTAS) if (!ids.has(p.id)) errores.push(`falta la pista ${p.id}`);
  for (const p of m.pistas) {
    if (/infantil/.test(p.id)) errores.push(`${p.id}: la versión infantil no se publica`);
    if (p.archivos.length !== FORMATOS.length) errores.push(`${p.id}: se esperaban ${FORMATOS.length} formatos`);
    for (const a of p.archivos) {
      const ruta = join(dir, a.src);
      if (!existsSync(ruta)) { errores.push(`${a.src} no existe`); continue; }
      const datos = readFileSync(ruta);
      if (datos.length !== a.bytes || statSync(ruta).size !== a.bytes) errores.push(`${a.src}: tamaño distinto`);
      const hash = createHash('sha256').update(datos).digest('hex').slice(0, 8);
      if (!a.src.includes(`.${hash}.`)) errores.push(`${a.src}: el hash del nombre no coincide (${hash})`);
    }
  }
  const usadas = [...Object.values(m.mapa.mundos), ...Object.values(m.mapa.temas), ...Object.values(m.mapa.motores), m.mapa.defecto, m.mapa.resultado,
    ...Object.values(m.mapa.celebraciones).flat()];
  for (const id of usadas) if (!ids.has(id)) errores.push(`el mapa usa ${id}, que no está en las pistas`);
  const sobrantes = readdirSync(dir).filter(f => /\.(webm|m4a|mp3|ogg)$/.test(f) && !m.pistas.some(p => p.archivos.some(a => a.src === f)));
  for (const f of sobrantes) errores.push(`${f} sobra (no está en musica.json)`);
  return errores;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--verificar')) {
    const errores = verificar();
    if (errores.length) { console.error(errores.join('\n')); process.exit(1); }
    console.log('Música de Taps: manifiesto y archivos coinciden.');
  } else {
    const i = args.indexOf('--origen');
    const origen = resolve(i >= 0 ? args[i + 1] : process.env.TAPS_MUSICA_ORIGEN ?? resolve(AQUI, '../../../../producto/taps/musica'));
    procesar(origen);
  }
}
