import { ITap, ITapEscena, ITapRun, ITapScene } from './taps.types';

/**
 * Lado de la pantalla donde va el objeto que explica: el contrario al personaje según el encuadre del Tap
 * (`shot` del generador). Con el personaje centrado va a la izquierda: el riel de la derecha se oculta mientras se ve,
 * pero el pulgar derecho suele estar sobre «Seguir». El motor corre al personaje hacia el otro lado para hacerle espacio.
 */
export function visualSide(scene: Pick<ITapScene, 'shot'>): 'izq' | 'der' {
  return /izquierda/.test(scene.shot ?? '') ? 'der' : 'izq';
}

/**
 * Escena de la pregunta a la vista (código, operación, serie, objeto o diagrama), o null. Se ve mientras se piensa y tras
 * acertar; tras fallar le cede el sitio al objeto que explica (si la pregunta lo trae). Solo con escenario (el motor la dibuja).
 */
export function questionEscena(tap: ITap, run: ITapRun, stageReady: boolean, visualShown: boolean): ITapEscena | null {
  if (!stageReady || run.finished || visualShown) return null;
  return tap.questions[run.index]?.escena ?? null;
}

/** Número estable de un Tap (FNV-1a): ordena sus cambios de plano entre preguntas sin azar (servidor y navegador iguales). */
export function planoSeed(tapId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < tapId.length; i++) { h ^= tapId.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % 997;
}
