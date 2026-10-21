import { topicOf } from './taps.logic';
import { hashAvalancha } from './taps.reto';
import { ITap, ITapQuestion } from './taps.types';

/**
 * Mezcla del feed con semilla (por persona y por día) y barajado de las opciones (por persona). Lógica pura, sin Angular
 * ni almacenamiento: el feed decide la semilla y aquí solo se ordena.
 *
 * Por qué: con el orden fijo «siempre sale todo en el mismo orden» (y dos personas ven la misma fila). La semilla es el id
 * anónimo del dispositivo (el del ranking, uuid en localStorage) más la fecha de Colombia: el mismo celular ve el mismo
 * orden durante el día (recargar no lo cambia) y otro distinto mañana; otro celular ve otra fila.
 *
 * Prerender = hidratación: el HTML prerenderizado trae el orden neutro (gancho + orden base de `orderFeed`) y nunca pasa
 * por aquí (en el servidor no hay dispositivo ni fecha de quien abre). El navegador mezcla tras hidratar, en el mismo
 * paso en que ya se aplicaba el orden deseado (`applyWantedOrder`), antes de que la persona deslice: el primer Tap a la
 * vista queda fijo (gancho para alguien nuevo, el del enlace `/t/<id>`), solo cambia lo que viene después.
 */

/** Semilla del día: dispositivo + fecha de Colombia (AAAA-MM-DD). */
export function semillaDe(dispositivo: string, fecha: string): string {
  return `${dispositivo}|${fecha}`;
}

