import { ITap, ITapResult, ITapRun, ITapTopic } from './taps.types';

/** Lógica pura de un Tap (sin DOM ni motor): puntaje → título, avance de preguntas y validación del formato de datos. */

/** Límites de texto (experiencia-ux.md §3.1, §3.2 y §5.4): se leen de un vistazo y caben en la zona del pulgar. */
export const TAP_LIMITS = { question: 70, option: 40, optionGrid: 22, why: 90 } as const;

export function startRun(tap: ITap): ITapRun {
  return { tapId: tap.id, index: 0, chosen: null, score: 0, answers: [], finished: false };
}

/** Título que corresponde a `score` aciertos: el de mayor `min` que no lo supere (el primero si ninguno aplica). */
export function resultFor(tap: ITap, score: number): ITapResult {
  const sorted = [...tap.results].sort((a, b) => a.min - b.min);
  let found = sorted[0];
  for (const r of sorted) if (score >= r.min) found = r;
  return found;
}

/** Elige una opción de la pregunta actual. Ignora el toque si ya respondió, si ya terminó o si la opción no existe. */
export function choose(run: ITapRun, tap: ITap, option: number): { run: ITapRun; correct: boolean | null } {
  const q = tap.questions[run.index];
  if (run.finished || run.chosen !== null || !q || option < 0 || option >= q.options.length) return { run, correct: null };
  const correct = option === q.answer;
  return { run: { ...run, chosen: option, score: run.score + (correct ? 1 : 0), answers: [...run.answers, correct] }, correct };
}

/** Pasa a la siguiente pregunta (o termina). No avanza sin haber respondido. */
export function next(run: ITapRun, tap: ITap): ITapRun {
  if (run.finished || run.chosen === null) return run;
  const last = run.index >= tap.questions.length - 1;
  return last ? { ...run, finished: true } : { ...run, index: run.index + 1, chosen: null };
}

/** Un resultado «bueno» celebra; uno malo consuela. La mitad de las preguntas o más es bueno. */
export function isGoodScore(tap: ITap, score: number): boolean {
  return score * 2 >= tap.questions.length;
}

/** Aciertos seguidos al final de la partida (para el chip «x3 seguidas»). */
export function streak(run: ITapRun): number {
  let n = 0;
  for (let i = run.answers.length - 1; i >= 0 && run.answers[i]; i--) n++;
  return n;
}

/** Porcentaje de avance (0-100) contando la pregunta actual como en curso. */
export function progressPercent(run: ITapRun, tap: ITap): number {
  const done = run.finished ? tap.questions.length : run.index + (run.chosen !== null ? 1 : 0);
  return Math.round((done / tap.questions.length) * 100);
}

/** Pone primero el Tap pedido por `?t=<id>` (enlaces compartidos); si no existe deja el orden. */
export function orderTaps(taps: readonly ITap[], firstId: string | null | undefined): ITap[] {
  const i = taps.findIndex(t => t.id === firstId);
  return i <= 0 ? [...taps] : [taps[i], ...taps.filter((_, k) => k !== i)];
}

/** Categoría de un Tap: `topic` o, si no la trae, el tema del motor (el videojuego). */
export function topicOf(tap: ITap): string {
  return tap.topic ?? tap.theme;
}

/**
 * Orden del feed:
 * 1. El Tap del enlace (`?t=`) va primero.
 * 2. Con `?tema=` van primero los Taps de esa categoría (el resto sigue después: el feed nunca se acaba de golpe).
 * 3. Alguien nuevo empieza por el Tap de gancho; quien ya lo jugó lo encuentra al final (no se le repite lo fácil).
 */
