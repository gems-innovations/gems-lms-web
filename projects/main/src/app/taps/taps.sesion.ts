import { IInterest, NOVELTY_MS, dayKey, streakDays } from './taps.interest';
import { topicOf } from './taps.logic';
import { ITap, ITapRun } from './taps.types';

/**
 * Sesión y regreso (auditoria-permanencia.md, mejoras 1, 2 y 13). Lógica pura, sin Angular ni almacenamiento: el feed
 * lee y escribe; aquí solo se decide. Todo vive en el navegador y no lleva datos personales.
 *
 * Salvaguardas (competencia-y-recompensas.md §6.3): la meta del día es corta (3 Taps) y al cumplirse se celebra una vez y
 * no se pide más; perder la racha nunca se reprocha; no hay cuentas atrás ni «¿seguro que te vas?».
 */

/** Meta del día: 3 Taps. Baja a propósito (1 Tap ya cuenta para la racha). */
export const META_DIA = 3;
/** Quien vuelve tras 20 h o más recibe el saludo. */
export const REGRESO_MS = 20 * 3600 * 1000;
/** Un Tap a medias se retoma durante 48 h (antes solo en la misma pestaña). */
export const PARTIDAS_VIGENCIA_MS = 48 * 3600 * 1000;
export const SESION_KEY = 'gems-taps-sesion';
export const PARTIDAS_KEY = 'gems-taps-partidas';

// ───────────── meta del día y racha ─────────────
export interface IMetaDia { hechos: number; meta: number; cumplida: boolean }

/** Taps distintos completados hoy (día local) frente a la meta de 3. */
export function sessionGoal(interest: IInterest, now: number): IMetaDia {
  const hoy = dayKey(now);
  const hechos = Object.values(interest.done).filter(t => dayKey(t) === hoy).length;
  return { hechos, meta: META_DIA, cumplida: hechos >= META_DIA };
}

/** La racha más larga guardada (días seguidos), para el saludo cuando la actual se cortó. */
export function bestStreak(days: readonly string[]): number {
  const orden = [...new Set(days)].sort();
  let mejor = 0, actual = 0, previo: number | null = null;
  for (const d of orden) {
    const [y, m, dd] = d.split('-').map(Number);
    const t = Date.UTC(y, m - 1, dd);
    actual = previo !== null && Math.round((t - previo) / 86_400_000) === 1 ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = t;
  }
  return mejor;
}

export interface IResumenSesion {
  /** Racha viva (días seguidos hasta hoy o ayer). */
  racha: number;
  /** Hoy ya cuenta para la racha. */
  rachaHoy: boolean;
  meta: IMetaDia;
  /** Avance del tema del Tap a la vista (Taps completados del tema). */
  tema?: { nombre: string; hechos: number; total: number; color: string };
}

export function sessionSummary(interest: IInterest, now: number): IResumenSesion {
  const { count, today } = streakDays(interest.days, now);
  return { racha: count, rachaHoy: today, meta: sessionGoal(interest, now) };
}

/** Hay algo que mostrar en la barra: ya jugó alguna vez (racha o Taps de hoy). Antes de eso se ve la marca. */
export const hasProgress = (r: IResumenSesion): boolean => r.racha > 0 || r.meta.hechos > 0;

/** Frases completas para lectores de pantalla (lo visible es abreviado: «2 · 1/3»). */
export const streakLabel = (r: IResumenSesion): string => (r.racha === 1 ? 'Racha de 1 día' : `Racha de ${r.racha} días`);
export const goalLabel = (r: IResumenSesion): string =>
  (r.meta.cumplida ? `Meta de hoy lista: ${r.meta.hechos} Taps` : `Hoy ${r.meta.hechos} de ${r.meta.meta} Taps`);
export const sessionLabel = (r: IResumenSesion): string => `${streakLabel(r)}. ${goalLabel(r)}.`;

