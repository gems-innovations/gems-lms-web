import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';

export interface ISimilarityMatch {
  submissionId: string;
  otherSubmissionId: string;
  /** 0–1: share of five-word sequences both texts have. */
  score: number;
  sharedExcerpt: string;
}

export interface IFeedbackSnippet { id: string; text: string; }

/** Similarity between submissions and the teacher's reusable feedback comments. */
@Injectable({ providedIn: 'root' })
export class GradingToolsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  similarity(courseId: string, blockId: string): Observable<ISimilarityMatch[]> {
    return this.http.get<{ matches: any[] }>(`${this.api}/courses/${courseId}/blocks/${blockId}/similarity`).pipe(
      map(r => r.matches.map(m => ({
        submissionId: String(m.submissionId), otherSubmissionId: String(m.otherSubmissionId),
        score: m.score, sharedExcerpt: m.sharedExcerpt ?? '',
      }))));
  }

  snippets(): Observable<IFeedbackSnippet[]> {
    return this.http.get<any[]>(`${this.api}/activity/feedback-snippets`).pipe(
      map(list => list.map(s => ({ id: String(s.id), text: s.text }))));
  }

  saveSnippet(text: string): Observable<IFeedbackSnippet> {
    return this.http.post<any>(`${this.api}/activity/feedback-snippets`, { text }).pipe(map(s => ({ id: String(s.id), text: s.text })));
  }

  useSnippet(id: string): Observable<void> {
    return this.http.post<void>(`${this.api}/activity/feedback-snippets/${id}/use`, {});
  }

  deleteSnippet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/activity/feedback-snippets/${id}`);
  }
}
