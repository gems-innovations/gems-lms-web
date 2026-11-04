import type { ITapPreguntaCurso, ITapResumen } from 'shared/core';
import { TAPS, TAP_TOPICS, findTap } from './taps.data';
import { ITap } from './taps.types';

/** Taps que un profesor puede poner en una lección: los de quiz del banco (las historias no puntúan). */
export function catalogoCurso(): ITapResumen[] {
  return TAPS.filter(t => t.tipo !== 'historia' && !t.id.startsWith('curso-')).map(t => ({
    id: t.id, title: t.title, topic: TAP_TOPICS.find(x => x.id === (t.topic ?? t.theme))?.name ?? t.theme,
  }));
}

/**
 * Tap propio del profesor: el escenario, el personaje y los títulos de `base` con sus 5 preguntas. Va «solo enlace» (nunca
 * entra al feed ni a las colecciones) y su id (`curso-<bloque>`) cumple el formato que la API acepta para ranking y comentarios.
 */
export function tapDeCurso(base: ITap, titulo: string, preguntas: ITapPreguntaCurso[], clave: string): ITap {
  const id = `curso-${clave.toLowerCase().replace(/[^a-z0-9-]/g, '')}`.slice(0, 60);
  return {
    ...base, id, title: titulo, soloEnlace: true, hook: false,
    questions: preguntas.map((p, i) => ({ id: `${id}-${i + 1}`, q: p.question, options: [...p.options], answer: p.answer, why: p.why })),
  };
}

/**
 * Deja el Tap listo para `/t/<id>` y devuelve su id (null si el Tap base ya no está en el banco).
 * shortcut: el Tap propio vive en memoria; si el estudiante recarga `/t/curso-…`, el feed avisa que no existe y sigue con
 * otro. Cuando el Estudio de Taps (producto/taps/creador.md) publique Taps en la API, el bloque guardará su `tapId` y esto sobra.
 */
export function prepararTap(tapId: string, titulo: string, preguntas: ITapPreguntaCurso[] | undefined, clave: string): string | null {
  const base = findTap(tapId);
  if (!base) return null;
  if (!preguntas?.length) return base.id;
  const propio = tapDeCurso(base, titulo, preguntas, clave);
  const i = TAPS.findIndex(t => t.id === propio.id);
  if (i >= 0) TAPS.splice(i, 1, propio); else TAPS.push(propio);        // el profesor pudo editarlo desde la última vez
  return propio.id;
}
