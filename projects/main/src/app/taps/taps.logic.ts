import { ITap, ITapQuestion, ITapResult, ITapRun, ITapTopic, SIN_RESPUESTA, TTapQuestionTipo } from './taps.types';

/** Lógica pura de un Tap (sin DOM ni motor): puntaje → título, avance de preguntas y validación del formato de datos. */

/**
 * Límites de texto (experiencia-ux.md §3.1, §3.2 y §5.4): se leen de un vistazo y caben en la zona del pulgar. La pregunta
 * pasó de 70 a 120 con el banco (5 líneas a 375 px); el generador (scripts/generar-taps.mjs) aplica los mismos límites.
 */
export const TAP_LIMITS = { question: 120, option: 40, optionGrid: 22, why: 90 } as const;

/** La pregunta es un paso de historia: una decisión narrativa que no puntúa. */
export function esPaso(q: ITapQuestion | undefined): boolean {
  return q?.tipo === 'paso';
}

/** Preguntas que puntúan (todas menos los pasos de una historia): el total de «x de N», del resultado y del ranking. */
export function puntuables(tap: ITap): number {
  return tap.questions.filter(q => !esPaso(q)).length;
}

/** Las respuestas de las preguntas que puntúan, sin las decisiones de los pasos (cuadrícula del resultado y de compartir). */
export function respuestasPuntuables(tap: ITap, answers: readonly boolean[]): boolean[] {
  return tap.questions.flatMap((q, i) => (esPaso(q) || i >= answers.length ? [] : [answers[i]]));
}

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
  if (esPaso(q)) return { run: { ...run, chosen: option, answers: [...run.answers, true] }, correct: true };   // una decisión no puntúa
  const correct = option === q.answer;
  return { run: { ...run, chosen: option, score: run.score + (correct ? 1 : 0), answers: [...run.answers, correct] }, correct };
}

/** Se acabó la cuenta regresiva (formato duo) sin responder: cuenta como fallo, sin opción marcada. */
export function timeOut(run: ITapRun, tap: ITap): ITapRun {
  if (run.finished || run.chosen !== null || !tap.questions[run.index]) return run;
  return { ...run, chosen: SIN_RESPUESTA, answers: [...run.answers, false] };
}

/** Formato de una pregunta: el del banco o, sin campo, `clasica`. */
export function questionTipo(q: ITapQuestion | undefined): TTapQuestionTipo {
  return q?.tipo ?? 'clasica';
}

/** Pasa a la siguiente pregunta (o termina). No avanza sin haber respondido. */
export function next(run: ITapRun, tap: ITap): ITapRun {
  if (run.finished || run.chosen === null) return run;
  const last = run.index >= tap.questions.length - 1;
  return last ? { ...run, finished: true } : { ...run, index: run.index + 1, chosen: null };
}

