import { MAX_SAME_TOPIC_IN_A_ROW, topicOf } from './taps.logic';
import { ITap } from './taps.types';

/**
 * Señales de interés por tema (experiencia-ux.md §7.1, reglas 5-7), todo en el navegador (localStorage), sin servidor.
 * Lógica pura y determinista: el orden «Para ti» aprende suavemente y nunca se queda en un solo tema.
 */
export interface IInterest {
  /** Puntos por categoría (completar, compartir, repetir, salir tras un error). Sin entrada = tema sin explorar. */
  score: Record<string, number>;
  /** Categoría → marca de tiempo (ms) hasta la que no se muestra en «Para ti» («No me interesa»). */
  blocked: Record<string, number>;
  /** Tap → marca de tiempo (ms) de la última vez que se completó (novedad y avance por tema). */
  done: Record<string, number>;
  /** Días (AAAA-MM-DD) en los que se completó al menos un Tap: racha local. */
  days: string[];
}

export type TInterestSignal = 'complete' | 'share' | 'repeat' | 'leave-after-error';

/** Puntos de cada señal. «Me gusta» no existe en Taps, así que no hay señal para él. */
export const INTEREST_POINTS: Record<TInterestSignal, number> = { complete: 3, share: 5, repeat: 3, 'leave-after-error': -1 };
export const BLOCK_MS = 30 * 24 * 3600 * 1000;
export const NOVELTY_MS = 14 * 24 * 3600 * 1000;
/** Tope de la ganancia de un tema: pasado este puntaje ya no pesa más (que no desplace a los demás). */
const SCORE_CAP = 12;
/** 1 de cada 6 Taps es de un tema que la persona aún no ha probado. */
export const EXPLORE_EVERY = 6;
export const INTEREST_KEY = 'gems-taps-interes';

export const emptyInterest = (): IInterest => ({ score: {}, blocked: {}, done: {}, days: [] });

const isEmpty = (i: IInterest): boolean => !Object.keys(i.score).length && !Object.keys(i.blocked).length && !Object.keys(i.done).length;

