// Voz de los personajes de Taps (navegador). Coste 0: nada de servicios de pago y nada sale del dispositivo.
//
//   import { crearVoz } from './voz.js';
//   const voz = crearVoz({ sonido });              // `sonido` = reproductor de ../audio/sonido.js (ducking y silencio)
//   await voz.preparar();                          // ¿hay alguna voz utilizable?
//   voz.hablar('¿Qué bloque resiste una explosión?', 'chispa');   // o un perfil: voz.hablar(texto, { semitonos: 3, … })
//
// Motores, en orden (producto/taps/voz-y-sonido.md):
//   1. «archivos»: audios pregenerados en el build (scripts/generar-voz-taps.mjs → /taps-voz/manifiesto.json). Ya traen
//      el perfil aplicado; suenan por Web Audio (respetan silencio, ducking y modo silencio de iOS).
//   2. «modelo»: un motor local registrado con `registrarMotor(fn)` que devuelve audio (p. ej. Piper/Supertonic en WASM).
//      Su descarga es grande: solo se registra bajo demanda y nunca en la carga inicial. El perfil se aplica aquí.
//   3. «navegador»: Web Speech API con una voz LOCAL en español. Instantánea y sin descargas; tono y velocidad por
//      personaje, sin efectos (el navegador no deja procesar su audio).
// Accesibilidad: la voz dice la pregunta (el texto ya está en pantalla y es el subtítulo). No lee lo que la app anuncia
// por aria-live (correcto/incorrecto, explicación), así un lector de pantalla no oye lo mismo dos veces.

// La versión (?v=) va también en los imports internos (la sube TAPS_SONIDO_VERSION en taps-sonido.service.ts).
import { perfilDe, parametrosWebSpeech, elegirVoz, normalizarTexto, claveAudio } from './perfiles.js?v=2';
import { aplicarPerfil } from './efectos-voz.js?v=2';

export const MANIFIESTO_URL = '/taps-voz/manifiesto.json';

/**
 * @param {{sonido?: object, manifiesto?: string|null, speech?: SpeechSynthesis, permitirEnLinea?: boolean}} [opciones]
 */
