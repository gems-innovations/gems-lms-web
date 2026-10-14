import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'shared';

export type THomeMode = 'BASE' | 'CUSTOM';

export interface IHomeView {
  institutionId: string;
  slug: string | null;
  draft: { mode: THomeMode; html: string | null; css: string | null; updatedAt: string | null; updatedBy: number | null };
  publishedVersion: number | null;
}

export interface IHomeVersionSummary {
  version: number;
  mode: THomeMode;
  note: string | null;
  publishedBy: number | null;
  publishedAt: string;
  current: boolean;
}

/** Home personalizada de cada institución: borrador, publicación, historial y slug (ms-admin). */
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/home`;

  get(institutionId: string): Observable<IHomeView> {
    return this.http.get<IHomeView>(`${this.base}/${institutionId}`);
  }

  saveDraft(institutionId: string, mode: THomeMode, html: string, css: string): Observable<IHomeView> {
    return this.http.put<IHomeView>(`${this.base}/${institutionId}/draft`, { mode, html, css });
  }

  publish(institutionId: string, note: string): Observable<IHomeView> {
    return this.http.post<IHomeView>(`${this.base}/${institutionId}/publish`, { note: note.trim() || null });
  }

  unpublish(institutionId: string): Observable<IHomeView> {
    return this.http.delete<IHomeView>(`${this.base}/${institutionId}/publish`);
  }

  versions(institutionId: string): Observable<IHomeVersionSummary[]> {
    return this.http.get<IHomeVersionSummary[]>(`${this.base}/${institutionId}/versions`);
  }

  restore(institutionId: string, version: number): Observable<IHomeView> {
    return this.http.post<IHomeView>(`${this.base}/${institutionId}/versions/${version}/restore`, {});
  }

  assignSlug(institutionId: string, slug: string): Observable<IHomeView> {
    return this.http.put<IHomeView>(`${this.base}/${institutionId}/slug`, { slug });
  }
}
