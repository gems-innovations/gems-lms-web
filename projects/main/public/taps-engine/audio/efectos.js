// Efectos de sonido de Taps, generados por código (síntesis procedural). Cero archivos, cero licencias de terceros.
//
//   import { renderizarEfecto } from './efectos.js';
//   const muestras = renderizarEfecto('acierto', { paleta: 'bloque', sampleRate: 48000 });   // Float32Array mono
//
// Este archivo es PURO (sin DOM ni Web Audio): el reproductor del navegador (sonido.js) convierte las muestras en un
// AudioBuffer, y el script de muestras (scripts/generar-voz-taps.mjs) las guarda como .wav con exactamente el mismo código.
//
// Diseño (producto/taps/experiencia-ux.md §5.1 y §5.3, producto/taps/voz-y-sonido.md):
//   · Todos duran 400 ms o menos y tienen el pico en −6 dBFS o menos: el volumen general (60 %) lo pone el reproductor.
//   · Dos paletas: «bloque» (8 bits: ondas cuadradas, notas en escalón, cuantizado) para Minecraft y «suave» (campanas
//     senoidales con ataque lento y filtro) para Estudio. Cada tema elige la suya con `paletaDeTema`.
//   · El acierto sube, el fallo baja «gracioso, no castigador», la racha sube más cuanto más larga y el resultado
//     depende del puntaje (fanfarria, medio o ánimo, nunca un sonido de derrota).
//   · El ruido es pseudoaleatorio con semilla fija: el mismo efecto suena igual siempre (y las pruebas son estables).

export const EFECTOS = Object.freeze(['toque', 'acierto', 'fallo', 'racha', 'resultado', 'deslizar', 'tic', 'aparece', 'blip']);
/**
 * Efectos del creador de personajes (producto/taps/disenador-v2-plan.md §3): solo existen en la paleta «epoca» (las del feed
 * no cambian). `pieza` sube con `indice` (Do5-Sol5), `color` con `luminancia` (0 oscuro/grave, 1 claro/agudo), `baraja` son
 * cuatro tics y la entrada, `logro` un arpegio Do-Mi-Sol-Do, `guardar` dos notas (Sol→Do) con cola y `ambiente` el sonido
 * del mundo elegido (`mundo`), el único que pasa de 400 ms.
 */
export const EFECTOS_CREADOR = Object.freeze(['pieza', 'color', 'baraja', 'logro', 'guardar', 'ambiente']);
export const PALETAS = Object.freeze(['bloque', 'suave', 'epoca']);
/** Duración máxima de cualquier efecto (s). */
export const DURACION_MAXIMA = 0.4;
/** Duración máxima del ambiente de un mundo (s): se funde a cero, nunca en bucle. */
export const DURACION_AMBIENTE = 1.2;
/** Pico máximo de las muestras (−6 dBFS). */
export const PICO = 0.5;
/** Mundos con ambiente propio (themes/epoca/scenery.js); otro mundo suena como el primero. */
export const MUNDOS_AMBIENTE = Object.freeze(['excavacion-egipto', 'foro-roma', 'taller-londres', 'laboratorio-moderno', 'sala-medieval', 'biblioteca', 'observatorio', 'aula']);

const TEMA_PALETA = { minecraft: 'bloque', estudio: 'suave', epoca: 'epoca' };
/** Paleta de un tema del motor; los temas que no la declaran suenan «suave» (lo más neutro). */
export const paletaDeTema = tema => TEMA_PALETA[tema] ?? 'suave';

/** Frecuencia de una nota a `semitonos` de La 440. */
const nota = semitonos => 440 * 2 ** (semitonos / 12);
// Notas que usamos (semitonos desde La 440): Do6 = 15, Mi6 = 19, Sol6 = 22, Do7 = 27…
const DO6 = 15, MI6 = 19, SOL6 = 22, DO7 = 27, SOL5 = 10, MI5 = 7, DO5 = 3;

/** Generador congruencial lineal: ruido reproducible. */
function azar(semilla = 1) { let s = semilla >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1; }

/** Seno por tabla (4096 puntos, interpolación lineal): 5 veces más rápido que Math.sin y sin diferencia audible. */
const TABLA = Float64Array.from({ length: 4097 }, (_, i) => Math.sin((2 * Math.PI * i) / 4096));
function seno(fase) { const p = (fase - Math.floor(fase)) * 4096, i = p | 0; return TABLA[i] + (TABLA[i + 1] - TABLA[i]) * (p - i); }

