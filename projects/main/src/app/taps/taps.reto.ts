import { topicOf } from './taps.logic';
import { shareGrid } from './taps.share';
import { TAPS_RETO_CALENDARIO } from './taps.banco.generated';
import { ITap } from './taps.types';

/**
 * Reto del día (auditoria-permanencia.md, mejora 4). Sin servidor: el mismo Tap para todos el mismo día, según la fecha
 * de Colombia (UTC-5, sin horario de verano). Cambia a la medianoche de Colombia, igual que el ranking «hoy» del API.
 *
 * - Calendario fijo: lo genera scripts/generar-taps.mjs y queda versionado en scripts/reto-calendario.json (y embebido en
 *   taps.banco.generated.ts). Solo crece hacia el futuro: agregar Taps al banco no cambia ni los días pasados ni el de hoy.
 *   Tema rotativo (lun Minecraft, mar Lógica, mié Cultura, jue Minecraft, vie Lógica, sáb Cultura y dom Minecraft), todos los
 *   Taps de un tema antes de repetir y subtemas intercalados.
 * - Respaldo (fuera del calendario o si un Tap del calendario ya no existe): misma rotación de temas y, dentro del tema,
 *   un orden fijo mezclado con un hash con avalancha. Determinista, pero sin intercalar subtemas.
 * - Solo usa Taps del banco (los que acepta el API del ranking): nunca inventa ids.
 * - Un solo intento puntuable: el primer resultado del día queda como «tu reto». Repetir se puede, pero no lo cambia.
 */

export interface ICalendarioReto { inicio: string; dias: readonly string[] }

/** Reto #1: lunes 19 de octubre de 2026 (el inicio del calendario generado). */
export const RETO_INICIO = TAPS_RETO_CALENDARIO.inicio;
export const RETO_KEY = 'gems-taps-reto';
const COLOMBIA_MS = 5 * 3600 * 1000;
const DIA_MS = 86_400_000;

/** Tema de cada día, de lunes (0) a domingo (6). La misma rotación que RETO.rotacion del generador. */
export const RETO_ROTACION: readonly string[] = ['minecraft', 'logica', 'cultura', 'minecraft', 'logica', 'cultura', 'minecraft'];

/** Fecha AAAA-MM-DD en Colombia para un instante (ms). */
export function fechaColombia(ms: number): string {
  return new Date(ms - COLOMBIA_MS).toISOString().slice(0, 10);
}

/** Días desde 1970-01-01 de una fecha AAAA-MM-DD. */
function indiceDia(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DIA_MS);
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Hash estable con avalancha (FNV-1a + mezcla final de murmur3), el mismo del generador. */
export function hashAvalancha(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

export interface IRetoDia {
  /** Fecha de Colombia (AAAA-MM-DD). */
  fecha: string;
  /** Número del reto: #1 el 19 de octubre de 2026 (nunca menos de 1). */
  numero: number;
  tap: ITap;
  /** Categoría del día (`minecraft`, `logica`, `cultura`). */
  tema: string;
}

/** Respaldo determinista fuera del calendario: rotación de temas y vueltas completas por un orden mezclado. */
function respaldo(taps: readonly ITap[], dia: number, inicio: number): { tap: ITap; tema: string } {
  const slot = mod(dia - inicio, 7), semana = Math.floor((dia - inicio) / 7), tema = RETO_ROTACION[slot];
  let pool = taps.filter(t => topicOf(t) === tema && !t.hook);
  if (!pool.length) pool = taps.filter(t => !t.hook);
  if (!pool.length) pool = [...taps];
  pool = [...pool].sort((a, b) => hashAvalancha(a.id) - hashAvalancha(b.id) || a.id.localeCompare(b.id));
  const vez = semana * RETO_ROTACION.filter(t => t === tema).length + RETO_ROTACION.slice(0, slot).filter(t => t === tema).length;
  return { tap: pool[mod(vez, pool.length)], tema };
}

/**
 * El Tap del día para una fecha de Colombia. `null` solo si no hay Taps. Mismo resultado en cualquier navegador (no usa
 * azar ni la hora local).
 */
export function dailyTap(taps: readonly ITap[], fecha: string, calendario: ICalendarioReto = TAPS_RETO_CALENDARIO): IRetoDia | null {
  if (!taps.length) return null;
  const dia = indiceDia(fecha), inicio = indiceDia(calendario.inicio), numero = Math.max(1, dia - inicio + 1);
  const delCalendario = dia >= inicio ? taps.find(t => t.id === calendario.dias[dia - inicio]) : undefined;
  if (delCalendario) return { fecha, numero, tap: delCalendario, tema: topicOf(delCalendario) };
  return { fecha, numero, ...respaldo(taps, dia, inicio) };
}

/** Lo que muestran la hoja «Tu día», el resultado y el fin del feed. */
export interface IRetoVista {
  numero: number;
  tapId: string;
  temaNombre: string;
  /** El intento que cuenta (el primero del día); null si aún no se jugó. */
  hecho: { score: number; total: number; answers: boolean[] } | null;
}

// ───────────── el intento del día (localStorage) ─────────────
export interface IRetoGuardado {
  fecha: string;
  numero: number;
  tapId: string;
  answers: boolean[];
}

/** Lee el intento guardado; solo vale si es del reto de `fecha` (otro día = no hay intento). */
export function parseReto(raw: string | null | undefined, fecha: string): IRetoGuardado | null {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<IRetoGuardado> | null;
    if (!d || typeof d !== 'object' || d.fecha !== fecha || typeof d.tapId !== 'string' || !Number.isInteger(d.numero)) return null;
    if (!Array.isArray(d.answers) || !d.answers.length || d.answers.length > 20 || !d.answers.every(a => typeof a === 'boolean')) return null;
    return { fecha: d.fecha, numero: d.numero!, tapId: d.tapId, answers: d.answers };
  } catch { return null; }
}

export const retoScore = (r: IRetoGuardado): number => r.answers.filter(Boolean).length;

/** Etiqueta corta: «Reto del día #12». */
export const retoLabel = (numero: number): string => `Reto del día #${numero}`;

/**
 * Enlace para compartir el reto: `/hoy` (tarjeta neutra «Reto del día», sin la primera pregunta del Tap en la vista previa,
 * como sí la trae `/t/<id>`). Quien lo abre el mismo día juega el mismo reto.
 */
export function retoUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/hoy`;
}

/**
 * Texto para compartir el reto, tipo Wordle: número, cuadrícula y puntaje. No dice el título del Tap ni ninguna respuesta.
 * Sin `url` cuando el menú de compartir la recibe aparte.
 */
export function retoShareText(numero: number, temaNombre: string, answers: readonly boolean[], total: number, url?: string): string {
  const score = answers.filter(Boolean).length;
  const lines = [
    `Taps de GEMS LMS · ${retoLabel(numero)} (${temaNombre})`,
    `${shareGrid(answers, total)} ${score}/${total}`,
    '¿Me ganas? El mismo reto para todos. Mañana hay otro.',
  ];
  if (url) lines.push(url);
  return lines.join('\n');
}
