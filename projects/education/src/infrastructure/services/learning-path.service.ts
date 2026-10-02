import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { environment } from 'shared';
import { AuthSessionService } from 'auth';
import {
  ILearningPath,
  ILearningPathStep,
  ICreateLearningPathRequest,
  IUpdateLearningPathRequest,
  ILearningPathListResponse,
  ELearningPathStatus
} from '../../domain/model/learning-path.model';
import { ICourseApi, mapCourse } from './course.service';

// ── API contract (ms-education) ───────────────────────────────────────────────

interface ILearningPathApi {
  id: number;
  title: string;
  description: string | null;
  institutionId: string;
  createdAt: string;
  courses: ICourseApi[] | null;
}

// The API stores only title, description, institution and the ordered course list.
// Status, tags, thumbnail and per-step settings are not persisted yet: every path is
// treated as published and every step as required.
function mapLearningPath(r: ILearningPathApi): ILearningPath {
  const courses = (r.courses ?? []).map(mapCourse);
  const steps: ILearningPathStep[] = courses.map((c, i) => ({
    id: `${r.id}-${c.id}`,
    courseId: c.id,
    courseTitle: c.title,
    courseThumbnailUrl: c.thumbnailUrl,
    order: i + 1,
    isRequired: true,
    estimatedDuration: c.totalDuration,
    moduleCount: c.modules.length,
    lessonCount: c.totalLessons
  }));
  const createdAt = new Date(r.createdAt);
  return {
    id: String(r.id),
    title: r.title,
    description: r.description ?? '',
    status: ELearningPathStatus.PUBLISHED,
    steps,
    tags: [],
    institutionId: r.institutionId,
    estimatedDuration: steps.reduce((s, st) => s + st.estimatedDuration, 0),
    enrolledCount: 0,
    completionRate: 0,
    createdAt,
    updatedAt: createdAt
  };
}

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = environment.apiUrls.education.learningPaths;

  getLearningPaths(page = 1, limit = 12): Observable<ILearningPathListResponse> {
    // The API returns the full list (no pagination); everyone but the super admin
    // only sees their institution's paths.
    const institutionId = this.session.isSuperAdmin() ? null : this.session.institutionId();
    const url = institutionId ? `${this.baseUrl}/institution/${encodeURIComponent(institutionId)}` : this.baseUrl;
    return this.http.get<ILearningPathApi[]>(url).pipe(
      map(list => {
        const all = list.map(mapLearningPath);
        return { learningPaths: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit };
      })
    );
  }

  getLearningPathById(id: string): Observable<ILearningPath> {
    return this.http.get<ILearningPathApi>(`${this.baseUrl}/${id}`).pipe(map(mapLearningPath));
  }

  createLearningPath(req: ICreateLearningPathRequest): Observable<ILearningPath> {
    const institutionId = this.session.institutionId();
    if (!institutionId) {
      return throwError(() => new Error('Tu usuario no pertenece a una institución'));
    }
    return this.http.post<ILearningPathApi>(this.baseUrl, {
      title: req.title,
      description: req.description,
      institutionId,
      courseIds: []
    }).pipe(map(mapLearningPath));
  }

  /** The API replaces title, description and course list together, so unchanged fields are re-sent. */
  updateLearningPath(id: string, req: IUpdateLearningPathRequest): Observable<ILearningPath> {
    return this.getLearningPathById(id).pipe(
      switchMap(current => {
        const steps = req.steps ?? current.steps;
        return this.http.put<ILearningPathApi>(`${this.baseUrl}/${id}`, {
          title: req.title ?? current.title,
          description: req.description ?? current.description,
          institutionId: current.institutionId,
          courseIds: [...steps].sort((a, b) => a.order - b.order).map(s => Number(s.courseId))
        });
      }),
      map(mapLearningPath)
    );
  }

  deleteLearningPath(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