function onda(tipo, fase, ciclo = 0.5) {
  const p = fase - Math.floor(fase);
  if (tipo === 'cuadrada') return p < ciclo ? 1 : -1;
  if (tipo === 'triangular') return 1 - 4 * Math.abs(p - 0.5);
  if (tipo === 'sierra') return 2 * p - 1;
  return seno(p);
}

/**
 * Suma una nota al búfer. Frecuencia exponencial de f0 a f1, envolvente con ataque lineal y caída exponencial.
 * `parciales`: [[multiplo, volumen], …] para timbres de campana (solo con senoidal).
 */
function sumarNota(buf, sr, { t = 0, dur, f0, f1 = f0, tipo = 'senoidal', vol = 0.3, ataque = 0.004, caida = 6, ciclo = 0.5, parciales = null, escalon = 0 }) {
  const i0 = Math.round(t * sr), n = Math.min(buf.length - i0, Math.round(dur * sr));
  if (n <= 0) return;
  // Todo incremental (sin potencias ni exponenciales por muestra): en un móvil gama media cada efecto se genera en pocos ms.
  const paso = (f1 / f0) ** (1 / n), decae = Math.exp(-caida / n), subida = 1 / Math.max(1, ataque * sr);
  const np = parciales ? parciales.length : 0, mult = new Float64Array(np), amp = new Float64Array(np), fases = new Float64Array(np);
  for (let k = 0; k < np; k++) { mult[k] = parciales[k][0]; amp[k] = parciales[k][1]; }
  let fase = 0, f = f0, env = 1, ataqueEnv = 0, escalonF = f0, siguiente = 0;
  for (let i = 0; i < n; i++) {
    if (escalon) {                                                     // glissando en escalones (8 bits)
      if (i >= siguiente) { escalonF = f0 * (f1 / f0) ** (Math.floor((i / n) * escalon) / escalon); siguiente = Math.ceil(((Math.floor((i / n) * escalon) + 1) / escalon) * n); }
      fase += escalonF / sr;
    } else fase += f / sr;
    let v = onda(tipo, fase, ciclo);
    for (let k = 0; k < np; k++) { fases[k] += (f * mult[k]) / sr; v += amp[k] * seno(fases[k]); }
    if (ataqueEnv < 1) ataqueEnv = Math.min(1, ataqueEnv + subida);
    buf[i0 + i] += v * vol * env * ataqueEnv;
    f *= paso; env *= decae;
  }
}

/** Ruido filtrado con un pasabanda que barre de f0 a f1 (filtro de estado variable): un «fiu» o un roce. */
function sumarRuido(buf, sr, { t = 0, dur, f0, f1 = f0, vol = 0.2, q = 1.2, semilla = 7, forma = 'campana' }) {
  const i0 = Math.round(t * sr), n = Math.min(buf.length - i0, Math.round(dur * sr)), r = azar(semilla);
  let low = 0, band = 0, f = f0;
  const paso = (f1 / f0) ** (1 / Math.max(1, n));
  for (let i = 0; i < n; i++, f *= paso) {
    const x = i / n, k = 2 * Math.sin(Math.PI * Math.min(f, sr / 6) / sr);
    const high = r() - low - band / q; band += k * high; low += k * band;
    const env = forma === 'campana' ? Math.sin(Math.PI * x) ** 1.5 : Math.exp(-8 * x);
    buf[i0 + i] += band * vol * env;
  }
}

/** Sonido «8 bits»: menos niveles de amplitud y retención de muestra. */
function cuantizar(buf, niveles = 24, retener = 2) {
  let hold = 0;
  for (let i = 0; i < buf.length; i++) {
    if (i % retener === 0) hold = Math.round(buf[i] * niveles) / niveles;
    buf[i] = hold;
  }
}

/** Pasabajos de un polo: redondea el brillo de la paleta suave. */
function suavizar(buf, sr, corte = 6000) {
  const a = Math.exp(-2 * Math.PI * corte / sr); let y = 0;
  for (let i = 0; i < buf.length; i++) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
}

/** Deja el pico en `pico` y apaga los últimos 6 ms (sin «clic» al final). */
function terminar(buf, sr, pico = PICO) {
  let max = 0; for (const v of buf) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? pico / max : 0, fade = Math.min(buf.length, Math.round(sr * 0.006));
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  for (let i = 0; i < fade; i++) buf[buf.length - 1 - i] *= i / fade;
  return buf;
}

const CAMPANA = [[2.76, 0.28], [5.4, 0.08]];     // parciales inarmónicos: suena a campanita, no a tono de prueba

