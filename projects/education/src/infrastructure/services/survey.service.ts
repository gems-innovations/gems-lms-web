import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, map, catchError, throwError, forkJoin, switchMap } from 'rxjs';
import { environment } from 'shared';
import {
  ICourseSurvey, ISurveyAnswer, ISurveyResponse, ISurveySection,
} from '../../domain/model/survey.model';
import { EnrollmentService } from './enrollment.service';

// ── API contract (ms-education) ───────────────────────────────────────────────

interface ISurveyApi {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  sections: ISurveySection[];
  isPublished: boolean;
}

interface ISurveyResponseApi {
  id: number;
  surveyId: number;
  courseId: number;
  studentId: number;
  answers: ISurveyAnswer[];
  submittedAt: string;
}

function mapSurvey(r: ISurveyApi): ICourseSurvey {
  return {
    id: String(r.id),
    courseId: String(r.courseId),
    title: r.title,
    description: r.description ?? undefined,
    sections: r.sections ?? [],
    isPublished: r.isPublished,
  };
}

/** A course survey that does not exist yet (or is not visible) comes back as 404: that is "no survey". */
function noneOn404<T>(err: unknown): Observable<T | null> {
  return err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err);
}

/** Course feedback surveys: one per course, edited by staff and answered by enrolled students. */
@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly http = inject(HttpClient);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly coursesUrl = environment.apiUrls.education.courses;

  getSurvey(courseId: string): Observable<ICourseSurvey | null> {
    return this.http.get<ISurveyApi>(`${this.coursesUrl}/${courseId}/survey`).pipe(
      map(mapSurvey),
      catchError(err => noneOn404<ICourseSurvey>(err))
    );
  }

  saveSurvey(survey: ICourseSurvey): Observable<ICourseSurvey> {
    return this.http.put<ISurveyApi>(`${this.coursesUrl}/${survey.courseId}/survey`, {
      title: survey.title,
      description: survey.description ?? null,
      sections: survey.sections,
      isPublished: survey.isPublished,
    }).pipe(map(mapSurvey));
  }

  publishSurvey(courseId: string, isPublished: boolean): Observable<ICourseSurvey | null> {
    return this.getSurvey(courseId).pipe(
      switchMap(current => current ? this.saveSurvey({ ...current, isPublished }) : of(null))
    );
  }

  /** Every response of the course, with the student's name from the institution's people. */
  getResponses(courseId: string): Observable<ISurveyResponse[]> {
    return forkJoin({
      responses: this.http.get<ISurveyResponseApi[]>(`${this.coursesUrl}/${courseId}/survey/responses`),
      students: this.enrollmentService.getStudents().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ responses, students }) => {
        const names = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
        return responses.map(r => ({
          id: String(r.id),
          surveyId: String(r.surveyId),
          courseId: String(r.courseId),
          studentId: String(r.studentId),
          studentName: names.get(String(r.studentId)) ?? 'Estudiante',
          answers: r.answers ?? [],
          submittedAt: new Date(r.submittedAt),
        }));
      })
    );
  }

  /** Sends the signed-in student's answers (answering again replaces them). */
  submitResponse(response: ISurveyResponse): Observable<ISurveyResponse> {
    return this.http.post<ISurveyResponseApi>(`${this.coursesUrl}/${response.courseId}/survey/responses`, {
      answers: response.answers,
    }).pipe(map(r => ({ ...response, id: String(r.id), submittedAt: new Date(r.submittedAt) })));
  }
}