// ───────────── lo guardado de la sesión ─────────────
export interface ISesionGuardada {
  /** Última vez que se abrió /taps o se completó un Tap (ms). */
  ultima: number;
  /** Día (AAAA-MM-DD) en que ya se celebró la meta: una sola celebración al día. */
  celebrada: string | null;
  /** Último puntaje de cada Tap terminado: «Ya lo jugaste: 3/5». */
  puntajes: Record<string, number>;
}

export const emptySesion = (): ISesionGuardada => ({ ultima: 0, celebrada: null, puntajes: {} });

/** Lee con tolerancia (un valor roto o de otra versión vuelve a vacío). */
export function parseSesion(raw: string | null | undefined): ISesionGuardada {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<ISesionGuardada> | null;
    if (!d || typeof d !== 'object') return emptySesion();
    const puntajes = Object.fromEntries(Object.entries(d.puntajes && typeof d.puntajes === 'object' ? d.puntajes : {})
      .filter(([, v]) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 20)) as Record<string, number>;
    return {
      ultima: typeof d.ultima === 'number' && Number.isFinite(d.ultima) ? d.ultima : 0,
      celebrada: typeof d.celebrada === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.celebrada) ? d.celebrada : null,
      puntajes,
    };
  } catch { return emptySesion(); }
}

// ───────────── saludo al volver ─────────────
const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);

/**
 * Saludo de quien vuelve tras 20 h o más (y ya había jugado). Nunca culpa: si la racha se cortó, se recuerda la mejor y se
 * invita a empezar otra. null si no toca saludar.
 */
export function greeting(interest: IInterest, sesion: ISesionGuardada, now: number): string | null {
  if (!sesion.ultima || now - sesion.ultima < REGRESO_MS || !interest.days.length) return null;
  const { count, today } = streakDays(interest.days, now);
  if (count > 0 && today) return `¡Volviste! Racha de ${dias(count)}. Hoy ya cuenta`;
  if (count > 0) return `¡Volviste! Racha de ${dias(count)}. Hoy hay Taps nuevos`;
  const mejor = bestStreak(interest.days);
  return mejor >= 2 ? `¡Qué bueno verte! Tu mejor racha: ${dias(mejor)}. Empieza una nueva hoy` : '¡Qué bueno verte! Hoy hay Taps nuevos para ti';
}

/** «Ya lo jugaste: 3/5. ¿Revancha?» para el Tap de un enlace que ya se terminó. */
export function rematchText(tap: ITap, interest: IInterest, sesion: ISesionGuardada): string | null {
  if (!interest.done[tap.id]) return null;
  const p = sesion.puntajes[tap.id];
  return p === undefined ? 'Ya lo jugaste. ¿Revancha?' : `Ya lo jugaste: ${p}/${tap.questions.length}. ¿Revancha?`;
}

// ───────────── orden del regreso ─────────────
/**
 * Cabeza fresca: ningún Tap completado en los últimos 14 días ocupa las `n` primeras posiciones si hay otros sin jugar
 * (el primero de cada hueco se toma en el orden que ya traía el feed). `fixed` posiciones al inicio no se tocan (el Tap
 * pedido por enlace). Con `topic` (`?tema=`), el reemplazo de un Tap de ese tema se busca dentro del mismo tema.
 */
export function freshHead(feed: readonly ITap[], interest: IInterest, now: number, n = 2, fixed = 0, topic: string | null = null): ITap[] {
  const recent = (t: ITap) => (interest.done[t.id] ?? 0) > now - NOVELTY_MS;
  const out = [...feed];
  for (let pos = fixed; pos < Math.min(fixed + n, out.length); pos++) {
    if (!recent(out[pos])) continue;
    const same = topic !== null && topicOf(out[pos]) === topic;
    const swap = out.findIndex((t, i) => i > pos && !recent(t) && (!same || topicOf(t) === topic));
    if (swap < 0) break;
    const [fresh] = out.splice(swap, 1);
    out.splice(pos, 0, fresh);
  }
  return out;
}

// ───────────── partidas a medias (localStorage, 48 h) ─────────────
export type TPartidaGuardada = ITapRun & { t: number };

