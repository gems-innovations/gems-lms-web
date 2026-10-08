import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';

export interface IDirectoryInstitution { id: string; name: string; }
export interface IDirectoryCourse { id: number; title: string; }
export interface IDirectoryUser { userId?: number; id?: number; firstName: string; lastName: string; email: string; }

export type TBulkStatus = 'valid' | 'created' | 'exists' | 'invalid' | 'duplicate' | 'forbidden';

export interface IBulkUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  institutionId: string;
}

export interface IBulkResponse {
  total: number;
  created: number;
  failed: number;
  dryRun: boolean;
  rows: { row: number; email: string; status: TBulkStatus; message: string | null; userId: number | null; temporaryPassword: string | null }[];
}

/** People, courses and bulk operations the admin screens need beyond a single user or institution. */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly urls = environment.apiUrls;

  institutions(): Observable<IDirectoryInstitution[]> {
    return this.http.get<IDirectoryInstitution[] | { institutions?: IDirectoryInstitution[] }>(this.urls.admin.institutions).pipe(
      map(res => Array.isArray(res) ? res : res.institutions ?? []));
  }

  institutionUsers(institutionId: string): Observable<IDirectoryUser[]> {
    return this.http.get<IDirectoryUser[]>(`${this.urls.users}/institution/${encodeURIComponent(institutionId)}`);
  }

  courses(institutionId: string): Observable<IDirectoryCourse[]> {
    const params = new HttpParams().set('page', 1).set('limit', 500).set('institutionId', institutionId);
    return this.http.get<{ courses?: IDirectoryCourse[] }>(this.urls.education.courses, { params }).pipe(
      map(res => res.courses ?? []));
  }

  bulkRegister(users: IBulkUserRequest[], dryRun: boolean): Observable<IBulkResponse> {
    return this.http.post<IBulkResponse>(`${this.urls.auth.register}/bulk`, { users, dryRun });
  }

  bulkEnroll(courseId: number, studentIds: number[]): Observable<{ studentId: number }[]> {
    return this.http.post<{ studentId: number }[]>(`${this.urls.education.enrollments}/bulk`, { courseId, studentIds });
  }
}
