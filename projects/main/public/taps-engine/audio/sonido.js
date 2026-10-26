// Reproductor de sonido de Taps (navegador). Un solo AudioContext para todo el feed: efectos, voz y lo que pida el motor.
//
//   import { crearSonido } from './sonido.js';
//   const sonido = crearSonido();
//   boton.onclick = () => { sonido.desbloquear(); sonido.silenciar(false); sonido.tocar('acierto', { tema: 'minecraft' }); };
//
// Reglas (producto/taps/voz-y-sonido.md):
//   · Nada suena antes de un gesto: el AudioContext se crea o reanuda dentro de `desbloquear()`, que se llama en un toque.
//     Quien ya tiene un AudioContext creado en el gesto (la app) lo pasa: `desbloquear(ctx)`.
//   · Arranca silenciado. Efectos al 60 %, voz al 100 %; mientras habla un personaje los efectos bajan (ducking).
//   · iOS: `navigator.audioSession.type = 'ambient'` (Safari 16.4+) hace que el interruptor de silencio del teléfono
//     calle Taps y que no corte la música de la persona. En el resto no hay forma estándar de leer el modo silencio.
//   · Los efectos se sintetizan la primera vez que se piden (efectos.js) y quedan en caché: 0 bytes de descarga.

// La versión (?v=) va también en los imports internos: si cambia efectos.js, una caché vieja no mezcla versiones.
import { renderizarEfecto, paletaDeTema, claveEfecto } from './efectos.js?v=3';

export const VOLUMEN_EFECTOS = 0.6;
export const VOLUMEN_VOZ = 1;
/** Ganancia de los efectos mientras habla un personaje. */
export const DUCKING = 0.35;
/** Nombres de sonido que pide el motor (theme.json) y su equivalente propio. Lo demás lo toca la app en su momento exacto. */
export const DESDE_MOTOR = Object.freeze({ pop: 'aparece', blip: 'blip' });