const validRun = (r: unknown): r is ITapRun => {
  const x = r as ITapRun | null;
  return !!x && typeof x === 'object' && Array.isArray(x.answers) && x.answers.every(a => typeof a === 'boolean')
    && Number.isInteger(x.index) && x.index >= 0 && typeof x.score === 'number' && typeof x.finished === 'boolean'
    && (x.chosen === null || Number.isInteger(x.chosen));
};

/**
 * Lee las partidas guardadas: el formato nuevo `{ v: 2, runs: { id: { ...run, t } } }` (localStorage) o el antiguo de
 * sessionStorage (`{ id: run }`, se toma como de ahora). Quita las vencidas, las de Taps que ya no existen y las vacías.
 */
export function parseRuns(raw: string | null | undefined, now: number, ids: ReadonlySet<string>): Record<string, TPartidaGuardada> {
  try {
    const d = JSON.parse(raw ?? 'null') as { v?: number; runs?: Record<string, unknown> } | Record<string, unknown> | null;
    if (!d || typeof d !== 'object') return {};
    const nuevo = (d as { v?: number }).v === 2;
    const runs = (nuevo ? (d as { runs?: Record<string, unknown> }).runs ?? {} : d) as Record<string, unknown>;
    const out: Record<string, TPartidaGuardada> = {};
    for (const [id, r] of Object.entries(runs)) {
      if (!ids.has(id) || !validRun(r) || r.answers.length === 0) continue;
      const t = nuevo && typeof (r as TPartidaGuardada).t === 'number' ? (r as TPartidaGuardada).t : now;
      if (now - t > PARTIDAS_VIGENCIA_MS) continue;
      if (r.finished && dayKey(t) !== dayKey(now)) continue;          // un Tap terminado otro día vuelve a empezar (no abre en su resultado)
      out[id] = { tapId: id, index: r.index, chosen: r.chosen, score: r.score, answers: r.answers, finished: r.finished, t };
    }
    return out;
  } catch { return {}; }
}

/** Guarda (o quita, si está vacía) la partida de un Tap y descarta las vencidas. Devuelve el texto para localStorage. */
export function storeRun(saved: Record<string, TPartidaGuardada>, run: ITapRun, now: number): { saved: Record<string, TPartidaGuardada>; raw: string } {
  const next: Record<string, TPartidaGuardada> = {};
  for (const [id, r] of Object.entries(saved)) if (id !== run.tapId && now - r.t <= PARTIDAS_VIGENCIA_MS) next[id] = r;
  if (run.answers.length) next[run.tapId] = { ...run, t: now };
  return { saved: next, raw: JSON.stringify({ v: 2, runs: next }) };
}

// ───────────── pausa sana (mejora 11, competencia-y-recompensas.md §6.3) ─────────────
/** Tras 20 Taps seguidos o 30 minutos de juego activo el personaje sugiere un descanso (una sola vez por sesión). */
export const PAUSA_TAPS = 20;
export const PAUSA_MS = 30 * 60 * 1000;
/** 30 minutos o más sin actividad (o un día nuevo) cierran la sesión: el contador, el tiempo y la sugerencia vuelven a cero. */
export const PAUSA_INACTIVA_MS = 30 * 60 * 1000;
/** Un hueco entre dos actividades suma como mucho esto (quien deja el celular quieto con la pestaña abierta no «juega»). */
export const PAUSA_HUECO_MAX_MS = 2 * 60 * 1000;
/** sessionStorage: la sesión de la pestaña sobrevive a recargar (el contador y el tiempo no vuelven a cero). */
export const PAUSA_KEY = 'gems-taps-pausa';

export interface IPausaSesion {
  /** Tiempo activo acumulado (ms): pestaña visible y con interacción. */
  activoMs: number;
  /** Última actividad (ms, Date.now()). */
  ultima: number;
  /** Taps terminados en esta sesión. */
  taps: number;
  /** Ya se sugirió el descanso en esta sesión. */
  sugerida: boolean;
  /** Día (AAAA-MM-DD) de la sesión. */
  dia: string;
}

