import { IInterest, streakDays, topicProgress } from './taps.interest';
import { resultFor, streak, topicOf } from './taps.logic';
import { ITap, ITapRun } from './taps.types';

/**
 * Panel contextual de escritorio (escritorio.md §7): hasta 3 tarjetas que cambian según el momento del Tap.
 * Solo se calcula lo que el cliente sabe de verdad (avance, racha local, siguiente Tap, explicación ampliada si el banco la
 * trae). Lo que depende del servidor (ranking en vivo, «así respondieron hoy», percentil) NO se inventa: no hay tarjeta.
 */
export type TPanelState = 'pregunta' | 'acierto' | 'fallo' | 'resultado';

export interface IPanelCard {
  id: 'racha' | 'avance' | 'siguiente' | 'por-que' | 'este-tap';
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
  const left = tap.questions.length - (run.index + (run.chosen !== null ? 1 : 0)), need = target.min - run.score;
  if (need > left || need > 2) return null;                          // solo si de verdad está cerca
  return `${need === 1 ? '1 acierto más' : need + ' aciertos más'} y eres «${target.title}»`;
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

const avanceCard = (c: IPanelContext, taps: readonly ITap[]): IPanelCard => {
  const p = topicProgress(taps, c.interest, topicOf(c.tap));
  return { id: 'avance', title: `Tu avance en ${c.topicName}`, big: `${p.done} de ${p.total}`, body: p.done === 0 ? 'Termina un Tap para empezar.' : 'Taps completados.',
    ring: { ...p, color: c.topicColor }, note: 'Solo en este navegador' };
};

/** Las tarjetas del panel para el momento actual (3 como máximo; una sola con llamada a la acción). */
export function panelCards(c: IPanelContext, taps: readonly ITap[]): IPanelCard[] {
  const state = panelState(c.run), q = c.tap.questions[c.run.index];
  const thisTap = (): IPanelCard => {
    const run = c.run, row = streak(run);
    const bits = [`${run.score} de ${c.tap.questions.length} aciertos`, row >= 2 ? `x${row} seguidas` : null, almostThere(c.tap, run)];
    return { id: 'este-tap', title: 'Este Tap', big: `${run.score} de ${c.tap.questions.length}`, body: bits.slice(1).filter(Boolean).join(' · ') || 'Sigue, ya casi.' };
  };
  let cards: IPanelCard[];
  switch (state) {
    case 'pregunta': cards = [streakCard(c.interest, c.now), avanceCard(c, taps), ...nextCard(c.next, false)]; break;
    case 'fallo': cards = [
      ...(q?.more ? [{ id: 'por-que', title: 'Por qué', body: q.more } as IPanelCard] : []),
      thisTap(), ...nextCard(c.next, false)]; break;
    case 'acierto': cards = [thisTap(), ...nextCard(c.next, false)]; break;
    default: cards = [avanceCard(c, taps), streakCard(c.interest, c.now), ...nextCard(c.next, true)];
  }
  return cards.slice(0, MAX_PANEL_CARDS);
}
