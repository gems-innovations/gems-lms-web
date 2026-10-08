import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';

export interface IRisk {
  studentId: string;
  score: number;
  level: 'high' | 'medium';
  reasons: string[];
  daysInactive: number | null;
  progress: number;
  currentGrade: number | null;
  missingItems: number;
}

export interface ICourseRisk { students: number; high: number; medium: number; atRisk: IRisk[]; }

interface ICourseRiskDto extends Omit<ICourseRisk, 'atRisk'> {
  atRisk: (Omit<IRisk, 'studentId'> & { studentId: string | number })[];
}

/** Early-warning data of a course: students falling behind, and the in-app reminder sent to them. */
@Injectable({ providedIn: 'root' })
export class AtRiskService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  forCourse(courseId: string): Observable<ICourseRisk> {
    return this.http.get<ICourseRiskDto>(`${this.api}/courses/${encodeURIComponent(courseId)}/at-risk`).pipe(
      map(r => ({ ...r, atRisk: r.atRisk.map(x => ({ ...x, studentId: String(x.studentId) })) })));
  }

  remind(courseId: string, studentId: string, message: string): Observable<void> {
    return this.http.post<void>(
      `${this.api}/courses/${encodeURIComponent(courseId)}/at-risk/${encodeURIComponent(studentId)}/remind`,
      { message: message.trim() || null });
  }
}