export const nuevaPausa = (now: number): IPausaSesion => ({ activoMs: 0, ultima: now, taps: 0, sugerida: false, dia: dayKey(now) });

export function parsePausa(raw: string | null | undefined, now: number): IPausaSesion {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<IPausaSesion> | null;
    if (!d || typeof d !== 'object') return nuevaPausa(now);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
    const ultima = num(d.ultima), activoMs = num(d.activoMs), taps = Number.isInteger(d.taps) && d.taps! >= 0 ? d.taps! : null;
    if (ultima === null || ultima > now || activoMs === null || taps === null || typeof d.dia !== 'string') return nuevaPausa(now);
    return reanudarPausa({ activoMs, ultima, taps, sugerida: d.sugerida === true, dia: d.dia }, now);
  } catch { return nuevaPausa(now); }
}

/**
 * Vuelve a la pestaña (o se carga la página): el tiempo que estuvo oculta no cuenta. Si pasaron 30 min o más sin actividad,
 * o cambió el día, la sesión empieza de nuevo.
 */
export function reanudarPausa(p: IPausaSesion, now: number): IPausaSesion {
  if (now - p.ultima >= PAUSA_INACTIVA_MS || dayKey(now) !== p.dia) return nuevaPausa(now);
  return { ...p, ultima: now };
}

/**
 * Una interacción (responder, pasar de Tap, terminar uno) con la pestaña visible: suma el tiempo desde la anterior, con un
 * tope por hueco. 30 min o más sin actividad, o un día nuevo, reinician la sesión. `tap: true` cuenta un Tap terminado.
 */
export function registrarActividad(p: IPausaSesion, now: number, tap = false): IPausaSesion {
  const base = now - p.ultima >= PAUSA_INACTIVA_MS || dayKey(now) !== p.dia ? nuevaPausa(now) : p;
  const hueco = Math.max(0, Math.min(now - base.ultima, PAUSA_HUECO_MAX_MS));
  return { ...base, activoMs: base.activoMs + hueco, ultima: now, taps: base.taps + (tap ? 1 : 0) };
}

/** ¿Toca sugerir el descanso? Solo en un momento natural (al terminar un Tap o al pasar al siguiente), una vez por sesión. */
export function shouldSuggestPause(p: IPausaSesion): boolean {
  return !p.sugerida && (p.taps >= PAUSA_TAPS || p.activoMs >= PAUSA_MS);
}

/** Resumen amable de lo logrado («Hoy: 20 Taps. Llevas 3 insignias y una racha de 4 días»), sin cifras de tiempo. */
export function pauseSummary(hoy: number, insignias: number, racha: number): string {
  const partes: string[] = [];
  if (insignias > 0) partes.push(insignias === 1 ? '1 insignia' : `${insignias} insignias`);
  if (racha > 0) partes.push(`una racha de ${dias(racha)}`);
  const inicio = `Hoy: ${hoy === 1 ? '1 Tap' : `${hoy} Taps`}.`;
  return partes.length ? `${inicio} Llevas ${partes.join(' y ')}.` : inicio;
}

// ───────────── medición de la sesión (mejora 13) ─────────────
/**
 * Tramo de duración: `taps/sesion/<tramo>`. Límite conocido: se envía una sola vez, la primera vez que la pestaña se oculta
 * (o al salir del feed, o en `pagehide`). Si alguien cambia de app un momento y vuelve, lo que juegue después no se suma:
 * la cifra es un mínimo. Abrir el menú de compartir no cuenta como ocultar.
 */
export function sessionBucket(ms: number): '0-1min' | '1-3min' | '3-5min' | '5-10min' | '10+min' {
  const min = ms / 60_000;
  return min < 1 ? '0-1min' : min < 3 ? '1-3min' : min < 5 ? '3-5min' : min < 10 ? '5-10min' : '10+min';
}

/** Taps completados en la sesión: `taps/sesion-taps/<n>` (0 a 9, luego 10+), para la mediana del embudo semanal. */
export function sessionTapsBucket(n: number): string {
  return n >= 10 ? '10+' : String(Math.max(0, Math.floor(n)));
}
