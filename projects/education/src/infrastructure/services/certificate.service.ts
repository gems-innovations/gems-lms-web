import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';
import { ICertification } from '../../domain/model/certificate.model';

interface ICertificateApi {
  code: string;
  studentName: string;
  institutionId: string;
  resourceType: 'COURSE' | 'LEARNING_PATH';
  resourceId: number;
  resourceTitle: string;
  instructorName: string | null;
  completedAt: string;
  issuedAt: string;
  valid: boolean;
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrls.education.certificates;

  mine(): Observable<ICertification[]> {
    return this.http.get<ICertificateApi[]>(`${this.baseUrl}/me`).pipe(
      map(list => list.map(c => ({
        id: c.code,
        resourceType: c.resourceType,
        resourceId: String(c.resourceId),
        resourceTitle: c.resourceTitle,
        studentName: c.studentName,
        institutionId: c.institutionId,
        instructorName: c.instructorName ?? undefined,
        completedAt: new Date(c.completedAt),
        issuedAt: new Date(c.issuedAt),
        valid: c.valid,
      })))
    );
  }

  verify(code: string): Observable<ICertification> {
    return this.http.get<ICertificateApi>(`${this.baseUrl}/verify/${encodeURIComponent(code)}`).pipe(
      map(c => ({ id: c.code, resourceType: c.resourceType, resourceId: String(c.resourceId),
        resourceTitle: c.resourceTitle, studentName: c.studentName, institutionId: c.institutionId,
        instructorName: c.instructorName ?? undefined, completedAt: new Date(c.completedAt),
        issuedAt: new Date(c.issuedAt), valid: c.valid }))
    );
  }
}