/** Un resultado «bueno» celebra; uno malo consuela. La mitad de las preguntas o más es bueno. */
export function isGoodScore(tap: ITap, score: number): boolean {
  return score * 2 >= puntuables(tap);
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

/** Dificultad en número: facil 1, media 2, dificil 3 (sin dato = media). */
const levelOf = (tap: ITap): number => ({ facil: 1, media: 2, dificil: 3 })[tap.level ?? 'media'];
/**
 * Diente de sierra (experiencia-ux.md §7.1): la dificultad sube y baja en vez de solo subir. Cada valor es un «cuantil» de
 * la dificultad de los Taps de la categoría (0 = lo más fácil, 1 = lo más difícil): fácil, media, difícil, fácil, media,
 * media, difícil... Al medirse contra los Taps que hay, las tres dificultades se reparten parejo y no se agotan las fáciles al principio.
 */
export const SAWTOOTH = [0.1, 0.4, 0.9, 0.2, 0.55, 0.65, 0.97] as const;

/** Ordena los Taps de UNA categoría en diente de sierra: el gancho primero, luego la ola de dificultad. */
export function sawtoothOrder(taps: readonly ITap[]): ITap[] {
  const hooks = taps.filter(t => t.hook), rest = taps.filter(t => !t.hook);
  const share = (n: number) => rest.length ? rest.filter(t => levelOf(t) === n).length / rest.length : 0;
  const easy = share(1), middle = easy + share(2);
  const out = [...hooks];
  for (let step = 0; rest.length; step++) {
    const quantile = SAWTOOTH[step % SAWTOOTH.length];
    const wanted = quantile < easy ? 1 : quantile < middle ? 2 : 3;
    let pick = 0, best = Infinity;
    rest.forEach((t, i) => { const d = Math.abs(levelOf(t) - wanted); if (d < best) { best = d; pick = i; } });
    out.push(rest.splice(pick, 1)[0]);
  }
  return out;
}
/** Máximo de Taps seguidos de la misma categoría en «Para ti». */
export const MAX_SAME_TOPIC_IN_A_ROW = 2;

/**
 * Mezcla un conjunto de Taps para el feed «Para ti» (sin azar: el servidor y el navegador deben dar el mismo orden):
 * - Nunca más de 2 seguidos de la misma categoría (salvo que solo quede una categoría).
 * - Se escoge la categoría con más Taps por jugar (así ninguna se queda sola al final); a igualdad, la que lleva más tiempo sin salir.
 * - Dentro de cada categoría los Taps van en diente de sierra (`sawtoothOrder`).
 * - El Tap de gancho de cada categoría es el primero de esa categoría; con `hookDone` (ya jugó uno) los ganchos van al final.
 */
export function mixFeed(taps: readonly ITap[], opts: { hookDone?: boolean } = {}): ITap[] {
  const hooks = taps.filter(t => t.hook);
  const queued = opts.hookDone ? taps.filter(t => !t.hook) : [...taps];
  const byTopic = new Map<string, ITap[]>();
  for (const t of queued) byTopic.set(topicOf(t), [...(byTopic.get(topicOf(t)) ?? []), t]);
  const queues = new Map([...byTopic].map(([topic, list]) => [topic, sawtoothOrder(list)]));
  const lastSeen = new Map([...byTopic.keys()].map(topic => [topic, -1]));
  const out: ITap[] = [];
  while (out.length < queued.length) {
    const lastTopic = out.length ? topicOf(out[out.length - 1]) : null;
    const tail = out.slice(-MAX_SAME_TOPIC_IN_A_ROW);
    const full = tail.length === MAX_SAME_TOPIC_IN_A_ROW && tail.every(t => topicOf(t) === lastTopic);
    const open = [...queues.entries()].filter(([, q]) => q.length > 0);
    const allowed = open.filter(([k]) => !(full && k === lastTopic));
    const pool = allowed.length ? allowed : open;
    const sorted = pool.sort((a, b) => b[1].length - a[1].length || lastSeen.get(a[0])! - lastSeen.get(b[0])!);
    // Nunca 3 difíciles seguidos: tras dos difíciles se prefiere la categoría (en el mismo orden) cuyo siguiente Tap no lo sea.
    // Con cuatro categorías el diente de sierra de cada una ya no bastaba para evitarlo.
    const dosDificiles = out.length >= 2 && out.slice(-2).every(t => t.level === 'dificil');
    const [topic, queue] = (dosDificiles && sorted.find(([, q]) => q[0].level !== 'dificil')) || sorted[0];
    out.push(queue.shift()!);
    lastSeen.set(topic, out.length);
  }
  return opts.hookDone ? [...out, ...hooks] : out;
}

/**
 * Orden del feed:
 * 1. El Tap del enlace (`?t=`) va primero.
 * 2. Con `?tema=` van primero los Taps de esa categoría (el resto sigue después: el feed nunca se acaba de golpe).
 * 3. Alguien nuevo empieza por un Tap de gancho (el de la categoría con más Taps); quien ya jugó uno los encuentra al final.
 * 4. Los Taps `soloEnlace` (historias de prueba) no entran al feed salvo que sean el del enlace.
 * 5. «Para ti» alterna categorías y sube y baja la dificultad (ver `mixFeed`).
 */
export function orderFeed(all: readonly ITap[], opts: { first?: string | null; topic?: string | null; hookDone?: boolean }): ITap[] {
  const taps = all.filter(t => !t.soloEnlace || t.id === opts.first);        // un Tap «solo enlace» solo sale si es el del enlace
  const mix = { hookDone: opts.hookDone };
  let list: ITap[];
  if (opts.topic && taps.some(t => topicOf(t) === opts.topic)) {
    const mine = taps.filter(t => topicOf(t) === opts.topic), others = taps.filter(t => topicOf(t) !== opts.topic);
    list = [...mixFeed(mine, mix), ...mixFeed(others, mix)];
  } else {
    list = mixFeed(taps, mix);
  }
  return taps.some(t => t.id === opts.first) ? orderTaps(list, opts.first) : list;
}

/**
 * Categorías del selector: primero las que tienen Taps (en el orden del catálogo; una categoría nueva aparece sola al
 * agregar un Tap con ese `topic`, aunque no esté en el catálogo), luego las del catálogo sin Taps, marcadas como pronto.
 */
export function feedTopics(all: readonly ITap[], catalog: readonly ITapTopic[]): { topic: ITapTopic; count: number; soon: boolean }[] {
  const taps = all.filter(t => !t.soloEnlace);
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
    if (!esPaso(q) && (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)) at(`pregunta ${i + 1}: la respuesta no es una opción`);
    if (!q.q.trim() || (!esPaso(q) && !q.why.trim())) at(`pregunta ${i + 1}: falta enunciado o explicación`);
    if (q.q.length > TAP_LIMITS.question) at(`pregunta ${i + 1}: el enunciado pasa de ${TAP_LIMITS.question} caracteres`);
    if (!esPaso(q) && q.why.length > TAP_LIMITS.why) at(`pregunta ${i + 1}: la explicación pasa de ${TAP_LIMITS.why} caracteres`);
    if (q.options.some(o => o.length > TAP_LIMITS.option)) at(`pregunta ${i + 1}: una opción pasa de ${TAP_LIMITS.option} caracteres`);
    if (q.tipo !== undefined && !['clasica', 'duo', 'vf', 'paso'].includes(q.tipo)) at(`pregunta ${i + 1}: tipo «${q.tipo}» desconocido`);
    if ((q.tipo === 'duo' || q.tipo === 'vf') && q.options.length !== 2) at(`pregunta ${i + 1}: el formato ${q.tipo} lleva exactamente 2 opciones`);
    if (esPaso(q)) {
      if (tap.tipo !== 'historia') at(`pregunta ${i + 1}: un paso solo cabe en un Tap de historia`);
      if (q.options.length > 3) at(`pregunta ${i + 1}: un paso lleva 2 o 3 decisiones`);
      if (q.consecuencias?.length !== q.options.length || q.consecuencias.some(c => !c.trim() || c.length > TAP_LIMITS.why)) at(`pregunta ${i + 1}: cada decisión lleva su consecuencia (hasta ${TAP_LIMITS.why} caracteres)`);
    } else if (q.consecuencias) at(`pregunta ${i + 1}: solo un paso lleva consecuencias`);
    if (q.tipo === 'vf' && (q.options[0] !== 'Verdadero' || q.options[1] !== 'Falso')) at(`pregunta ${i + 1}: verdadero/falso lleva las opciones «Verdadero» y «Falso»`);
  });
  if (tap.tipo !== undefined && !['quiz', 'historia'].includes(tap.tipo)) at(`tipo «${tap.tipo}» desconocido`);
  if (tap.tipo === 'historia') {
    const pasos = tap.questions.filter(esPaso).length;
    if (pasos < 3 || pasos > 5) at('una historia lleva de 3 a 5 pasos');
    if (puntuables(tap) !== 1 || esPaso(tap.questions[tap.questions.length - 1])) at('una historia termina con una única pregunta de selección');
    if (tap.questions.some((q, i) => i < pasos && !esPaso(q))) at('los pasos van antes de la pregunta final');
  }
  if (tap.results.length === 0) at('sin resultados');
  else {
    const mins = tap.results.map(r => r.min);
    if (Math.min(...mins) !== 0) at('algún resultado debe empezar en 0 aciertos');
    if (new Set(mins).size !== mins.length) at('resultados con el mismo mínimo');
    if (Math.max(...mins) > puntuables(tap)) at('un resultado pide más aciertos que preguntas');
  }
  return errors;
}
