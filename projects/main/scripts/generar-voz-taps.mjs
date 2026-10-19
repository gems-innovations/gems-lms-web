#!/usr/bin/env node
// Audio de Taps fuera del navegador: muestras de demostración y voces pregeneradas en el build.
//
//   node projects/main/scripts/generar-voz-taps.mjs --muestras <carpeta>
//       Efectos (las dos paletas) y la misma frase con cada perfil de voz, en .wav (y .mp3 si hay ffmpeg).
//   node projects/main/scripts/generar-voz-taps.mjs --banco --salida projects/main/public/taps-voz --motor comando \
//        --comando "piper --model es_MX-claude-high.onnx --output_file {wav}"
//       Pregenera la pregunta de cada Tap con la voz de su personaje y escribe manifiesto.json (lo lee taps-engine/voz).
//
// Motores de voz base (la voz «cruda»; el perfil del personaje se aplica después con taps-engine/voz/efectos-voz.js):
//   · sapi     Windows (System.Speech, voz en español instalada). SOLO para muestras internas: las voces del sistema no
//              se redistribuyen en producción.
//   · comando  Cualquier programa que lea el texto por stdin y escriba un .wav en {wav}. Para producción: Piper con una voz
//              es_MX de licencia abierta (ver producto/taps/voz-y-sonido.md).
// Nada se envía a terceros: todo corre en esta máquina.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const { renderizarEfecto, PALETAS } = await import(new URL('audio/efectos.js', ENGINE).href);
const { PERFILES, claveAudio, normalizarTexto } = await import(new URL('voz/perfiles.js', ENGINE).href);
const { aplicarPerfil } = await import(new URL('voz/efectos-voz.js', ENGINE).href);

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FRASE = opt('--frase') ?? '¿Qué bloque resiste mejor una explosión de TNT? Piénsalo bien antes de tocar.';

// ───────────── WAV ─────────────
/** Float32 mono → WAV PCM de 16 bits. */
export function aWav(muestras, sr) {
  const n = muestras.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, muestras[i])) * 32767), 44 + i * 2);
  return buf;
}
/** WAV PCM de 16 bits (mono o estéreo) → { muestras: Float32 mono, sampleRate }. */
export function deWav(buf) {
  let p = 12, fmt = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4), body = p + 8;
    if (id === 'fmt ') fmt = { canales: buf.readUInt16LE(body + 2), sr: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    if (id === 'data') {
      if (!fmt || fmt.bits !== 16) throw new Error('Solo WAV PCM de 16 bits');
      const fin = Math.min(buf.length, body + size), n = Math.floor((fin - body) / (2 * fmt.canales)), x = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < fmt.canales; c++) s += buf.readInt16LE(body + (i * fmt.canales + c) * 2); x[i] = s / fmt.canales / 32768; }
      return { muestras: x, sampleRate: fmt.sr };
    }
    p = body + size + (size & 1);
  }
  throw new Error('WAV sin datos');
}

// ───────────── motores de voz base ─────────────
const tmp = mkdtempSync(join(tmpdir(), 'taps-voz-'));
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));

function vozSapi(texto, perfil) {
  const txt = join(tmp, 'texto.txt'), wav = join(tmp, 'base.wav'), ps1 = join(tmp, 'sapi.ps1');
  writeFileSync(txt, texto, 'utf8');
  // Voz base por género cuando el sistema tiene varias en español; si no, la que haya.
  writeFileSync(ps1, `Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voces = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' }
if (-not $voces) { throw 'No hay voces en español instaladas' }
$g = if ('${perfil.genero}' -eq 'm') { 'Male' } else { 'Female' }
$v = ($voces | Where-Object { $_.VoiceInfo.Gender -eq $g } | Select-Object -First 1); if (-not $v) { $v = $voces | Select-Object -First 1 }
$s.SelectVoice($v.VoiceInfo.Name)
$f = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}', $f)
$s.Speak([System.IO.File]::ReadAllText('${txt.replace(/'/g, "''")}', [System.Text.Encoding]::UTF8))
$s.Dispose()
Write-Output $v.VoiceInfo.Name
`, 'utf8');
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('SAPI falló: ' + (r.stderr || r.stdout));
  return { ...deWav(readFileSync(wav)), voz: r.stdout.trim() };
}