/**
 * Cada receta recibe (búfer, sampleRate, opciones) y devuelve [duración, pico]. Las opciones: `nivel` (racha: 3, 4, 5…)
 * y `puntaje` (resultado: 0 a 1).
 */
const RECETAS = {
  bloque: {
    toque:    (b, sr) => { sumarNota(b, sr, { dur: 0.04, f0: nota(DO6), tipo: 'cuadrada', ciclo: 0.25, vol: 0.3, caida: 3 }); return 0.05; },
    aparece:  (b, sr) => { sumarNota(b, sr, { dur: 0.06, f0: nota(SOL5), f1: nota(SOL6), tipo: 'cuadrada', ciclo: 0.25, vol: 0.25, escalon: 3, caida: 4 }); return 0.07; },
    blip:     (b, sr) => { sumarNota(b, sr, { dur: 0.025, f0: nota(MI6), tipo: 'cuadrada', ciclo: 0.125, vol: 0.2, caida: 2 }); return 0.03; },
    acierto:  (b, sr) => {                                                   // «moneda»: dos notas, la segunda sostenida
      sumarNota(b, sr, { dur: 0.06, f0: nota(MI6 + 2), tipo: 'cuadrada', vol: 0.3, caida: 1 });
      sumarNota(b, sr, { t: 0.06, dur: 0.17, f0: nota(DO7 + 2), tipo: 'cuadrada', vol: 0.3, caida: 4 });
      return 0.24;
    },
    fallo:    (b, sr) => {                                                   // «bonk» de bloque: baja en escalones y un golpe de ruido
      sumarNota(b, sr, { dur: 0.2, f0: nota(-5), f1: nota(-17), tipo: 'cuadrada', vol: 0.32, escalon: 4, caida: 3 });
      sumarRuido(b, sr, { dur: 0.05, f0: 900, vol: 0.5, forma: 'golpe', semilla: 3 });
      return 0.22;
    },
    racha:    (b, sr, o) => {                                                // arpegio que sube un tono por cada acierto extra
      const s = 2 * Math.min(4, Math.max(0, (o.nivel ?? 3) - 3));
      [MI6, SOL6, DO7].forEach((n, k) => sumarNota(b, sr, { t: k * 0.055, dur: k === 2 ? 0.2 : 0.06, f0: nota(n + s), tipo: 'cuadrada', vol: 0.27, caida: k === 2 ? 4 : 1 }));
      return 0.32;
    },
    resultado: (b, sr, o) => {
      const p = o.puntaje ?? 1;
      const notas = p >= 0.8 ? [DO6, MI6, SOL6, DO7] : p >= 0.5 ? [DO6, MI6, SOL6] : [SOL5, MI5, DO5 + 2];   // < 50 %: ánimo, bajando suave
      const paso = p >= 0.5 ? 0.07 : 0.1;
      notas.forEach((n, k) => sumarNota(b, sr, { t: k * paso, dur: k === notas.length - 1 ? 0.16 : paso, f0: nota(n), tipo: p >= 0.5 ? 'cuadrada' : 'triangular', ciclo: 0.5, vol: 0.27, caida: k === notas.length - 1 ? 4 : 1 }));
      return Math.min(DURACION_MAXIMA, (notas.length - 1) * paso + 0.17);
    },
    deslizar: (b, sr) => { sumarNota(b, sr, { dur: 0.12, f0: 300, f1: 1200, tipo: 'cuadrada', ciclo: 0.25, vol: 0.12, escalon: 6, caida: 2 }); sumarRuido(b, sr, { dur: 0.14, f0: 600, f1: 2600, vol: 0.35, semilla: 11 }); return 0.15; },
    tic:      (b, sr) => { sumarNota(b, sr, { dur: 0.02, f0: 1400, tipo: 'cuadrada', ciclo: 0.25, vol: 0.25, caida: 3 }); return 0.025; },
  },
  suave: {
    toque:    (b, sr) => { sumarNota(b, sr, { dur: 0.07, f0: nota(MI6), vol: 0.3, ataque: 0.003, caida: 7, parciales: [[2, 0.15]] }); return 0.08; },
    aparece:  (b, sr) => { sumarNota(b, sr, { dur: 0.09, f0: 420, f1: 840, vol: 0.25, ataque: 0.008, caida: 4 }); return 0.1; },
    blip:     (b, sr) => { sumarNota(b, sr, { dur: 0.03, f0: 900, vol: 0.18, ataque: 0.004, caida: 4 }); return 0.035; },
    acierto:  (b, sr) => {                                                   // «ding» ascendente de dos campanitas
      sumarNota(b, sr, { dur: 0.2, f0: nota(DO6), vol: 0.26, ataque: 0.005, caida: 6, parciales: CAMPANA });
      sumarNota(b, sr, { t: 0.07, dur: 0.18, f0: nota(SOL6), vol: 0.3, ataque: 0.005, caida: 5, parciales: CAMPANA });
      return 0.25;
    },
    fallo:    (b, sr) => {                                                   // «bonk» grave y redondo
      sumarNota(b, sr, { dur: 0.18, f0: 330, f1: 140, tipo: 'triangular', vol: 0.34, ataque: 0.004, caida: 4 });
      sumarNota(b, sr, { t: 0.02, dur: 0.22, f0: 160, f1: 80, vol: 0.3, ataque: 0.006, caida: 4 });
      return 0.25;
    },
    racha:    (b, sr, o) => {
      const s = 2 * Math.min(4, Math.max(0, (o.nivel ?? 3) - 3));
      [MI6, SOL6, DO7].forEach((n, k) => sumarNota(b, sr, { t: k * 0.06, dur: 0.2, f0: nota(n + s), vol: 0.24, ataque: 0.004, caida: 6, parciales: CAMPANA }));
      return 0.33;
    },
    resultado: (b, sr, o) => {
      const p = o.puntaje ?? 1;
      const notas = p >= 0.8 ? [DO6, MI6, SOL6, DO7] : p >= 0.5 ? [DO6, MI6, SOL6] : [SOL5, MI5, DO5 + 2];
      const paso = p >= 0.5 ? 0.075 : 0.1;
      notas.forEach((n, k) => sumarNota(b, sr, { t: k * paso, dur: 0.22, f0: nota(n), vol: 0.22, ataque: 0.006, caida: 5, parciales: p >= 0.5 ? CAMPANA : null }));
      return DURACION_MAXIMA;
    },
    deslizar: (b, sr) => { sumarRuido(b, sr, { dur: 0.22, f0: 500, f1: 2400, vol: 0.5, q: 1.4, semilla: 5 }); return 0.23; },
    tic:      (b, sr) => { sumarNota(b, sr, { dur: 0.03, f0: 1000, vol: 0.3, ataque: 0.001, caida: 9, parciales: [[2.01, 0.3]] }); return 0.035; },
  },
};

