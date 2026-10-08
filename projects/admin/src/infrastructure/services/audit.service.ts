import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';
import { IAuditEvent, IAuditPage, IAuditQuery } from '../../domain/model/audit-event.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  search(query: IAuditQuery): Observable<IAuditPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.action) params = params.set('action', query.action);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<IAuditEvent[]>(environment.apiUrls.audit, { params, observe: 'response' }).pipe(
      map(response => ({
        events: response.body ?? [],
        total: Number(response.headers.get('X-Total-Count') ?? 0),
      }))
    );
  }
}
