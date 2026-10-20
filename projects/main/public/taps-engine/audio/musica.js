// Música de fondo de Taps (navegador). Usa el MISMO AudioContext que los efectos y la voz (sonido.js), con su propio bus.
//
//   import { crearMusica } from './musica.js';
//   const musica = crearMusica({ manifiesto: '/taps-musica/musica.json' });
//   musica.conectar(contexto);                       // el AudioContext ya creado en un gesto (nunca crea uno propio)
//   musica.encender(true);
//   musica.alTap({ mundo: 'cueva', tema: 'minecraft', motor: 'minecraft' });
//
// Reglas (producto/taps/musica, LEEME.md):
//   · Apagada por defecto y nada se pide a la red hasta que está encendida Y hay contexto (que solo existe tras un gesto).
//   · Solo se descarga la pista que va a sonar; `anticipar` baja la siguiente (sin decodificar) cuando el feed la prevé.
//   · Cambio de pista con fundido cruzado de 800 ms; ducking al 30 % mientras habla un personaje o suena un efecto de
//     respuesta; pausa con la pestaña oculta y en la pausa sana.
//   · Las canciones con letra solo suenan como fragmento de celebración (una vez) y luego vuelve la instrumental indicada.
//   · Las pistas (taps-musica/*.webm|m4a) ya vienen con el bucle cerrado y el volumen igualado (scripts/procesar-musica-taps.mjs).

/** Ganancia del bus de música (las pistas vienen a −20 LUFS): fondo sobrio, por debajo de la voz y los efectos. */
export const VOLUMEN_MUSICA = 0.55;
/** Las canciones de celebración vienen a −16 LUFS: un poco menos de ganancia para que no salten. */
export const VOLUMEN_CELEBRACION = 0.8;
/** Ganancia relativa mientras habla un personaje o suena un efecto de acierto o fallo. */
export const DUCKING = 0.3;
export const CRUCE_MS = 800;
/** Cuánto dura el ducking de un efecto (los efectos duran ≤ 400 ms). */
export const DUCK_EFECTO_MS = 650;
/**
 * Buffers vivos como máximo (~11 MB por minuto en mono): los decodificados guardados más los que se están decodificando.
 * La pista que suena nunca se descarta.
 */
export const MAX_BUFFERS = 3;

/**
 * Qué pista toca en un Tap: por mundo, luego categoría, luego motor; si nada coincide, la de defecto. Excepción: en las
 * categorías de `temaPrimero` (Lógica) manda la pista de la categoría aunque el mundo tenga una propia (espacio,
 * observatorio, biblioteca…): así todo Lógica suena a lógica.
 */
export function pistaPara(mapa, { mundo, tema, motor } = {}) {
  if (!mapa) return null;
  if (mapa.temaPrimero?.includes(tema) && mapa.temas?.[tema]) return mapa.temas[tema];
  return mapa.mundos?.[mundo] ?? mapa.temas?.[tema] ?? mapa.motores?.[motor] ?? mapa.defecto ?? null;
}

/**
 * Los archivos de una pista en el orden en que conviene probarlos: los que el navegador dice poder reproducir primero
 * (Opus/WebM antes que AAC/M4A, como vienen en el manifiesto); los que dice que no, al final (decodeAudioData a veces
 * puede aunque canPlayType diga que no, y al revés).
 */
export function ordenarArchivos(archivos, puede = () => 'maybe') {
  const si = [], no = [];
  for (const a of archivos ?? []) { let r = ''; try { r = puede(a.tipo) || ''; } catch { r = ''; } (r ? si : no).push(a); }
  return [...si, ...no];
}

/**
 * Bucle exacto dentro del buffer decodificado: algunos códecs añaden silencio de cebado al principio o relleno al final.
 * Se busca el primer y el último sample audible en los primeros/últimos 120 ms.
 */
