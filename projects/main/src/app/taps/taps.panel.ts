import { IInterest, streakDays, topicProgress } from './taps.interest';
import { esPaso, puntuables, respuestasPuntuables, resultFor, streak, topicOf } from './taps.logic';
import { IPartidaRespuesta, frasePuesto, numero } from './taps.ranking';
import { ITap, ITapRun } from './taps.types';

/**
 * Panel contextual de escritorio (escritorio.md §7): hasta 3 tarjetas que cambian según el momento del Tap.
 * Solo se calcula lo que el cliente sabe de verdad (avance, racha local, siguiente Tap, explicación ampliada si el banco la
 * trae). Lo que depende del servidor solo aparece con su respuesta real: la tarjeta «Ranking semanal» del resultado sale si el API
 * devolvió la partida; «así respondieron hoy» aún no existe. Nada se inventa: sin datos, no hay tarjeta.
 */
export type TPanelState = 'pregunta' | 'acierto' | 'fallo' | 'resultado';

export interface IPanelCard {
  id: 'racha' | 'avance' | 'siguiente' | 'por-que' | 'este-tap' | 'ranking';
  title: string;
  /** Cifra grande de la tarjeta (p. ej. «5 días»). */
  big?: string;
  body?: string;
  /** Pie pequeño («Solo en este navegador»). */
  note?: string;
  /** Anillo de avance de un tema. */
  ring?: { done: number; total: number; color: string };
  /** Siguiente Tap (póster con su degradado). */
  next?: { id: string; title: string; kicker: string; backdrop: [string, string] };
  /** Única llamada a la acción principal del panel. */
  cta?: { label: string; action: 'next' };
  /** Enlace secundario (no compite con la llamada principal). */
  link?: { label: string; action: 'ranking' };
}

export const MAX_PANEL_CARDS = 3;

export interface IPanelContext {
  tap: ITap;
  run: ITapRun;
  next: ITap | null;
  interest: IInterest;
  now: number;
  topicName: string;
  topicColor: string;
  /** Respuesta del API a la partida recién terminada (null o ausente: no hay tarjeta de ranking). */
  partida?: IPartidaRespuesta | null;
}

export function panelState(run: ITapRun): TPanelState {
  if (run.finished) return 'resultado';
  if (run.chosen === null) return 'pregunta';
  return run.answers[run.answers.length - 1] ? 'acierto' : 'fallo';
}

/** «2 más y eres Crack…»: lo que falta para el siguiente título si aún se puede alcanzar con las preguntas que quedan. */
export function almostThere(tap: ITap, run: ITapRun): string | null {
  const sorted = [...tap.results].sort((a, b) => a.min - b.min), current = resultFor(tap, run.score);
  const target = sorted.find(r => r.min > run.score && r.min > current.min);
  if (!target) return null;
  const left = puntuables(tap) - respuestasPuntuables(tap, run.answers).length, need = target.min - run.score;
  if (need > left || need > 2) return null;                          // solo si de verdad está cerca
  return `${need === 1 ? '1 acierto más' : need + ' aciertos más'} y eres «${target.title}»`;
}

/**
 * «Casi» honesto del resultado (mejora 6): con 60 % o más de aciertos y a 1 solo acierto del siguiente título, la revancha
 * pasa al frente («Revancha: te falta 1 para "Leyenda del servidor"»). Con 5/5, con 0-2 de 5 o si faltan 2 o más, null.
 */
export function rematchGoal(tap: ITap, score: number): { title: string } | null {
  const total = puntuables(tap);
  if (score >= total || score * 5 < total * 3) return null;
  const target = [...tap.results].sort((a, b) => a.min - b.min).find(r => r.min > score);
  if (!target || target.min - score !== 1 || target.min > total) return null;
  return { title: target.title };
}

const streakCard = (interest: IInterest, now: number): IPanelCard => {
  const { count, today } = streakDays(interest.days, now);
  const big = count === 0 ? '0 días' : count === 1 ? '1 día' : `${count} días`;
  const body = count === 0 ? 'Juega 1 Tap y enciendes tu racha.' : today ? 'Hoy ya cuenta.' : 'Hoy te falta 1 Tap para mantenerla.';
  return { id: 'racha', title: 'Tu racha', big, body, note: 'Solo en este navegador' };
};

const nextCard = (next: ITap | null, primary: boolean): IPanelCard[] => next
  ? [{ id: 'siguiente', title: 'Después de este', next: { id: next.id, title: next.title, kicker: next.kicker, backdrop: next.backdrop },
      cta: primary ? { label: 'Jugar el siguiente', action: 'next' } : undefined }]
  : [];

/** Ranking semanal tras el resultado: solo con la respuesta real del API. Amplía el resultado con tu XP de la semana. */
const rankingCard = (p: IPartidaRespuesta): IPanelCard => ({
  id: 'ranking', title: 'Ranking semanal', big: frasePuesto(p.semana.puesto, p.semana.jugadores, '') ?? undefined,
  body: `Llevas ${numero(p.semana.xp)} XP esta semana.`, link: { label: 'Ver ranking', action: 'ranking' },
});

const avanceCard = (c: IPanelContext, taps: readonly ITap[]): IPanelCard => {
  const p = topicProgress(taps, c.interest, topicOf(c.tap));
  return { id: 'avance', title: `Tu avance en ${c.topicName}`, big: `${p.done} de ${p.total}`, body: p.done === 0 ? 'Termina un Tap para empezar.' : 'Taps completados.',
    ring: { ...p, color: c.topicColor }, note: 'Solo en este navegador' };
};

/** Las tarjetas del panel para el momento actual (3 como máximo; una sola con llamada a la acción). */
export function panelCards(c: IPanelContext, taps: readonly ITap[]): IPanelCard[] {
  const q = c.tap.questions[c.run.index], state = esPaso(q) && !c.run.finished ? 'pregunta' : panelState(c.run);   // un paso no es acierto ni fallo
  const thisTap = (): IPanelCard => {
    const run = c.run, row = streak({ ...run, answers: respuestasPuntuables(c.tap, run.answers) });
    const bits = [`${run.score} de ${puntuables(c.tap)} aciertos`, row >= 2 ? `x${row} seguidas` : null, almostThere(c.tap, run)];
    return { id: 'este-tap', title: 'Este Tap', big: `${run.score} de ${puntuables(c.tap)}`, body: bits.slice(1).filter(Boolean).join(' · ') || 'Sigue, ya casi.' };
  };
  let cards: IPanelCard[];
  switch (state) {
    case 'pregunta': cards = [streakCard(c.interest, c.now), avanceCard(c, taps), ...nextCard(c.next, false)]; break;
    case 'fallo': cards = [
      ...(q?.more ? [{ id: 'por-que', title: 'Por qué', body: q.more } as IPanelCard] : []),
      thisTap(), ...nextCard(c.next, false)]; break;
    case 'acierto': cards = [thisTap(), ...nextCard(c.next, false)]; break;
    default: cards = c.partida
      ? [rankingCard(c.partida), avanceCard(c, taps), ...nextCard(c.next, true)]
      : [avanceCard(c, taps), streakCard(c.interest, c.now), ...nextCard(c.next, true)];
  }
  return cards.slice(0, MAX_PANEL_CARDS);
}
