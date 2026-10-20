// Pruebas de efectos de sonido y voz de Taps (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
// Los efectos y el procesado de voz son puros (Float32Array): se prueban sin Web Audio. El reproductor y la voz se prueban
// con un AudioContext y un speechSynthesis falsos que solo registran llamadas.
import test from 'node:test';
import assert from 'node:assert/strict';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const { renderizarEfecto, EFECTOS, PALETAS, DURACION_MAXIMA, PICO, paletaDeTema, claveEfecto } = await import(new URL('audio/efectos.js', ENGINE).href);
const { crearSonido, DESDE_MOTOR } = await import(new URL('audio/sonido.js', ENGINE).href);
const { PERFILES, perfilDe, parametrosWebSpeech, elegirVoz, claveAudio, normalizarTexto } = await import(new URL('voz/perfiles.js', ENGINE).href);
const { aplicarPerfil, tonoYVelocidad, estirarTiempo } = await import(new URL('voz/efectos-voz.js', ENGINE).href);
const { crearVoz } = await import(new URL('voz/voz.js', ENGINE).href);

const SR = 48000;
const pico = x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
/** Frecuencia dominante aproximada por cruces por cero (suficiente para comparar «más agudo / más grave»). */
const cruces = x => { let n = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) n++; return n; };
const seno = (f, seg, sr = 22050) => Float32Array.from({ length: Math.round(seg * sr) }, (_, i) => 0.6 * Math.sin((2 * Math.PI * f * i) / sr));

test('efectos: todos existen en las dos paletas, duran ≤ 400 ms, tienen pico ≤ −6 dBFS y no son silencio', () => {
  for (const paleta of PALETAS) for (const nombre of EFECTOS) {
    const x = renderizarEfecto(nombre, { paleta, sampleRate: SR });
    assert.ok(x.length > 0, `${paleta}/${nombre} no está vacío`);
    assert.ok(x.length <= Math.ceil(DURACION_MAXIMA * SR), `${paleta}/${nombre} dura ${(x.length / SR).toFixed(3)} s`);
    assert.ok(pico(x) <= PICO + 1e-6 && pico(x) > 0.2, `${paleta}/${nombre} pico ${pico(x)}`);
    assert.ok(x.every(Number.isFinite), `${paleta}/${nombre} sin NaN`);
    assert.ok(Math.abs(x[x.length - 1]) < 0.01, `${paleta}/${nombre} termina sin clic`);
  }
});

test('efectos: deterministas, distintos entre paletas y desconocidos sin lanzar', () => {
  assert.deepEqual(renderizarEfecto('deslizar', { paleta: 'suave' }), renderizarEfecto('deslizar', { paleta: 'suave' }));
  assert.notDeepEqual(renderizarEfecto('acierto', { paleta: 'bloque' }), renderizarEfecto('acierto', { paleta: 'suave' }));
  assert.equal(renderizarEfecto('no-existe').length, 0);
  assert.equal(paletaDeTema('minecraft'), 'bloque');
  assert.equal(paletaDeTema('estudio'), 'suave');
  assert.equal(paletaDeTema('otro'), 'suave');
});

test('efectos: la paleta bloque suena cuantizada (pocos niveles) y la suave no', () => {
  const niveles = x => new Set(Array.from(x, v => v.toFixed(4))).size;
  assert.ok(niveles(renderizarEfecto('acierto', { paleta: 'bloque' })) < 80);
  assert.ok(niveles(renderizarEfecto('acierto', { paleta: 'suave' })) > 500);
});