export function limitesBucle(datos, sampleRate, umbral = 1e-4) {
  const n = datos.length, borde = Math.min(n, Math.round(sampleRate * 0.12));
  let i = 0; while (i < borde && Math.abs(datos[i]) < umbral) i++;
  let f = n - 1; while (f > n - borde && Math.abs(datos[f]) < umbral) f--;
  if (i >= borde) i = 0;
  if (f <= n - borde) f = n - 1;
  return { inicio: i / sampleRate, fin: (f + 1) / sampleRate };
}

/** Elige una canción del momento sin repetir la última (rota entre las que haya). */
export function elegirCelebracion(mapa, momento, ultima) {
  const lista = mapa?.celebraciones?.[momento] ?? [];
  if (!lista.length) return null;
  const i = lista.indexOf(ultima);
  return lista[(i + 1) % lista.length];
}

export function crearMusica(opciones = {}) {
  const urlManifiesto = opciones.manifiesto ?? '/taps-musica/musica.json';
  const pedir = opciones.fetch ?? ((url, o) => globalThis.fetch(url, o));
  const puede = opciones.puede ?? (tipo => { try { return globalThis.document?.createElement('audio').canPlayType(tipo) ?? 'maybe'; } catch { return 'maybe'; } });
  const base = new URL(urlManifiesto, globalThis.location?.href ?? 'http://localhost/');

  let ac = null, bus = null, duck = null, encendida = false, silencio = true, destruida = false;
  let manifiesto = null, cargaManifiesto = null, actual = null, deseada = null, ultimaCelebracion = null, finCelebracion = null;
  /** El último Tap que pidió música antes de tener el manifiesto (se resuelve al llegar). */
  let tapPendiente = null;
  const pausas = new Set();
  let vozHablando = false, duckEfectoHasta = 0, duckTimer = null;
  const decodificadas = new Map(), bytes = new Map(), pendientes = new Map();
  /** Tipos (MIME) que este navegador no pudo decodificar: no se vuelven a pedir (Safari con WebM/Opus). */
  const tiposMalos = new Set();
  let enVuelo = 0;
  /** Quienes esperan turno para decodificar (el tope cuenta también lo que se está decodificando). */
  const esperando = [];
  const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const suena = () => !!ac && encendida && !silencio && !pausas.size && !destruida;

  function montar(ctx) {
    ac = ctx;
    bus = ac.createGain(); bus.gain.value = 0;
    duck = ac.createGain(); duck.gain.value = 1;
    bus.connect(duck); duck.connect(ac.destination);
  }

  function nivelBus(rapido = false) {
    if (!bus) return;
    const t = ac.currentTime;
    bus.gain.cancelScheduledValues?.(t);
    bus.gain.setTargetAtTime(suena() ? 1 : 0, t, rapido ? 0.03 : 0.12);
  }

  function nivelDuck() {
    if (!duck) return;
    const bajo = vozHablando || ahora() < duckEfectoHasta;
    duck.gain.setTargetAtTime(bajo ? DUCKING : 1, ac.currentTime, bajo ? 0.04 : 0.15);
  }

  function leerManifiesto() {
    return (cargaManifiesto ??= pedir(base.href, { priority: 'low' })
      .then(r => { if (!r.ok) throw new Error(`musica.json ${r.status}`); return r.json(); })
      .then(m => (manifiesto = m))
      .catch(() => { cargaManifiesto = null; return null; }));
  }

  const pista = id => manifiesto?.pistas?.find(p => p.id === id) ?? null;

  /** Baja los bytes del primer formato que el navegador acepte (sin decodificar). */
  function traer(id) {
    const p = pista(id);
    if (!p) return Promise.resolve(null);
    if (bytes.has(id)) return bytes.get(id);
    const todos = ordenarArchivos(p.archivos, puede), buenos = todos.filter(a => !tiposMalos.has(a.tipo));
    const lista = buenos.length ? buenos : todos;
    const intento = (k) => {
      if (k >= lista.length) return Promise.resolve(null);
      return pedir(new URL(lista[k].src, base).href, { priority: 'low' })
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then(datos => ({ datos, k, lista }))
        .catch(() => intento(k + 1));
    };
    const pr = intento(0).then(r => { if (!r) bytes.delete(id); return r; });
    guardarBytes(id, pr);
    return pr;
  }

  function guardarBytes(id, pr) {
    bytes.delete(id); bytes.set(id, pr);
    while (bytes.size > 2) bytes.delete(bytes.keys().next().value);   // solo la actual y la siguiente
  }

  /** Espera hasta que un buffer más quepa en el tope (descartando guardados viejos si hace falta) y lo reserva. */
  async function turno() {
    for (;;) {
      hacerSitio();
      if (decodificadas.size + enVuelo + 1 <= MAX_BUFFERS) { enVuelo++; return; }
      await new Promise(ok => esperando.push(ok));
    }
  }

  function liberarTurno() {
    enVuelo--;
    esperando.splice(0).forEach(ok => ok());
  }

  /** Deja sitio para un buffer más: descarta los guardados más viejos (nunca el que suena) hasta quedar dentro del tope. */
  function hacerSitio() {
    while (decodificadas.size + enVuelo + 1 > MAX_BUFFERS) {
      const viejo = [...decodificadas.keys()].find(x => x !== actual?.id);
      if (viejo === undefined) return;
      decodificadas.delete(viejo);
    }
  }

  function decodificar(datos) {
    return new Promise((ok, mal) => {
      try {
        const copia = datos.slice(0);
        const r = ac.decodeAudioData(copia, ok, mal);
        if (r?.then) r.then(ok, mal);
      } catch (e) { mal(e); }
    });
  }

  /** Pista decodificada (con sus límites de bucle); si un formato no se puede decodificar, prueba el siguiente. */
  function buffer(id) {
    if (decodificadas.has(id)) { const b = decodificadas.get(id); decodificadas.delete(id); decodificadas.set(id, b); return Promise.resolve(b); }
    if (pendientes.has(id)) return pendientes.get(id);
    const pr = traer(id).then(async r => {
      if (!r || !ac) return null;
      let { datos, k, lista } = r;
      await turno();
      if (!ac) { liberarTurno(); return null; }
      try {
        for (;;) {
          try {
            const audio = await decodificar(datos);
            const lim = limitesBucle(audio.getChannelData(0), audio.sampleRate);
            const b = { audio, ...lim };
            enVuelo--; hacerSitio(); enVuelo++;                       // el que acaba de llegar ocupa su sitio
            decodificadas.set(id, b);
            if (k > 0) guardarBytes(id, Promise.resolve({ datos, k: 0, lista: [lista[k]] }));   // lo que sí decodificó
            return b;
          } catch {
            tiposMalos.add(lista[k].tipo);                              // este navegador no lo decodifica: las siguientes, otro formato
            k++;
            if (k >= lista.length) return null;
            try {
              const resp = await pedir(new URL(lista[k].src, base).href, { priority: 'low' });
              if (resp.ok) datos = await resp.arrayBuffer();
            } catch { /* sigue con el siguiente formato */ }
          }
        }
      } finally { liberarTurno(); }
    }).finally(() => pendientes.delete(id));
    pendientes.set(id, pr);
    return pr;
  }

  /** Para la pista que suena con un fundido (no lanza si ya terminó). */
  function soltar(v, ms = CRUCE_MS) {
    if (!v) return;
    const t = ac.currentTime;
    try {
      v.gain.gain.cancelScheduledValues?.(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + ms / 1000);
      v.src.stop(t + ms / 1000 + 0.05);
    } catch { /* ya parada */ }
  }

  /** Arranca `id` con fundido de entrada y suelta la anterior (fundido cruzado). `una` = sin bucle (celebración). */
  async function poner(id, { una = false, luego = null, offset = 0 } = {}) {
    deseada = { id, una, luego };
    if (!suena()) return false;
    if (actual?.id === id && !una && !actual.una) return true;
    // Una canción de celebración no espera a que se decodifique lo siguiente: se va ya (250 ms) y no vuelve.
    if (actual?.una && actual.id !== id) soltarCancion();
    const b = await buffer(id);
    if (!b || deseada?.id !== id || !suena()) return false;
    if (actual?.id === id && !una && !actual.una) return true;
    const p = pista(id);
    const src = ac.createBufferSource(), gain = ac.createGain();
    src.buffer = b.audio;
    if (!una) { src.loop = true; src.loopStart = b.inicio; src.loopEnd = b.fin; }
    const t = ac.currentTime, vol = p?.letra ? VOLUMEN_CELEBRACION : VOLUMEN_MUSICA;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + CRUCE_MS / 1000);
    src.connect(gain); gain.connect(bus);
    const desde = Math.max(b.inicio, Math.min(b.fin - 0.05, b.inicio + offset));
    src.start(t, desde);
    const anterior = actual;
    actual = { id, src, gain, una, t0: t - (desde - b.inicio), b };
    soltar(anterior, anterior && pista(anterior.id)?.letra ? 250 : CRUCE_MS);   // una canción no sigue sobre la pregunta
    clearTimeout(finCelebracion); finCelebracion = null;
    if (una) {
      const v = actual;
      // Solo si nadie pidió otra pista mientras tanto (deseada sigue siendo esta canción).
      const seguir = () => actual === v && deseada?.id === v.id;
      src.onended = () => {
        if (!seguir()) return;
        actual = null;
        if (luego) void poner(luego);
      };
      // Antes de que termine del todo ya entra la siguiente (fundido cruzado sobre el fundido de salida de la canción).
      if (luego) finCelebracion = setTimeout(() => { if (seguir()) void poner(luego); }, Math.max(0, (b.fin - b.inicio) * 1000 - CRUCE_MS));
    }
    return true;
  }

  function soltarCancion() {
    clearTimeout(finCelebracion); finCelebracion = null;
    const v = actual; actual = null;
    try { v.src.onended = null; } catch { /* sin fuente */ }
    soltar(v, 250);
  }

  /** Posición dentro del bucle de lo que suena (para reanudar donde iba tras una pausa). */
  function posicion() {
    if (!actual || actual.una) return 0;
    const largo = actual.b.fin - actual.b.inicio;
    return largo > 0 ? ((ac.currentTime - actual.t0) % largo + largo) % largo : 0;
  }

  function detenerTodo(ms = 300) {
    clearTimeout(finCelebracion); finCelebracion = null;
    const v = actual; actual = null;
    if (v && ac) soltar(v, ms);
  }

  /** Re-evalúa si debe sonar: arranca lo deseado o para con un fundido. */
  function sincronizar() {
    nivelBus();
    if (suena()) {
      if (!actual && (deseada || tapPendiente)) void leerManifiesto().then(m => {
        if (!deseada && tapPendiente) { const id = pistaPara(m?.mapa, tapPendiente); deseada = id ? { id, una: false } : null; }
        tapPendiente = null;
        if (deseada && suena() && !actual) void poner(deseada.id, { una: deseada.una, luego: deseada.luego, offset: deseada.offset ?? 0 });
      });
    } else if (actual) {
      // Sin sonar no se gasta CPU: se para (con fundido) y se recuerda dónde iba para volver al mismo punto.
      if (!actual.una) deseada = { id: actual.id, una: false, luego: null, offset: posicion() };
      else deseada = actual.luego ? { id: actual.luego, una: false } : null;
      detenerTodo(250);
    }
  }

  const M = {
    get encendida() { return encendida; },
    get suena() { return suena() && !!actual; },
    get pistaActual() { return actual?.id ?? null; },
    /** Buffers decodificados vivos (guardados + en decodificación). */
    get buffersVivos() { return decodificadas.size + enVuelo; },
    get manifiesto() { return manifiesto; },
    /** El AudioContext compartido (creado en un gesto por sonido.js o la app). Sin él no se pide nada. */
    conectar(ctx) {
      if (destruida || !ctx || ac === ctx) return;
      montar(ctx);
      sincronizar();
    },
    encender(si) {
      encendida = !!si;
      if (!encendida) { deseada = actual && !actual.una ? { id: actual.id, una: false } : deseada; }
      sincronizar();
      if (encendida && ac) void leerManifiesto();
    },
    silenciar(si) { silencio = !!si; sincronizar(); },
    /** Pausa por un motivo ('oculta', 'pausa-sana'…); vuelve a sonar cuando no queda ningún motivo. */
    pausar(motivo = 'pausa') { pausas.add(motivo); sincronizar(); },
    reanudar(motivo = 'pausa') { pausas.delete(motivo); sincronizar(); },
    /** El Tap a la vista: su pista de fondo (si es la misma que suena, sigue sin cortes). */
    async alTap(info) {
      if (!encendida) { deseada = null; tapPendiente = null; return null; }
      const m = manifiesto ?? (ac ? await leerManifiesto() : null);
      const id = pistaPara(m?.mapa, info);
      if (!id) { deseada = null; tapPendiente = info; return null; }
      tapPendiente = null;
      if (!suena()) { deseada = { id, una: false }; return id; }
      await poner(id);
      return id;
    },
    /** Resultado del Tap: 5/5 o racha nueva → fragmento de una canción y luego la instrumental de resultado; si no, solo esta. */
    async alResultado({ perfecto = false, racha = false } = {}) {
      if (!encendida) return null;
      const m = manifiesto ?? (ac ? await leerManifiesto() : null);
      if (!m) return null;
      const fondo = m.mapa?.resultado ?? null;
      const momento = racha ? 'racha' : perfecto ? 'perfecto' : null;
      const cancion = momento ? elegirCelebracion(m.mapa, momento, ultimaCelebracion) : null;
      if (cancion) {
        ultimaCelebracion = cancion;
        if (!suena()) { deseada = fondo ? { id: fondo, una: false } : null; return null; }   // una canción no se guarda para luego
        await poner(cancion, { una: true, luego: fondo });
        if (fondo) void buffer(fondo);                                 // lista para cuando termine la canción
        return cancion;
      }
      if (fondo) { if (!suena()) deseada = { id: fondo, una: false }; else await poner(fondo); }
      return fondo;
    },
    /** Baja los bytes de la pista de un Tap que viene (sin decodificar ni sonar). */
    async anticipar(info) {
      if (!encendida || !ac || destruida) return;
      const m = manifiesto ?? await leerManifiesto();
      const id = pistaPara(m?.mapa, info);
      if (id && id !== actual?.id && !decodificadas.has(id)) void traer(id);
    },
    /** Mientras habla un personaje la música baja al 30 %. */
    voz(hablando) { vozHablando = !!hablando; nivelDuck(); },
    /** Efecto de acierto, fallo, racha o resultado: la música baja un instante. */
    efecto() {
      if (!duck) return;
      duckEfectoHasta = ahora() + DUCK_EFECTO_MS;
      nivelDuck();
      clearTimeout(duckTimer);
      duckTimer = setTimeout(nivelDuck, DUCK_EFECTO_MS + 10);
    },
    detener() { deseada = null; detenerTodo(); },
    destruir() {
      destruida = true; detenerTodo(50); clearTimeout(duckTimer);
      decodificadas.clear(); bytes.clear();
      try { duck?.disconnect(); bus?.disconnect(); } catch { /* ya desconectado */ }
      ac = null;
    },
  };
  return M;
}

export default { crearMusica, pistaPara, ordenarArchivos, limitesBucle, elegirCelebracion, VOLUMEN_MUSICA, VOLUMEN_CELEBRACION, DUCKING, CRUCE_MS };