// Paleta «epoca» (creador de personajes): campanas senoidales con timbre de madera (parciales 1, 2.4 y 3.1, caída rápida),
// más cálidas que «suave». Acierto, fallo, racha, resultado, blip y tic son los del feed (coherencia al probar la pregunta).
const MADERA = [[2.4, 0.22], [3.1, 0.1]];
/** Entrada del personaje: glisando ascendente breve con madera. */
function aparecer(b, sr, t = 0, dur = 0.2) { sumarNota(b, sr, { t, dur, f0: 420, f1: 840, vol: 0.26, ataque: 0.006, caida: 5, parciales: MADERA }); return t + dur + 0.02; }
const AMBIENTES = {
  'excavacion-egipto': (b, sr) => {                                        // viento seco sobre la arena
    sumarRuido(b, sr, { dur: 1.2, f0: 260, f1: 620, vol: 0.5, q: 0.7, semilla: 21 });
    sumarRuido(b, sr, { t: 0.3, dur: 0.8, f0: 900, f1: 500, vol: 0.18, q: 1.1, semilla: 22 });
  },
  'foro-roma': (b, sr) => {                                                // murmullo de gente lejana
    sumarRuido(b, sr, { dur: 1.2, f0: 180, f1: 260, vol: 0.45, q: 1.6, semilla: 31 });
    sumarRuido(b, sr, { t: 0.15, dur: 0.9, f0: 420, f1: 380, vol: 0.22, q: 2.2, semilla: 32 });
    sumarRuido(b, sr, { t: 0.5, dur: 0.6, f0: 700, f1: 520, vol: 0.12, q: 2.5, semilla: 33 });
  },
  'taller-londres': (b, sr) => {                                           // tic-tac del reloj del taller
    [0.05, 0.35, 0.65, 0.95].forEach((t, k) => sumarRuido(b, sr, { t, dur: 0.03, f0: k % 2 ? 1900 : 2300, vol: 0.55, q: 3, semilla: 41 + k, forma: 'golpe' }));
    sumarRuido(b, sr, { dur: 1.2, f0: 220, f1: 200, vol: 0.12, q: 1.2, semilla: 45 });
  },
  'laboratorio-moderno': (b, sr) => {                                      // goteo y un zumbido muy bajo
    [0.1, 0.55, 0.95].forEach((t, k) => sumarNota(b, sr, { t, dur: 0.09, f0: 1700 - 200 * k, f1: 900, vol: 0.28, ataque: 0.002, caida: 7, parciales: [[2.0, 0.15]] }));
    sumarNota(b, sr, { dur: 1.2, f0: 120, vol: 0.09, ataque: 0.15, caida: 2.2 });
  },
  'sala-medieval': (b, sr) => {                                            // fuego: rumor grave y chasquidos
    sumarRuido(b, sr, { dur: 1.2, f0: 150, f1: 380, vol: 0.45, q: 0.8, semilla: 51 });
    [0.2, 0.48, 0.81].forEach((t, k) => sumarRuido(b, sr, { t, dur: 0.02, f0: 2800 + 300 * k, vol: 0.5, q: 2, semilla: 55 + k, forma: 'golpe' }));
  },
  // PR-D8: los tres escenarios nuevos
  biblioteca: (b, sr) => {                                                 // dos hojas que pasan y el silencio grave de la sala
    [0.1, 0.62].forEach((t, k) => sumarRuido(b, sr, { t, dur: 0.16, f0: 2600 - 400 * k, f1: 1400, vol: 0.34, q: 1.1, semilla: 71 + k }));
    sumarRuido(b, sr, { dur: 1.2, f0: 110, f1: 95, vol: 0.1, q: 1.4, semilla: 73 });
  },
  observatorio: (b, sr) => {                                               // brisa alta de colina y dos grillos lejanos
    sumarRuido(b, sr, { dur: 1.2, f0: 700, f1: 1100, vol: 0.3, q: 0.9, semilla: 81 });
    [0.3, 0.42, 0.85, 0.97].forEach((t, k) => sumarNota(b, sr, { t, dur: 0.05, f0: 4200 + (k % 2) * 300, vol: 0.12, ataque: 0.004, caida: 9 }));
  },
  aula: (b, sr) => {                                                       // tiza en la pizarra y murmullo de un grupo
    [0.08, 0.2, 0.3, 0.55, 0.68].forEach((t, k) => sumarRuido(b, sr, { t, dur: 0.035, f0: 3200 + 200 * (k % 3), vol: 0.4, q: 2.4, semilla: 91 + k, forma: 'golpe' }));
    sumarRuido(b, sr, { dur: 1.2, f0: 300, f1: 420, vol: 0.3, q: 1.8, semilla: 97 });
  },
};
/** Semitonos de Do5 a Sol5 según el índice de la pieza dentro de su grupo (cada pieza suena distinta). */
const tonoPieza = (indice = 0, total = 8) => DO5 + 7 * (Math.min(Math.max(0, indice), Math.max(1, total - 1)) / Math.max(1, total - 1));
RECETAS.epoca = {
  ...RECETAS.suave,
  toque:    (b, sr) => { sumarNota(b, sr, { dur: 0.06, f0: nota(MI6), vol: 0.3, ataque: 0.002, caida: 9, parciales: MADERA }); return 0.07; },
  aparece:  (b, sr) => aparecer(b, sr),
  pieza:    (b, sr, o) => {                                                // «pop» de madera y campanita que sube con el índice
    sumarRuido(b, sr, { dur: 0.025, f0: 1200, vol: 0.5, q: 1.5, semilla: 61, forma: 'golpe' });
    sumarNota(b, sr, { t: 0.01, dur: 0.13, f0: nota(tonoPieza(o.indice, o.total)), vol: 0.3, ataque: 0.003, caida: 8, parciales: MADERA });
    return 0.14;
  },
  color:    (b, sr, o) => {                                                // campana breve: oscuro grave, claro agudo (Do5 → Do6)
    const l = Math.min(1, Math.max(0, o.luminancia ?? 0.5));
    sumarNota(b, sr, { dur: 0.12, f0: nota(DO5 + 12 * l), vol: 0.3, ataque: 0.004, caida: 7, parciales: MADERA });
    return 0.12;
  },
  baraja:   (b, sr) => {                                                   // cuatro tics muy rápidos subiendo y la entrada
    for (let k = 0; k < 4; k++) sumarNota(b, sr, { t: k * 0.04, dur: 0.03, f0: 1100 * 1.14 ** k, vol: 0.22, ataque: 0.001, caida: 8, parciales: [[2.4, 0.2]] });
    return aparecer(b, sr, 0.17, 0.11);
  },
  deslizar: (b, sr, o) => {                                                // deshacer: el mismo «fiu», invertido (baja)
    if (o.inverso) { sumarRuido(b, sr, { dur: 0.14, f0: 2200, f1: 450, vol: 0.5, q: 1.4, semilla: 5 }); return 0.15; }
    return RECETAS.suave.deslizar(b, sr, o);
  },
  logro:    (b, sr) => {                                                   // arpegio Do-Mi-Sol-Do de campana (distinto del «resultado» del feed)
    [DO6, MI6, SOL6, DO7].forEach((n, k) => sumarNota(b, sr, { t: k * 0.08, dur: k === 3 ? 0.16 : 0.14, f0: nota(n), vol: 0.24, ataque: 0.004, caida: 5, parciales: MADERA }));
    return DURACION_MAXIMA;
  },
  guardar:  (b, sr) => {                                                   // «cerrar el cofre»: Sol → Do con cola
    sumarNota(b, sr, { dur: 0.12, f0: nota(SOL5), vol: 0.26, ataque: 0.004, caida: 5, parciales: MADERA });
    sumarNota(b, sr, { t: 0.1, dur: 0.2, f0: nota(DO6), vol: 0.3, ataque: 0.004, caida: 4, parciales: MADERA });
    return 0.3;
  },
  ambiente: (b, sr, o) => { (AMBIENTES[o.mundo] ?? AMBIENTES[MUNDOS_AMBIENTE[0]])(b, sr); return DURACION_AMBIENTE; },
};
/** Luminancia relativa (0-1) de un color `#rrggbb`; sirve para `color`. Color raro: 0,5. */
export function luminancia(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return 0.5;
  const v = parseInt(m[1], 16), lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return Math.min(1, Math.max(0, 0.2126 * lin(v >> 16) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255)));
}

