import { ITap } from './taps.types';
import { topicOf } from './taps.logic';

const plano = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Descripción corta del Tap (la del banco o, sin ella, categoría · subtema · número de preguntas). */
export function tapDescripcion(tap: ITap): string {
  return tap.descripcion ?? [tap.kicker, tap.subtopic, `${tap.questions.length} preguntas`].filter(Boolean).join(' · ');
}

/**
 * Busca Taps por título, categoría, subtema, descripción o texto de sus preguntas (sin tildes ni mayúsculas; cada palabra
 * debe aparecer). El título pesa más que el resto. Los Taps «solo enlace» no entran: no se ofrecen en el feed.
 */
export function buscarTaps(taps: readonly ITap[], consulta: string, max = 8): ITap[] {
  const palabras = plano(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return taps
    .filter(t => !t.soloEnlace)
    .map(t => {
      const titulo = plano(t.title), resto = plano([tapDescripcion(t), topicOf(t), ...t.questions.map(q => q.q)].join(' '));
      if (!palabras.every(p => titulo.includes(p) || resto.includes(p))) return null;
      return { t, peso: palabras.filter(p => titulo.includes(p)).length };
    })
    .filter((x): x is { t: ITap; peso: number } => !!x)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, max)
    .map(x => x.t);
}
