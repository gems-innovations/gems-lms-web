import { ICard, ICardQuestion } from '../domain/model/course.model';

export type TCardKind = ICard['kind'];

export const CARD_KIND_LABELS: Record<TCardKind, string> = {
  idea: 'Idea',
  question: 'Pregunta',
  steps: 'Pasos animados',
  image: 'Imagen',
};

/** Carta en blanco de cada tipo, lista para que el profesor la rellene. */
export function emptyCard(kind: TCardKind): ICard {
  switch (kind) {
    case 'idea': return { kind, label: 'Idea', title: '', text: '' };
    case 'question': return { kind, label: 'Pruébalo', question: '', options: ['', ''], answer: 0, why: '' };
    case 'steps': return { kind, label: 'Paso a paso', title: '', steps: ['', ''] };
    case 'image': return { kind, label: 'Mira', title: '', url: '', alt: '' };
  }
}

/** Primer problema de una carta (en español, para mostrarlo al profesor) o null si está lista. */
export function cardProblem(c: ICard): string | null {
  switch (c.kind) {
    case 'idea': return !c.title.trim() || !c.text.trim() ? 'Escribe el título y el texto.' : null;
    case 'question': {
      const filled = c.options.filter(o => o.trim());
      if (!c.question.trim()) return 'Escribe la pregunta.';
      if (filled.length < 2) return 'Pon al menos dos opciones.';
      if (!c.options[c.answer]?.trim()) return 'Marca como correcta una opción que tenga texto.';
      if (!c.why.trim()) return 'Explica por qué es la respuesta.';
      return null;
    }
    case 'steps': return !c.title.trim() || c.steps.filter(s => s.trim()).length < 2 ? 'Escribe un título y al menos dos pasos.' : null;
    case 'image': return !c.title.trim() || !/^https:\/\//i.test(c.url.trim()) || !c.alt.trim() ? 'Pon título, un enlace https de la imagen y su descripción.' : null;
  }
}

/** Quita opciones/pasos vacíos y reajusta la respuesta correcta; así se guarda lo que el profesor realmente escribió. */
export function cleanCard(c: ICard): ICard {
  if (c.kind === 'question') {
    const keep = c.options.map((o, i) => ({ o: o.trim(), i })).filter(x => x.o);
    return { ...c, question: c.question.trim(), options: keep.map(x => x.o), answer: Math.max(0, keep.findIndex(x => x.i === c.answer)), why: c.why.trim() };
  }
  if (c.kind === 'steps') return { ...c, steps: c.steps.map(s => s.trim()).filter(Boolean) };
  return c;
}

/** Límites del formato Tap (los mismos que el generador del banco, projects/main/scripts/generar-taps.mjs). */
export const TAP_LIMITS = { questions: 5, options: 4, question: 120, option: 22, why: 90 } as const;

export const emptyTapQuestion = (): ICardQuestion => ({ kind: 'question', label: '', question: '', options: ['', '', '', ''], answer: 0, why: '' });

/** Lo que le falta a una pregunta de un Tap propio para caber en el formato Tap, o null si está lista. */
export function tapQuestionProblem(c: ICardQuestion): string | null {
  const L = TAP_LIMITS;
  if (!c.question.trim()) return 'Escribe la pregunta.';
  if (c.question.trim().length > L.question) return `La pregunta pasa de ${L.question} caracteres.`;
  if (c.options.length !== L.options || c.options.some(o => !o.trim())) return `Escribe las ${L.options} opciones.`;
  if (c.options.some(o => o.trim().length > L.option)) return `Cada opción tiene como mucho ${L.option} caracteres.`;
  if (!c.why.trim()) return 'Explica por qué es la respuesta.';
  if (c.why.trim().length > L.why) return `La explicación pasa de ${L.why} caracteres.`;
  return null;
}

export const cardQuestions =(cards: readonly ICard[]): ICardQuestion[] => cards.filter((c): c is ICardQuestion => c.kind === 'question');

/** Minutos estimados: ~40 s por carta, mínimo 1. */
export const estimateMinutes = (cards: readonly ICard[]): number => Math.max(1, Math.round(cards.length * 40 / 60));
