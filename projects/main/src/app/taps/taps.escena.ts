import { ITapScene } from './taps.types';

/**
 * Lado de la pantalla donde va el objeto que explica: el contrario al personaje según el encuadre del Tap
 * (`shot` del generador). Con el personaje centrado va a la izquierda: el riel de la derecha se oculta mientras se ve,
 * pero el pulgar derecho suele estar sobre «Seguir». El motor corre al personaje hacia el otro lado para hacerle espacio.
 */
export function visualSide(scene: Pick<ITapScene, 'shot'>): 'izq' | 'der' {
  return /izquierda/.test(scene.shot ?? '') ? 'der' : 'izq';
}