export function orderFeed(taps: readonly ITap[], opts: { first?: string | null; topic?: string | null; hookDone?: boolean }): ITap[] {
  const hooksLast = (list: ITap[]) => {
    const hooks = list.filter(t => t.hook), rest = list.filter(t => !t.hook);
    return opts.hookDone ? [...rest, ...hooks] : [...hooks, ...rest];
  };
  let list: ITap[];
  if (opts.topic && taps.some(t => topicOf(t) === opts.topic)) {
    const mine = taps.filter(t => topicOf(t) === opts.topic), others = taps.filter(t => topicOf(t) !== opts.topic);
    list = [...hooksLast(mine), ...hooksLast(others)];
  } else {
    list = hooksLast([...taps]);
  }
  return taps.some(t => t.id === opts.first) ? orderTaps(list, opts.first) : list;
}

/**
 * Categorías del selector: primero las que tienen Taps (en el orden del catálogo; una categoría nueva aparece sola al
 * agregar un Tap con ese `topic`, aunque no esté en el catálogo), luego las del catálogo sin Taps, marcadas como pronto.
 */
export function feedTopics(taps: readonly ITap[], catalog: readonly ITapTopic[]): { topic: ITapTopic; count: number; soon: boolean }[] {
  const counts = new Map<string, number>();
  for (const t of taps) counts.set(topicOf(t), (counts.get(topicOf(t)) ?? 0) + 1);
  const known = new Map(catalog.map(c => [c.id, c]));
  const live = [...catalog.filter(c => counts.has(c.id)),
    ...[...counts.keys()].filter(id => !known.has(id)).map(id => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), blurb: '', color: '#8b93a7' }))];
  return [
    ...live.map(topic => ({ topic, count: counts.get(topic.id) ?? 0, soon: false })),
    ...catalog.filter(c => !counts.has(c.id)).map(topic => ({ topic, count: 0, soon: true })),
  ];
}

/** Disposición de las opciones: 2×2 si todas son cortas; una columna si alguna es larga; 2 apiladas si son 2. */
export function optionLayout(options: readonly string[]): 'grid' | 'list' | 'pair' {
  if (options.length === 2) return 'pair';
  return options.every(o => o.length <= TAP_LIMITS.optionGrid) ? 'grid' : 'list';
}

/** Revisa que un Tap esté bien formado. Devuelve la lista de problemas (vacía = correcto). */
export function validateTap(tap: ITap): string[] {
  const errors: string[] = [];
  const at = (m: string) => errors.push(`${tap.id}: ${m}`);
  if (!tap.id.trim()) at('sin id');
  if (!tap.theme) at('sin tema');
  if (!tap.scene?.world || !tap.scene?.host) at('la escena necesita world y host');
  if (tap.questions.length === 0) at('sin preguntas');
  const ids = new Set<string>();
  tap.questions.forEach((q, i) => {
    if (ids.has(q.id)) at(`pregunta repetida ${q.id}`);
    ids.add(q.id);
    if (q.options.length < 2) at(`pregunta ${i + 1} con menos de 2 opciones`);
    if (q.options.length > 4) at(`pregunta ${i + 1} con más de 4 opciones`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) at(`pregunta ${i + 1}: la respuesta no es una opción`);
    if (!q.q.trim() || !q.why.trim()) at(`pregunta ${i + 1}: falta enunciado o explicación`);
    if (q.q.length > TAP_LIMITS.question) at(`pregunta ${i + 1}: el enunciado pasa de ${TAP_LIMITS.question} caracteres`);
    if (q.why.length > TAP_LIMITS.why) at(`pregunta ${i + 1}: la explicación pasa de ${TAP_LIMITS.why} caracteres`);
    if (q.options.some(o => o.length > TAP_LIMITS.option)) at(`pregunta ${i + 1}: una opción pasa de ${TAP_LIMITS.option} caracteres`);
  });
  if (tap.results.length === 0) at('sin resultados');
  else {
    const mins = tap.results.map(r => r.min);
    if (Math.min(...mins) !== 0) at('algún resultado debe empezar en 0 aciertos');
    if (new Set(mins).size !== mins.length) at('resultados con el mismo mínimo');
    if (Math.max(...mins) > tap.questions.length) at('un resultado pide más aciertos que preguntas');
  }
  return errors;
}
