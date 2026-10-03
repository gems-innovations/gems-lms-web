import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';
import type { IGradebook, TGradebookCellState, TGradebookItemType } from '../../domain/model/gradebook.model';

interface IGradebookApi {
  courseId: number;
  items: { blockId: number; lessonId: number | null; type: string; title: string; weight: number }[];
  rows: {
    studentId: number;
    enrollmentId: number;
    enrollmentStatus: string;
    cells: { blockId: number; score: number | null; state: string; attempts: number; submissionId: number | null }[];
    currentGrade: number | null;
    finalGrade: number | null;
  }[];
}

function mapGradebook(g: IGradebookApi): IGradebook {
  return {
    courseId: String(g.courseId),
    items: g.items.map(i => ({
      blockId: String(i.blockId),
      lessonId: i.lessonId != null ? String(i.lessonId) : '',
      type: i.type as TGradebookItemType,
      title: i.title,
      weight: i.weight,
    })),
    rows: g.rows.map(r => ({
      studentId: String(r.studentId),
      enrollmentId: String(r.enrollmentId),
      enrollmentStatus: r.enrollmentStatus,
      cells: r.cells.map(c => ({
        blockId: String(c.blockId),
        score: c.score,
        state: c.state as TGradebookCellState,
        attempts: c.attempts,
        submissionId: c.submissionId != null ? String(c.submissionId) : undefined,
      })),
      currentGrade: r.currentGrade,
      finalGrade: r.finalGrade,
    })),
  };
}

/** Course gradebook: weighted grades computed by the API. */
@Injectable({ providedIn: 'root' })
export class GradebookService {
  private readonly http = inject(HttpClient);
  private readonly coursesUrl = environment.apiUrls.education.courses;

  /** Every student of the course (staff). */
  course(courseId: string): Observable<IGradebook> {
    return this.http.get<IGradebookApi>(`${this.coursesUrl}/${courseId}/gradebook`).pipe(map(mapGradebook));
  }

  /** The signed-in student's own grades in the course. */
  mine(courseId: string): Observable<IGradebook> {
    return this.http.get<IGradebookApi>(`${this.coursesUrl}/${courseId}/gradebook/me`).pipe(map(mapGradebook));
  }

  /** Replaces the column weights (blockId → 0-100) and returns the recomputed gradebook. */
  saveWeights(courseId: string, weights: Record<string, number>): Observable<IGradebook> {
    return this.http.put<IGradebookApi>(`${this.coursesUrl}/${courseId}/gradebook/weights`, { weights })
      .pipe(map(mapGradebook));
  }
}