export function crearVoz(opciones = {}) {
  const speech = opciones.speech ?? globalThis.speechSynthesis ?? null;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  const sonido = opciones.sonido ?? null;
  let voces = [], manifiesto = null, pedidoManifiesto = null, modelo = null, actual = null, turno = 0;

  function leerVoces() { try { voces = speech?.getVoices?.() ?? []; } catch { voces = []; } return voces; }

  /** Las voces llegan tarde en Chrome (evento voiceschanged): espera hasta 1,5 s. */
  function esperarVoces() {
    if (!speech) return Promise.resolve([]);
    if (leerVoces().length) return Promise.resolve(voces);
    return new Promise(ok => {
      const listo = () => { clearTimeout(t); speech.removeEventListener?.('voiceschanged', listo); ok(leerVoces()); };
      const t = setTimeout(listo, 1500);
      speech.addEventListener?.('voiceschanged', listo);
    });
  }

  function cargarManifiesto() {
    if (opciones.manifiesto === null) return Promise.resolve(null);
    return (pedidoManifiesto ??= fetch(opciones.manifiesto ?? MANIFIESTO_URL, { priority: 'low' })
      .then(r => (r.ok ? r.json() : null))
      .then(m => (manifiesto = m && typeof m.archivos === 'object' ? m : null))
      .catch(() => null));
  }

  async function porArchivo(texto, perfil, miTurno) {
    const ruta = manifiesto?.archivos?.[claveAudio(perfil, texto)];
    if (!ruta || !sonido?.contexto) return false;
    const r = await fetch(new URL(ruta, new URL(opciones.manifiesto ?? MANIFIESTO_URL, location.href)).href);
    if (!r.ok || miTurno !== turno) return miTurno !== turno;
    const audio = await sonido.contexto.decodeAudioData(await r.arrayBuffer());
    if (miTurno !== turno) return true;
    actual = sonido.reproducirVoz(audio.getChannelData(0), audio.sampleRate);
    await actual.fin;
    return true;
  }

  async function porModelo(texto, perfil, miTurno) {
    if (!modelo || !sonido?.contexto) return false;
    const { muestras, sampleRate } = await modelo(texto, perfil);
    if (miTurno !== turno) return true;
    actual = sonido.reproducirVoz(aplicarPerfil(muestras, sampleRate, perfil), sampleRate);
    await actual.fin;
    return true;
  }

  function porNavegador(texto, perfil) {
    if (!speech || !Utterance) return Promise.resolve(false);
    const voz = elegirVoz(voces.length ? voces : leerVoces(), perfil, opciones);
    if (!voz) return Promise.resolve(false);
    return new Promise(ok => {
      const u = new Utterance(texto), { pitch, rate } = parametrosWebSpeech(perfil);
      u.voice = voz; u.lang = voz.lang; u.pitch = pitch; u.rate = rate; u.volume = 1;
      const fin = () => { sonido?.atenuar?.(false); ok(true); };
      u.onend = fin; u.onerror = fin;
      sonido?.atenuar?.(true);
      actual = { detener() { try { speech.cancel(); } catch { /* nada que callar */ } } };
      speech.speak(u);
    });
  }

  const V = {
    /** Motor que se usó la última vez ('archivos' | 'modelo' | 'navegador' | null). */
    ultimoMotor: null,
    /** ¿Hay alguna forma de hablar? Carga voces del sistema y el manifiesto de audios (si existe). */
    async preparar() {
      await Promise.all([esperarVoces(), cargarManifiesto()]);
      return V.disponible();
    },
    disponible() { return !!manifiesto || !!modelo || !!elegirVoz(voces.length ? voces : leerVoces(), 'narrador', opciones); },
    /**
     * Registra un motor local que devuelve audio: `async (texto, perfil) => ({ muestras: Float32Array, sampleRate })`.
     * Pensado para cargarse bajo demanda (import dinámico de un modelo descargado por la persona), nunca al inicio.
     */
    registrarMotor(fn) { modelo = typeof fn === 'function' ? fn : null; },
    /**
     * Dice `texto` con la voz de `perfilDeVoz` (id de personaje o perfil). Corta lo que estuviera diciendo.
     * Se cumple al terminar (o al cortarse). Nunca lanza.
     */
    async hablar(texto, perfilDeVoz) {
      V.callar();
      const limpio = normalizarTexto(texto), perfil = perfilDe(perfilDeVoz), miTurno = ++turno;
      if (!limpio || sonido?.silenciado) return;
      // Sin audio pregenerado ni modelo se va directo a Web Speech SIN `await` antes de speak(): iOS exige que el primer
      // speak() ocurra dentro del gesto (p. ej. el toque en «Voz»).
      const motores = [];
      if (manifiesto?.archivos?.[claveAudio(perfil, limpio)]) motores.push(['archivos', porArchivo]);
      if (modelo) motores.push(['modelo', porModelo]);
      for (const [nombre, fn] of motores) {
        try { if (await fn(limpio, perfil, miTurno)) { if (miTurno === turno) V.ultimoMotor = nombre; return; } } catch { /* sigue con el siguiente motor */ }
        if (miTurno !== turno) return;
      }
      if (await porNavegador(limpio, perfil)) V.ultimoMotor = 'navegador';
    },
    callar() {
      turno++;
      const a = actual; actual = null;
      try { a?.detener(); } catch { /* ya terminó */ }
      try { if (speech?.speaking || speech?.pending) speech.cancel(); } catch { /* sin Web Speech */ }
      sonido?.atenuar?.(false);
    },
    /** Objeto para `stage.setVoz()` del motor: `say(texto)` habla con el perfil del personaje en escena. */
    paraMotor() { return { hablar: (texto, personaje) => V.hablar(texto, personaje), callar: () => V.callar() }; },
  };
  return V;
}

export default { crearVoz, MANIFIESTO_URL };