export function crearSonido(opciones = {}) {
  let ac = null, efectos = null, voz = null, silencio = true, destruido = false, pausado = false, ultimoDeslizar = -1, temaPedido = null, extraPedido = {}, gestoHasta = -1;
  const cache = new Map(), calientes = new Set(), ultimos = new Map();
  const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  /** iOS usa «interrupted» (llamada, Siri, otra app con audio): se trata igual que «suspended». */
  const dormido = () => ac && (ac.state === 'suspended' || ac.state === 'interrupted');

  function montar(ctx) {
    ac = ctx;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ac.destination);
    efectos = ac.createGain(); efectos.gain.value = silencio ? 0 : VOLUMEN_EFECTOS; efectos.connect(comp);
    voz = ac.createGain(); voz.gain.value = silencio ? 0 : VOLUMEN_VOZ; voz.connect(comp);
    if (temaPedido) S.precalentar(temaPedido, extraPedido);          // se pidió antes del primer gesto
  }

  function buffer(nombre, o) {
    const paleta = o.paleta ?? paletaDeTema(o.tema), clave = claveEfecto(nombre, { ...o, paleta });
    if (cache.has(clave)) return cache.get(clave);
    const datos = renderizarEfecto(nombre, { ...o, paleta, sampleRate: ac.sampleRate });
    if (!datos.length) { cache.set(clave, null); return null; }
    const b = ac.createBuffer(1, datos.length, ac.sampleRate); b.getChannelData(0).set(datos); cache.set(clave, b);
    return b;
  }

  const S = {
    get listo() { return !!ac && ac.state === 'running'; },
    get estado() { return ac?.state ?? null; },
    get silenciado() { return silencio; },
    get contexto() { return ac; },
    /**
     * Llamar DENTRO de un gesto (toque, clic, tecla). Crea o reanuda el AudioContext. Devuelve false si no hay Web Audio.
     * @param {AudioContext} [ctx] un contexto ya creado por quien llama
     * @param {{gesto?: boolean}} [o]  `gesto: false` si NO se llama dentro de un gesto (p. ej. al terminar de cargar)
     */
    desbloquear(ctx, o = {}) {
      if (destruido) return false;
      try { if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = 'ambient'; } catch { /* sin Audio Session API */ }
      if (!ac) {
        const C = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!ctx && !C) return false;
        try { montar(ctx ?? new C({ latencyHint: 'interactive' })); } catch { return false; }
      }
      pausado = false;
      if (o.gesto !== false) gestoHasta = ahora() + 250;            // margen para que el resume() del gesto termine
      if (dormido()) ac.resume().catch(() => {});
      return true;
    },
    silenciar(m) {
      silencio = !!m;
      if (!ac) return;
      const t = ac.currentTime;
      efectos.gain.setTargetAtTime(silencio ? 0 : VOLUMEN_EFECTOS, t, 0.02); voz.gain.setTargetAtTime(silencio ? 0 : VOLUMEN_VOZ, t, 0.02);
    },
    /** Baja (o devuelve) el volumen de los efectos mientras habla un personaje. */
    atenuar(si) { if (ac && !silencio) efectos.gain.setTargetAtTime(si ? VOLUMEN_EFECTOS * DUCKING : VOLUMEN_EFECTOS, ac.currentTime, 0.05); },
    /**
     * Toca un efecto (efectos.js). Sin desbloquear, silenciado o con la pestaña oculta no hace nada (y no lanza).
     * @param {string} nombre
     * `cadaMs`: tope de uno de este efecto cada tantos ms (p. ej. `color` al arrastrar el selector); el sobrante se descarta.
     * @param {{tema?: string, paleta?: string, nivel?: number, puntaje?: number, vol?: number, cadaMs?: number}} [o]
     */
    tocar(nombre, o = {}) {
      if (!ac || silencio || destruido || pausado) return false;
      // Solo suena con el contexto en marcha. Única excepción: justo tras desbloquear en un gesto válido, cuando el resume()
      // aún no terminó; fuera de eso, lo programado con el contexto dormido sonaría todo junto al despertar (ráfaga en móvil).
      if (ac.state !== 'running' && !(dormido() && ahora() < gestoHasta)) return false;
      if (o.cadaMs > 0) { const t = ahora(); if (t - (ultimos.get(nombre) ?? -Infinity) < o.cadaMs) return false; ultimos.set(nombre, t); }
      if (nombre === 'deslizar') ultimoDeslizar = ahora();
      if (nombre === 'aparece' && ahora() - ultimoDeslizar < 350) return false;   // el «fiu» del cambio de Tap ya lo dijo
      const b = buffer(nombre, o); if (!b) return false;
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = b; g.gain.value = o.vol ?? 1;
      if (nombre === 'blip' || nombre === 'toque') src.playbackRate.value = 0.96 + Math.random() * 0.08;   // que no suene a metralleta
      src.connect(g); g.connect(efectos); src.start();
      return true;
    },
    /** Reproduce muestras de voz (Float32Array) por el canal de voz. Se cumple al terminar o al cortarse. */
    reproducirVoz(muestras, sampleRate) {
      if (!ac || silencio || destruido || pausado || ac.state !== 'running' || !muestras?.length) return { fin: Promise.resolve(), detener() {} };
      const b = ac.createBuffer(1, muestras.length, sampleRate); b.getChannelData(0).set(muestras);
      const src = ac.createBufferSource(); src.buffer = b; src.connect(voz);
      const fin = new Promise(ok => { src.onended = () => { S.atenuar(false); ok(); }; });
      S.atenuar(true); src.start();
      return { fin, detener() { try { src.stop(); } catch { /* ya terminó */ } } };
    },
    /**
     * Sintetiza por adelantado los efectos de la paleta de un tema, de a uno por tarea en reposo (cada uno tarda pocos ms):
     * al responder, el sonido ya está en caché y suena en el mismo fotograma del toque.
     */
    precalentar(tema, extra = {}) {
      temaPedido = tema; extraPedido = extra;
      const paleta = extra.paleta ?? paletaDeTema(tema);
      if (!ac || destruido || calientes.has(paleta)) return;
      calientes.add(paleta);
      // `extra.lista` ([[nombre, opciones], …]) sustituye la lista del feed (el creador de personajes tiene otros efectos).
      const lista = extra.lista ? extra.lista.map(([n, o]) => [n, o ?? {}]) : [['acierto'], ['fallo'], ['deslizar'], ['toque'], ['aparece'], ['racha', { nivel: 3 }], ['racha', { nivel: 4 }], ['racha', { nivel: 5 }],
        ['resultado', { puntaje: 1 }], ['resultado', { puntaje: 0.6 }], ['resultado', { puntaje: 0 }], ['blip'], ['tic']];
      if (!lista.length) return;
      const idle = globalThis.requestIdleCallback ?? (fn => setTimeout(fn, 16));
      const uno = () => { if (destruido || !ac) return; const [n, o = {}] = lista.shift(); buffer(n, { ...o, tema, paleta }); if (lista.length) idle(uno); };
      idle(uno);
    },
    /** Pestaña oculta: se suspende el contexto y nada se acumula para sonar de golpe al volver. */
    pausar() { pausado = true; if (ac?.state === 'running') ac.suspend().catch(() => {}); },
    reanudar() { pausado = false; if (dormido()) ac.resume().catch(() => {}); },
    /**
     * Objeto para `create(contenedor, { audio })` del motor: el motor no crea su propio AudioContext y sus sonidos pasan por
     * aquí. Solo se traducen los de DESDE_MOTOR; acierto, fallo y resultado los toca la app (sabe el puntaje y la racha).
     */
    paraMotor() {
      return { play(nombre, o = {}) { const propio = DESDE_MOTOR[nombre]; if (propio) S.tocar(propio, { tema: o.theme }); } };
    },
    destruir() { destruido = true; cache.clear(); try { if (!opciones.contextoAjeno) ac?.close(); } catch { /* ya cerrado */ } ac = null; },
  };
  return S;
}

export default { crearSonido, VOLUMEN_EFECTOS, VOLUMEN_VOZ, DUCKING, DESDE_MOTOR };