test('efectos: la racha sube con el nivel y el resultado depende del puntaje', () => {
  const r3 = renderizarEfecto('racha', { paleta: 'bloque', nivel: 3 }), r6 = renderizarEfecto('racha', { paleta: 'bloque', nivel: 6 });
  assert.ok(cruces(r6) > cruces(r3), 'racha 6 más aguda que racha 3');
  const alto = renderizarEfecto('resultado', { paleta: 'suave', puntaje: 1 }), bajo = renderizarEfecto('resultado', { paleta: 'suave', puntaje: 0.2 });
  assert.notDeepEqual(alto, bajo);
  assert.equal(claveEfecto('resultado', { paleta: 'suave', puntaje: 0.9 }), 'suave:resultado:alto');
  assert.equal(claveEfecto('resultado', { paleta: 'suave', puntaje: 0.6 }), 'suave:resultado:medio');
  assert.equal(claveEfecto('resultado', { paleta: 'suave', puntaje: 0 }), 'suave:resultado:bajo');
  assert.equal(claveEfecto('racha', { paleta: 'bloque', nivel: 40 }), 'bloque:racha:7');
});

// ───────────── reproductor (AudioContext falso) ─────────────
function audioFalso() {
  const log = [];
  const param = () => ({ value: 1, setTargetAtTime(v) { this.value = v; }, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const nodo = extra => ({ connect() {}, ...extra });
  class AC {
    constructor() { this.state = 'running'; this.sampleRate = 44100; this.currentTime = 0; this.destination = {}; log.push('nuevo'); }
    createGain() { return nodo({ gain: param() }); }
    createDynamicsCompressor() { return nodo({ threshold: param(), ratio: param() }); }
    createBuffer(c, n, sr) { const d = new Float32Array(n); return { length: n, sampleRate: sr, getChannelData: () => d }; }
    createBufferSource() { const s = nodo({ playbackRate: param(), start() { log.push('start'); }, stop() {} }); return s; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; log.push('suspend'); return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  return { AC, log };
}

test('sonido: nada suena antes de desbloquear ni silenciado; desbloqueado y con sonido, sí', () => {
  const { AC, log } = audioFalso(); globalThis.AudioContext = AC;
  const s = crearSonido();
  assert.equal(s.tocar('acierto', { tema: 'minecraft' }), false, 'sin gesto no hay contexto');
  assert.equal(log.includes('nuevo'), false, 'no crea el AudioContext por su cuenta');
  assert.equal(s.desbloquear(), true);
  assert.equal(s.tocar('acierto', { tema: 'minecraft' }), false, 'arranca silenciado');
  s.silenciar(false);
  assert.equal(s.tocar('acierto', { tema: 'minecraft' }), true);
  assert.equal(s.tocar('no-existe'), false);
  s.pausar();
  assert.equal(s.tocar('fallo'), false, 'en pausa no se acumulan sonidos');
  s.reanudar();
  assert.equal(s.tocar('fallo'), true);
  s.destruir();
  delete globalThis.AudioContext;
});

test('sonido: con el contexto dormido no se acumulan sonidos (sin ráfaga al despertar); «interrupted» de iOS se reanuda', () => {
  const { AC } = audioFalso();
  const dormido = new AC(); dormido.state = 'suspended'; dormido.resume = () => new Promise(() => {});   // el resume nunca llega
  const s = crearSonido(); s.desbloquear(dormido, { gesto: false }); s.silenciar(false);
  assert.equal(s.tocar('acierto'), false, 'fuera de un gesto y dormido: no se programa nada');
  const t = crearSonido(); t.desbloquear(dormido); t.silenciar(false);
  assert.equal(t.tocar('acierto'), true, 'justo tras desbloquear en un gesto válido: se permite');
  const ios = new AC(); ios.state = 'interrupted'; let reanudado = false; ios.resume = () => { reanudado = true; return Promise.resolve(); };
  const u = crearSonido(); u.desbloquear(ios, { gesto: false }); u.silenciar(false);
  assert.ok(reanudado, 'interrupted se trata como suspended');
  assert.equal(u.tocar('fallo'), false);
});

test('sonido: el motor solo traduce pop y blip; el «aparece» justo después de deslizar se omite', () => {
  const { AC } = audioFalso(); globalThis.AudioContext = AC;
  const s = crearSonido(); s.desbloquear(); s.silenciar(false);
  const tocados = []; const tocar = s.tocar; s.tocar = (n, o) => { tocados.push(n); return tocar(n, o); };
  const motor = s.paraMotor();
  for (const n of ['jingle', 'damage', 'hit', 'result', 'pop', 'blip']) motor.play(n, { theme: 'estudio' });
  assert.deepEqual(tocados, ['aparece', 'blip']);
  assert.deepEqual(Object.keys(DESDE_MOTOR), ['pop', 'blip']);
  assert.equal(tocar('deslizar', {}), true);
  assert.equal(tocar('aparece', {}), false);
  s.destruir(); delete globalThis.AudioContext;
});

// ───────────── voz ─────────────
test('perfiles: cada personaje de los temas tiene voz propia y distinta', () => {
  for (const id of ['leo', 'sofi', 'mateo', 'dani', 'chispa', 'nube', 'zorro', 'panda', 'pinguino', 'robot', 'pirata', 'ninja', 'hana', 'cientifica', 'exploradora']) assert.equal(perfilDe(id).id, id);
  assert.equal(perfilDe('Chispa').id, 'chispa');
  assert.equal(perfilDe('desconocido').id, 'narrador');
  const firmas = new Set(Object.values(PERFILES).map(p => JSON.stringify([p.semitonos, p.velocidad, p.efectos])));
  assert.equal(firmas.size, Object.keys(PERFILES).length, 'no hay dos perfiles iguales');
  const chispa = parametrosWebSpeech('chispa'), nube = parametrosWebSpeech('nube');
  assert.ok(chispa.pitch > nube.pitch && chispa.rate > nube.rate);
  for (const p of Object.values(PERFILES)) { const w = parametrosWebSpeech(p); assert.ok(w.pitch > 0 && w.pitch <= 2 && w.rate >= 0.6 && w.rate <= 1.6); }
});

test('elegirVoz: prefiere Colombia y Latinoamérica, respeta el género y NUNCA usa voces en línea por defecto', () => {
  const voces = [
    { name: 'Google español', lang: 'es-ES', localService: false },
    { name: 'Microsoft Helena', lang: 'es-ES', localService: true },
    { name: 'Microsoft Sabina', lang: 'es-MX', localService: true },
    { name: 'Microsoft Raul', lang: 'es-MX', localService: true },
    { name: 'Salome', lang: 'es-CO', localService: true },
    { name: 'Samantha', lang: 'en-US', localService: true },
  ];
  assert.equal(elegirVoz(voces, 'sofi').name, 'Salome');
  assert.equal(elegirVoz(voces.filter(v => v.lang !== 'es-CO'), 'leo').name, 'Microsoft Raul');
  assert.equal(elegirVoz(voces.filter(v => v.lang !== 'es-CO'), 'nube').name, 'Microsoft Sabina');
  assert.equal(elegirVoz([voces[0], voces[5]], 'leo'), null, 'solo voz en línea o en inglés: sin voz');
  assert.equal(elegirVoz([voces[0]], 'leo', { permitirEnLinea: true }).name, 'Google español');
});

test('claveAudio: estable, depende del perfil y del texto normalizado', () => {
  assert.equal(claveAudio('leo', '¿Qué  bloque?'), claveAudio('leo', ' ¿Qué bloque? '));
  assert.notEqual(claveAudio('leo', '¿Qué bloque?'), claveAudio('sofi', '¿Qué bloque?'));
  assert.match(claveAudio('nube', 'Hola'), /^[0-9a-f]{8}$/);
  assert.equal(normalizarTexto('«Hola»  mundo'), 'Hola mundo');
});

test('efectos de voz: tono y velocidad por separado', () => {
  const x = seno(220, 1);
  const agudo = tonoYVelocidad(x, 22050, 12, 1);
  assert.ok(Math.abs(agudo.length / x.length - 1) < 0.08, 'mismo largo al subir una octava');
  assert.ok(Math.abs(cruces(agudo) / cruces(x) - 2) < 0.25, 'una octava arriba ≈ el doble de cruces');
  const rapido = tonoYVelocidad(x, 22050, 0, 1.25);
  assert.ok(Math.abs(rapido.length / x.length - 0.8) < 0.08, '25 % más rápido');
  assert.ok(Math.abs(cruces(rapido) / rapido.length - cruces(x) / x.length) < 0.004, 'misma frecuencia');
  assert.ok(Math.abs(estirarTiempo(x, 22050, 1.5).length / x.length - 1.5) < 0.05);
});

test('efectos de voz: cada perfil cambia el audio, sin NaN y normalizado', () => {
  const x = seno(180, 0.6);
  const salidas = Object.keys(PERFILES).map(id => aplicarPerfil(x, 22050, id));
  for (const y of salidas) { assert.ok(y.every(Number.isFinite)); assert.ok(pico(y) <= 0.9 && rms(y) > 0.05); }
  assert.ok(aplicarPerfil(x, 22050, 'nube').length > x.length, 'el eco de Nube deja cola');
});

function speechFalso(voces) {
  const dichos = [];
  return {
    dichos, speaking: false, pending: false,
    getVoices: () => voces, addEventListener() {}, removeEventListener() {},
    speak(u) { dichos.push(u); queueMicrotask(() => u.onend?.()); },
    cancel() { dichos.push('cancel'); },
  };
}

test('voz: habla con Web Speech usando la voz local y el tono del personaje; sin voz local no está disponible', async () => {
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  const speech = speechFalso([{ name: 'Microsoft Sabina', lang: 'es-MX', localService: true }]);
  const voz = crearVoz({ speech, manifiesto: null });
  assert.equal(await voz.preparar(), true);
  await voz.hablar('  ¿Cuál es el bloque más duro?  ', 'chispa');
  const u = speech.dichos.find(d => typeof d === 'object');
  assert.equal(u.text, '¿Cuál es el bloque más duro?');
  assert.equal(u.voice.name, 'Microsoft Sabina');
  assert.equal(u.pitch, parametrosWebSpeech('chispa').pitch);
  assert.equal(voz.ultimoMotor, 'navegador');
  const sinVoz = crearVoz({ speech: speechFalso([{ name: 'Google español', lang: 'es-ES', localService: false }]), manifiesto: null });
  assert.equal(await sinVoz.preparar(), false);
  delete globalThis.SpeechSynthesisUtterance;
});

test('voz: un motor local registrado se usa antes que Web Speech y recibe el perfil aplicado', async () => {
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  const speech = speechFalso([{ name: 'Microsoft Sabina', lang: 'es-MX', localService: true }]);
  const reproducido = [];
  const sonido = { contexto: {}, silenciado: false, atenuar() {}, reproducirVoz(m, sr) { reproducido.push([m.length, sr]); return { fin: Promise.resolve(), detener() {} }; } };
  const voz = crearVoz({ speech, sonido, manifiesto: null });
  voz.registrarMotor(async () => ({ muestras: seno(200, 0.5), sampleRate: 22050 }));
  await voz.hablar('Hola', 'nube');
  assert.equal(voz.ultimoMotor, 'modelo');
  assert.equal(reproducido.length, 1);
  assert.ok(reproducido[0][0] > 0.5 * 22050, 'Nube habla más lento y con cola de eco');
  assert.equal(speech.dichos.filter(d => typeof d === 'object').length, 0, 'no usó Web Speech');
  const muda = crearVoz({ speech, sonido: { ...sonido, silenciado: true }, manifiesto: null });
  await muda.hablar('Hola', 'leo');
  assert.equal(speech.dichos.filter(d => typeof d === 'object').length, 0, 'con el sonido silenciado no habla');
  delete globalThis.SpeechSynthesisUtterance;
});