/**
 * Muestras mono (Float32Array) del efecto `nombre` en la `paleta` pedida. Nombre desconocido: búfer vacío (no lanza).
 * @param {string} nombre      uno de EFECTOS
 * @param {{paleta?: string, sampleRate?: number, nivel?: number, puntaje?: number}} [opciones]
 */
export function renderizarEfecto(nombre, opciones = {}) {
  const sr = opciones.sampleRate ?? 48000, paleta = RECETAS[opciones.paleta] ? opciones.paleta : 'suave', receta = RECETAS[paleta][nombre];
  if (!receta) return new Float32Array(0);
  const tope = nombre === 'ambiente' ? DURACION_AMBIENTE : DURACION_MAXIMA;
  const buf = new Float32Array(Math.ceil(tope * sr));
  const dur = Math.min(tope, receta(buf, sr, opciones));
  const out = buf.slice(0, Math.ceil(dur * sr));
  if (paleta === 'bloque') cuantizar(out, 24, Math.max(1, Math.round(sr / 22050)));
  else suavizar(out, sr, 7000);
  return terminar(out, sr);
}

/** Clave de caché de un efecto con sus variantes (la racha y el resultado cambian según nivel y puntaje). */
export function claveEfecto(nombre, { paleta = 'suave', nivel, puntaje, indice, total, luminancia: lum, mundo, inverso } = {}) {
  if (nombre === 'racha') return `${paleta}:racha:${Math.min(7, Math.max(3, nivel ?? 3))}`;
  if (nombre === 'resultado') { const p = puntaje ?? 1; return `${paleta}:resultado:${p >= 0.8 ? 'alto' : p >= 0.5 ? 'medio' : 'bajo'}`; }
  if (nombre === 'pieza') return `${paleta}:pieza:${Math.round(tonoPieza(indice, total) * 2)}`;   // medio semitono de resolución
  if (nombre === 'color') return `${paleta}:color:${Math.round(Math.min(1, Math.max(0, lum ?? 0.5)) * 8)}`;   // 9 escalones
  if (nombre === 'ambiente') return `${paleta}:ambiente:${AMBIENTES[mundo] ? mundo : MUNDOS_AMBIENTE[0]}`;
  if (nombre === 'deslizar' && inverso) return `${paleta}:deslizar:inverso`;
  return `${paleta}:${nombre}`;
}

export default { EFECTOS, EFECTOS_CREADOR, PALETAS, DURACION_MAXIMA, DURACION_AMBIENTE, PICO, MUNDOS_AMBIENTE, paletaDeTema, renderizarEfecto, claveEfecto, luminancia };