/** Generador determinista (mulberry32) a partir de una semilla de texto. Devuelve números en [0, 1). */
export function crearAzar(semilla: string): () => number {
  let a = hashAvalancha(semilla) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cuántos candidatos se miran en cada posición: los siguientes del orden base. Conserva la estructura del orden base (personalización, diente de sierra) y varía localmente. */
export const VENTANA = 10;
/** Ruido con el que se desempata entre candidatos con penalización parecida. */
const RUIDO = 3;
/** Desde esta penalización se rompe una regla dura: entonces se busca en toda la cola, no solo en la ventana. */
const DURA = 60;
/** Peso del ritmo entre temas (ver ). */
const RITMO = 20;

/** Un Tap «de formato distinto»: alguna pregunta con 2 opciones (duelo, verdadero/falso…). Se reparten, no se juntan. */
export const conDosOpciones = (tap: ITap): boolean => tap.questions.some(q => q.options.length === 2);
const dificil = (tap: ITap | undefined): boolean => tap?.level === 'dificil';

/**
 * Penalización de poner `cand` después de `previos` (los últimos ya colocados). Cuanto más alta, peor. Las reglas:
 * - nunca dos seguidos del mismo tema (100) ni del mismo subtema (40 más);
 * - ritmo (`restantes`): el tema con más Taps por salir cuesta menos (hasta 20 de diferencia), para que ninguno se agote
 *   antes y el final del feed no quede con un solo tema (lo mismo que hace mixFeed);
 * - no tres difíciles seguidos (60) y se alterna la dificultad (5 si repite la del anterior);
 * - los Taps con preguntas de 2 opciones no van pegados (30 si el anterior lo era, 10 si alguno de los 3 anteriores).
 */
export function penalizacion(previos: readonly ITap[], cand: ITap, restantes?: ReadonlyMap<string, number>): number {
  const ultimo = previos[previos.length - 1], anteultimo = previos[previos.length - 2];
  let p = 0;
  if (restantes) {
    const max = Math.max(...restantes.values());
    if (max > 0) p += RITMO * (max - (restantes.get(topicOf(cand)) ?? 0)) / max;
  }
  if (!ultimo) return p;
  if (topicOf(ultimo) === topicOf(cand)) {
    p += 100;
    if (ultimo.subtopic !== undefined && ultimo.subtopic === cand.subtopic) p += 40;
  }
  if (dificil(cand) && dificil(ultimo) && dificil(anteultimo)) p += 60;
  if ((ultimo.level ?? 'media') === (cand.level ?? 'media')) p += 5;
  if (conDosOpciones(cand)) {
    if (conDosOpciones(ultimo)) p += 30;
    else if (previos.slice(-3).some(conDosOpciones)) p += 10;
  }
  return p;
}

export interface IMezclaOpts {
  /** Semilla (ver `semillaDe`). */
  semilla: string;
  /** Posiciones iniciales que no se tocan (el Tap del enlace, el gancho de alguien nuevo, lo ya respondido). */
  fijos?: number;
  /** Tap jugado hace poco (14 días): va al fondo de su grupo, por detrás de los que no se han jugado. */
  reciente?: (tap: ITap) => boolean;
  /** Grupo de cada Tap (0, 1, 2…): los grupos salen en orden y solo se mezcla dentro de cada uno (`?tema=` primero, temas bloqueados al final). */
  grupo?: (tap: ITap) => number;
}

/**
 * Reordena el feed con semilla respetando las restricciones de `penalizacion`. Generaliza `freshHead`: lo jugado hace poco
 * va al fondo (de su grupo) en vez de solo salir de las 2 primeras posiciones.
 *
 * En cada posición se miran los siguientes VENTANA candidatos del orden base (del grupo y la frescura que toca) y se elige
 * el de menor penalización, con un ruido con semilla para desempatar: así el orden base (personalización, diente de sierra)
 * sigue mandando a lo grande y cada persona y cada día ven una fila distinta. Conserva todos los Taps, sin repetir.
 */
export function mezclarFeed(feed: readonly ITap[], opts: IMezclaOpts): ITap[] {
  const fijos = Math.max(0, Math.min(opts.fijos ?? 0, feed.length));
  const azar = crearAzar(opts.semilla);
  const reciente = opts.reciente ?? (() => false), grupo = opts.grupo ?? (() => 0);
  const out = feed.slice(0, fijos);
  const resto = feed.slice(fijos);
  // Segmentos en orden: por grupo y, dentro de cada grupo, primero lo fresco y luego lo reciente.
  const claves = [...new Set(resto.map(grupo))].sort((a, b) => a - b);
  for (const g of claves) {
    const del = resto.filter(t => grupo(t) === g);
    for (const cola of [del.filter(t => !reciente(t)), del.filter(reciente)]) {
      while (cola.length) {
        const restantes = new Map<string, number>();
        for (const t of cola) restantes.set(topicOf(t), (restantes.get(topicOf(t)) ?? 0) + 1);
        const elegir = (n: number) => {
          let mejor = 0, mejorPuntaje = Infinity;
          cola.slice(0, n).forEach((cand, i) => {
            const puntaje = penalizacion(out, cand, restantes) + azar() * RUIDO;
            if (puntaje < mejorPuntaje) { mejorPuntaje = puntaje; mejor = i; }
          });
          return { mejor, mejorPuntaje };
        };
        let { mejor, mejorPuntaje } = elegir(VENTANA);
        if (mejorPuntaje >= DURA && cola.length > VENTANA) ({ mejor } = elegir(cola.length));   // la ventana no alcanza: se busca más lejos
        out.push(cola.splice(mejor, 1)[0]);
      }
    }
  }
  return out;
}

/** Cuántas categorías distintas hay en los primeros `n` Taps (medida de variedad). */
export function temasDistintos(feed: readonly ITap[], n = 10): number {
  return new Set(feed.slice(0, n).map(topicOf)).size;
}

// ───────────── opciones barajadas ─────────────
/** Opciones que se refieren a otras por su posición («Ninguna», «A y B», «las anteriores»…): no se tocan. */
const POSICIONAL = /\b(ninguna|ambas|todas|anterior|anteriores|las dos|[abcd] y [abcd])\b/i;

/**
 * ¿Se pueden barajar las opciones de esta pregunta? No si son 2 (verdadero/falso, duelos: izquierda y derecha significan
 * algo) ni si alguna opción se apoya en la posición de otra.
 */
export function opcionesBarajables(q: ITapQuestion): boolean {
  return q.options.length > 2 && !q.options.some(o => POSICIONAL.test(o));
}

/**
 * Devuelve el Tap con las opciones de cada pregunta barajadas con semilla (la persona: el mismo Tap se ve igual para ella
 * siempre) y `answer` apuntando a la correcta. `exenta(k)` deja una pregunta como está: la primera del Tap de gancho (la
 * pista «Toca tu respuesta» cuenta con su disposición) y las que ya estaban pintadas en el HTML antes de hidratar (el
 * script previo responde por posición). Si nada cambia devuelve el mismo objeto.
 */
export function barajarOpciones(tap: ITap, semilla: string, exenta: (k: number) => boolean = () => false): ITap {
  let cambio = false;
  const questions = tap.questions.map((q, k) => {
    if (exenta(k) || !opcionesBarajables(q)) return q;
    const azar = crearAzar(`${semilla}|${tap.id}|${q.id}`);
    const orden = q.options.map((_, i) => i);
    for (let i = orden.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
    if (orden.every((o, i) => o === i)) return q;
    cambio = true;
    return { ...q, options: orden.map(i => q.options[i]), answer: orden.indexOf(q.answer) };
  });
  return cambio ? { ...tap, questions } : tap;
}