/** Lee lo guardado con tolerancia: un valor roto o de otra versión vuelve a vacío. Quita lo vencido. */
export function parseInterest(raw: string | null | undefined, now: number): IInterest {
  try {
    const data = JSON.parse(raw ?? 'null') as Partial<IInterest> | null;
    if (!data || typeof data !== 'object') return emptyInterest();
    const nums = (o: unknown): Record<string, number> => Object.fromEntries(
      Object.entries((o && typeof o === 'object' ? o : {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;
    const blocked = Object.fromEntries(Object.entries(nums(data.blocked)).filter(([, until]) => until > now));
    return {
      score: nums(data.score), blocked, done: nums(data.done),
      days: Array.isArray(data.days) ? data.days.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60) : [],
    };
  } catch { return emptyInterest(); }
}

export function addSignal(interest: IInterest, topic: string, signal: TInterestSignal): IInterest {
  return { ...interest, score: { ...interest.score, [topic]: (interest.score[topic] ?? 0) + INTEREST_POINTS[signal] } };
}

/** Un Tap completado: +3 al tema, queda anotado (avance y novedad) y el día cuenta para la racha. */
export function markCompleted(interest: IInterest, tap: ITap, now: number): IInterest {
  const day = dayKey(now), days = interest.days.includes(day) ? interest.days : [...interest.days, day].slice(-60);
  return { ...addSignal(interest, topicOf(tap), 'complete'), done: { ...interest.done, [tap.id]: now }, days };
}

export const blockTopic = (interest: IInterest, topic: string, now: number): IInterest =>
  ({ ...interest, blocked: { ...interest.blocked, [topic]: now + BLOCK_MS } });

export function unblockTopic(interest: IInterest, topic: string): IInterest {
  const blocked = { ...interest.blocked };
  delete blocked[topic];
  return { ...interest, blocked };
}

export const isBlocked = (interest: IInterest, topic: string, now: number): boolean => (interest.blocked[topic] ?? 0) > now;

/** Fecha local AAAA-MM-DD (la racha cuenta días del calendario de la persona). */
export function dayKey(ms: number): string {
  const d = new Date(ms), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Racha local: días seguidos con algún Tap completado. Sigue viva si el último día es hoy o ayer; `today` dice si hoy ya cuenta. */
export function streakDays(days: readonly string[], now: number): { count: number; today: boolean } {
  const set = new Set(days), today = set.has(dayKey(now));
  let count = 0;
  const cursor = new Date(now);
  if (!today) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor.getTime()))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return { count, today };
}

/** Taps completados de una categoría (avance del anillo «9 de 23»). */
export function topicProgress(taps: readonly ITap[], interest: IInterest, topic: string): { done: number; total: number } {
  const mine = taps.filter(t => topicOf(t) === topic);
  return { done: mine.filter(t => interest.done[t.id]).length, total: mine.length };
}

/** Categorías con avance, de más a menos puntos (máximo `limit`): «Tus temas». */
export function yourTopics(taps: readonly ITap[], interest: IInterest, limit = 3): string[] {
  const topics = [...new Set(taps.map(topicOf))];
  return topics.filter(t => (interest.score[t] ?? 0) > 0 || topicProgress(taps, interest, t).done > 0)
    .sort((a, b) => (interest.score[b] ?? 0) - (interest.score[a] ?? 0)).slice(0, limit);
}

/**
 * Reordena la cola de «Para ti» según lo que la persona ha jugado. Las primeras `keep` posiciones no se tocan (el Tap
 * a la vista y el que asoma debajo no deben cambiar de pronto).
 * - Reparto proporcional y suave: cada tema avanza según su peso (1 a 2) y no gana todas las posiciones.
 * - Nunca más de 2 seguidos del mismo tema (salvo que solo quede uno).
 * - 1 de cada 6 posiciones se reserva para un tema sin explorar, si lo hay.
 * - Los Taps completados hace menos de 14 días van al final de su tema; los temas bloqueados («No me interesa»), al final de todo.
 * - Dentro de un tema se conserva el orden de entrada (diente de sierra). Sin señales no cambia nada.
 */
export function personalize(feed: readonly ITap[], keep: number, interest: IInterest, now: number): ITap[] {
  if (isEmpty(interest)) return [...feed];
  const head = feed.slice(0, keep), tail = feed.slice(keep);
  const recent = (t: ITap) => (interest.done[t.id] ?? 0) > now - NOVELTY_MS;
  const queues = new Map<string, ITap[]>(), blockedTaps: ITap[] = [];
  for (const t of tail) {
    if (isBlocked(interest, topicOf(t), now)) { blockedTaps.push(t); continue; }
    queues.set(topicOf(t), [...(queues.get(topicOf(t)) ?? []), t]);
  }
  for (const [topic, list] of queues) queues.set(topic, [...list.filter(t => !recent(t)), ...list.filter(recent)]);
  const pass = new Map([...queues.keys()].map(k => [k, 0]));
  const weight = (topic: string) => 1 + Math.min(Math.max(interest.score[topic] ?? 0, 0), SCORE_CAP) / SCORE_CAP;
  const out = [...head];
  while ([...queues.values()].some(q => q.length)) {
    const last = out[out.length - 1] ? topicOf(out[out.length - 1]) : null;
    const tailOut = out.slice(-MAX_SAME_TOPIC_IN_A_ROW);
    const full = tailOut.length === MAX_SAME_TOPIC_IN_A_ROW && tailOut.every(t => topicOf(t) === last);
    const open = [...queues.entries()].filter(([, q]) => q.length);
    let pool = open.filter(([k]) => !(full && k === last));
    if (!pool.length) pool = open;
    const position = out.length - head.length + 1;
    const unexplored = pool.filter(([k]) => interest.score[k] === undefined);
    if (position % EXPLORE_EVERY === 0 && unexplored.length) pool = unexplored;
    const [topic, queue] = pool.sort((a, b) => pass.get(a[0])! - pass.get(b[0])!)[0];
    out.push(queue.shift()!);
    pass.set(topic, pass.get(topic)! + 1 / weight(topic));
  }
  return [...out, ...blockedTaps];
}
