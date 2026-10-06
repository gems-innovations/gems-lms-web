import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from 'shared';
import type { IQuestion } from '../../domain/model/course.model';

/**
 * An attempt started on the server: the questions of this attempt (drawn, ordered and without
 * answer keys) and, for timed quizzes, how many seconds are left by the server clock.
 */
export interface IQuizSession {
  sessionId: string;
  questions: IQuestion[];
  /** null when the quiz has no time limit. */
  remainingSeconds: number | null;
}

interface IQuizSessionApi {
  sessionId: number;
  questions: IQuestion[];
  startedAt: string;
  expiresAt: string | null;
  serverTime: string;
}

@Injectable({ providedIn: 'root' })
export class QuizSessionService {
  private readonly http = inject(HttpClient);
  private readonly coursesUrl = environment.apiUrls.education.courses;

  /** Starts the attempt, or resumes the open one (same questions and deadline). */
  start(courseId: string, blockId: string): Observable<IQuizSession> {
    return this.http.post<IQuizSessionApi>(`${this.coursesUrl}/${courseId}/blocks/${blockId}/attempts/start`, {}).pipe(
      map(s => ({
        sessionId: String(s.sessionId),
        questions: s.questions,
        remainingSeconds: s.expiresAt
          ? Math.max(0, Math.floor((Date.parse(s.expiresAt) - Date.parse(s.serverTime)) / 1000))
          : null,
      })),
      catchError(err => throwError(() => new Error(startError(err)))),
    );
  }
}

function startError(err: unknown): string {
  const code = err instanceof HttpErrorResponse ? err.error?.code : undefined;
  switch (code) {
    case 'NOT_ENROLLED': return 'No estás matriculado en este curso';
    case 'ATTEMPT_LIMIT_REACHED': return 'Ya usaste todos los intentos de este quiz';
    case 'PERIOD_CLOSED': return 'El período académico de este curso ya cerró';
    case 'BLOCK_NOT_FOUND': return 'Este contenido ya no existe. Recarga el curso.';
    default: return 'No se pudo iniciar la evaluación. Intenta de nuevo.';
  }
}
