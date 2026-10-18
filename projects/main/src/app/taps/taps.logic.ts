import { ITap, ITapResult, ITapRun } from './taps.types';

/** Lógica pura de un Tap (sin DOM ni motor): puntaje → título, avance de preguntas y validación del formato de datos. */

export function startRun(tap: ITap): ITapRun {
  return { tapId: tap.id, index: 0, chosen: null, score: 0, finished: false };
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
  return { run: { ...run, chosen: option, score: run.score + (correct ? 1 : 0) }, correct };
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
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) at(`pregunta ${i + 1}: la respuesta no es una opción`);
    if (!q.q.trim() || !q.why.trim()) at(`pregunta ${i + 1}: falta enunciado o explicación`);
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
