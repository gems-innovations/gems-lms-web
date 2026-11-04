import { InjectionToken } from '@angular/core';

/** Un Tap del banco tal como lo elige el profesor en el editor del curso. */
export interface ITapResumen { id: string; title: string; topic: string }

/** Pregunta que escribe el profesor para su propio Tap (misma forma que la pregunta de una carta). */
export interface ITapPreguntaCurso { question: string; options: string[]; answer: number; why: string }

/**
 * Puente entre los cursos y el motor de Taps, que vive en la app principal (las librerías no pueden importarla).
 * La app lo registra en su configuración y carga el banco y el motor solo cuando se usan.
 */
export interface ITapsEnCurso {
  catalogo(): Promise<ITapResumen[]>;
  /**
   * Abre el Tap a pantalla completa en `/t/<id>`. Con `preguntas`, arma un Tap propio con el escenario y el personaje de
   * `tapId`; `clave` (el id del bloque) le da un id estable. Devuelve false si el Tap ya no existe.
   */
  jugar(tapId: string, titulo: string, preguntas: ITapPreguntaCurso[] | undefined, clave: string): Promise<boolean>;
}

export const TAPS_EN_CURSO = new InjectionToken<ITapsEnCurso>('TAPS_EN_CURSO');
