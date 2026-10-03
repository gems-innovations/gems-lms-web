import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'shared';
import { IInstitutionReport } from '../../domain/model/institution-report.model';

@Injectable({ providedIn: 'root' })
export class InstitutionReportService {
  private readonly http = inject(HttpClient);

  get(institutionId: string): Observable<IInstitutionReport> {
    return this.http.get<IInstitutionReport>(`${environment.apiUrls.education.reports}/institutions/${institutionId}`);
  }

  exportCsv(institutionId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrls.education.reports}/institutions/${institutionId}/export`, {
      responseType: 'blob'
    });
  }
}