function vozComando(texto, _perfil, plantilla) {
  const wav = join(tmp, 'base.wav'), [cmd, ...resto] = plantilla.match(/"[^"]*"|\S+/g).map(t => t.replace(/^"|"$/g, '').replace('{wav}', wav));
  const r = spawnSync(cmd, resto, { input: texto, encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(wav)) throw new Error(`«${plantilla}» falló: ${r.stderr || r.error?.message}`);
  return { ...deWav(readFileSync(wav)), voz: cmd };
}

const motor = opt('--motor') ?? (process.platform === 'win32' ? 'sapi' : 'comando');
const vozBase = (texto, perfil) => (motor === 'sapi' ? vozSapi(texto, perfil) : vozComando(texto, perfil, opt('--comando') ?? 'piper --output_file {wav}'));

const hayFfmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
/** WAV → MP3 mono (64 kbps para muestras, 32 kbps para el banco). */
function aMp3(wav, mp3, kbps = 64) {
  if (!hayFfmpeg) return false;
  return spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', `${kbps}k`, mp3]).status === 0;
}

// ───────────── modos ─────────────
function muestras(dir) {
  const efectosDir = join(dir, 'efectos'), vozDir = join(dir, 'voz');
  mkdirSync(efectosDir, { recursive: true }); mkdirSync(vozDir, { recursive: true });
  const SR = 44100, lista = [];
  const variantes = [
    ['toque'], ['acierto'], ['fallo'], ['racha', { nivel: 3 }, 'racha-x3'], ['racha', { nivel: 6 }, 'racha-x6'],
    ['resultado', { puntaje: 1 }, 'resultado-alto'], ['resultado', { puntaje: 0.6 }, 'resultado-medio'], ['resultado', { puntaje: 0.2 }, 'resultado-bajo'],
    ['deslizar'], ['tic'], ['aparece'],
  ];
  for (const paleta of PALETAS) for (const [nombre, o = {}, archivo = nombre] of variantes) {
    const wav = join(efectosDir, `${paleta}-${archivo}.wav`);
    writeFileSync(wav, aWav(renderizarEfecto(nombre, { ...o, paleta, sampleRate: SR }), SR));
    lista.push(wav);
  }
  // Secuencia de una partida (para escuchar el conjunto): deslizar, acierto, acierto, racha, fallo, resultado.
  for (const paleta of PALETAS) {
    const partes = [['deslizar'], ['acierto'], ['acierto'], ['racha', { nivel: 3 }], ['fallo'], ['resultado', { puntaje: 0.8 }]];
    const pausa = new Float32Array(Math.round(SR * 0.45)), trozos = partes.flatMap(([n, o]) => [renderizarEfecto(n, { ...o, paleta, sampleRate: SR }), pausa]);
    const total = new Float32Array(trozos.reduce((s, t) => s + t.length, 0)); let k = 0; for (const t of trozos) { total.set(t, k); k += t.length; }
    const wav = join(efectosDir, `${paleta}-partida.wav`); writeFileSync(wav, aWav(total, SR)); lista.push(wav);
  }
  const usadas = new Set();
  for (const perfil of Object.values(PERFILES)) {
    const base = vozBase(FRASE, perfil); usadas.add(base.voz);
    const wav = join(vozDir, `${perfil.id}.wav`);
    writeFileSync(wav, aWav(aplicarPerfil(base.muestras, base.sampleRate, perfil), base.sampleRate));
    lista.push(wav);
  }
  let mp3 = 0;
  for (const wav of lista) if (aMp3(wav, wav.replace(/\.wav$/, '.mp3'))) mp3++;
  writeFileSync(join(dir, 'LEEME.md'), `# Muestras de sonido y voz de Taps

Generadas con \`node projects/main/scripts/generar-voz-taps.mjs --muestras <esta carpeta>\` (repo gems-lms-web).
Todo sale de código propio: nada se descargó de bancos de sonido.

- \`efectos/\`: los efectos de las dos paletas («bloque» = Minecraft, 8 bits; «suave» = Estudio). \`*-partida\` encadena una
  partida corta (deslizar, acierto, acierto, racha x3, fallo, resultado).
- \`voz/\`: la misma frase con cada perfil de personaje: «${FRASE}»
  Voz base: ${[...usadas].join(', ')} (motor \`${motor}\`), con el perfil aplicado por \`taps-engine/voz/efectos-voz.js\`
  (tono, velocidad y efectos: robot, eco, bits). Es una voz del sistema solo para escuchar los perfiles: en producción la
  voz base sería Piper es_MX (ver \`../voz-y-sonido.md\`). En el navegador con Web Speech cambian tono y velocidad, pero
  no los efectos.
`, 'utf8');
  console.log(`Muestras: ${lista.length} .wav${mp3 ? ` y ${mp3} .mp3` : ' (sin ffmpeg: sin .mp3)'} en ${dir}`);
}

/** Taps del banco generado (una línea JSON por Tap en taps.banco.generated.ts). */
function tapsDelBanco() {
  const ts = readFileSync(new URL('../src/app/taps/taps.banco.generated.ts', import.meta.url), 'utf8');
  return ts.split('\n').filter(l => l.trimStart().startsWith('{"id"')).map(l => JSON.parse(l.trim().replace(/,$/, '')));
}

function banco(salida) {
  mkdirSync(salida, { recursive: true });
  const archivos = {}; let bytes = 0;
  for (const tap of tapsDelBanco()) for (const q of tap.questions) {
    const perfil = PERFILES[tap.scene.host] ?? PERFILES.narrador, texto = normalizarTexto(q.q), clave = claveAudio(perfil, texto);
    if (archivos[clave]) continue;
    const base = vozBase(texto, perfil), wav = join(tmp, `${clave}.wav`);
    writeFileSync(wav, aWav(aplicarPerfil(base.muestras, base.sampleRate, perfil), base.sampleRate));
    const destino = hayFfmpeg ? `${clave}.mp3` : `${clave}.wav`;
    if (hayFfmpeg) aMp3(wav, join(salida, destino), 32); else writeFileSync(join(salida, destino), readFileSync(wav));
    bytes += readFileSync(join(salida, destino)).length;
    archivos[clave] = destino;
  }
  writeFileSync(join(salida, 'manifiesto.json'), JSON.stringify({ version: 1, motor, archivos }, null, 1) + '\n');
  console.log(`Banco: ${Object.keys(archivos).length} audios, ${(bytes / 1024).toFixed(0)} KB en ${salida}`);
}

if (args.includes('--muestras')) muestras(resolve(opt('--muestras')));
else if (args.includes('--banco')) banco(resolve(opt('--salida') ?? 'projects/main/public/taps-voz'));
else console.log('Uso: --muestras <carpeta>  |  --banco [--salida <carpeta>] [--motor sapi|comando] [--comando "piper … {wav}"]');
