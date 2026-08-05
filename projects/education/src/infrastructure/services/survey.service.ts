import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  ICourseSurvey, ISurveyResponse, ISurveySection,
} from '../../domain/model/survey.model';

const section = (id: string, title: string, description: string, qs: [string, string, 'scale' | 'text'][]): ISurveySection => ({
  id, title, description,
  questions: qs.map(([qid, label, type]) => ({ id: qid, label, type })),
});

// ── Encuestas sembradas (mock) ───────────────────────────────────────────────
const SURVEYS: ICourseSurvey[] = [
  {
    id: 'sv-c1',
    courseId: 'c1',
    title: 'Encuesta de retroalimentación del curso',
    description: 'Tu opinión nos ayuda a mejorar el curso. Responde con sinceridad.',
    isPublished: true,
    sections: [
      section('sec1', 'Contenido del curso', 'Sobre los materiales y temas tratados.', [
        ['q1', '¿Qué tan claro fue el contenido?', 'scale'],
        ['q2', '¿Qué tan útiles fueron los ejemplos y ejercicios?', 'scale'],
        ['q3', '¿Qué tan adecuado fue el nivel de dificultad?', 'scale'],
      ]),
      section('sec2', 'Acompañamiento del instructor', 'Sobre la guía y retroalimentación recibida.', [
        ['q4', '¿Qué tan oportuna fue la retroalimentación?', 'scale'],
        ['q5', '¿Qué tan claras fueron las explicaciones?', 'scale'],
      ]),
      section('sec3', 'Comentarios', 'Cuéntanos lo que quieras.', [
        ['q6', '¿Tienes alguna recomendación para mejorar el curso?', 'text'],
      ]),
    ],
  },
  {
    id: 'sv-c2',
    courseId: 'c2',
    title: 'Encuesta de retroalimentación del curso',
    description: 'Tu opinión nos ayuda a mejorar el curso. Responde con sinceridad.',
    isPublished: true,
    sections: [
      section('s1', 'Contenido', 'Sobre el material del curso.', [
        ['c2q1', '¿Qué tan claro fue el contenido?', 'scale'],
        ['c2q2', '¿Qué tan prácticos fueron los proyectos?', 'scale'],
      ]),
      section('s2', 'Comentarios', '', [
        ['c2q3', '¿Qué mejorarías del curso?', 'text'],
      ]),
    ],
  },
  {
    id: 'sv-cdone',
    courseId: 'c-done',
    title: 'Encuesta de retroalimentación del curso',
    description: 'Completaste el curso. Cuéntanos tu experiencia.',
    isPublished: true,
    sections: [
      section('d1', 'Tu experiencia', 'Sobre el curso en general.', [
        ['dq1', '¿Qué tan satisfecho quedaste con el curso?', 'scale'],
        ['dq2', '¿Recomendarías este curso a otros?', 'scale'],
      ]),
      section('d2', 'Comentarios', '', [
        ['dq3', '¿Algún comentario o sugerencia?', 'text'],
      ]),
    ],
  },
];

const RESPONSES: ISurveyResponse[] = [
  {
    id: 'r1', surveyId: 'sv-c1', courseId: 'c1', studentId: 'u1', studentName: 'Ana García',
    submittedAt: new Date('2025-05-20'),
    answers: [
      { questionId: 'q1', value: 9 }, { questionId: 'q2', value: 10 }, { questionId: 'q3', value: 8 },
      { questionId: 'q4', value: 9 }, { questionId: 'q5', value: 9 },
      { questionId: 'q6', value: 'Me encantaría más ejercicios prácticos al final de cada módulo.' },
    ],
  },
  {
    id: 'r2', surveyId: 'sv-c1', courseId: 'c1', studentId: 'u8', studentName: 'Diego Ramírez',
    submittedAt: new Date('2025-05-21'),
    answers: [
      { questionId: 'q1', value: 7 }, { questionId: 'q2', value: 8 }, { questionId: 'q3', value: 6 },
      { questionId: 'q4', value: 8 }, { questionId: 'q5', value: 7 },
      { questionId: 'q6', value: 'Algunos videos van un poco rápido, pero en general muy bueno.' },
    ],
  },
  {
    id: 'r3', surveyId: 'sv-c1', courseId: 'c1', studentId: 'u3', studentName: 'María Martínez',
    submittedAt: new Date('2025-05-22'),
    answers: [
      { questionId: 'q1', value: 10 }, { questionId: 'q2', value: 9 }, { questionId: 'q3', value: 9 },
      { questionId: 'q4', value: 10 }, { questionId: 'q5', value: 10 },
      { questionId: 'q6', value: '' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class SurveyService {
  getSurvey(courseId: string): Observable<ICourseSurvey | null> {
    return of(SURVEYS.find(s => s.courseId === courseId) ?? null).pipe(delay(200));
  }

  saveSurvey(survey: ICourseSurvey): Observable<ICourseSurvey> {
    const idx = SURVEYS.findIndex(s => s.id === survey.id);
    if (idx >= 0) SURVEYS[idx] = { ...survey };
    else SURVEYS.push({ ...survey });
    return of({ ...survey }).pipe(delay(300));
  }

  publishSurvey(courseId: string, isPublished: boolean): Observable<ICourseSurvey | null> {
    const s = SURVEYS.find(x => x.courseId === courseId);
    if (s) s.isPublished = isPublished;
    return of(s ?? null).pipe(delay(200));
  }

  getResponses(courseId: string): Observable<ISurveyResponse[]> {
    return of(RESPONSES.filter(r => r.courseId === courseId)).pipe(delay(250));
  }

  submitResponse(response: ISurveyResponse): Observable<ISurveyResponse> {
    RESPONSES.push(response);
    return of(response).pipe(delay(400));
  }
}
