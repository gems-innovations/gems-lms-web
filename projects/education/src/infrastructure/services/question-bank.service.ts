import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';
import type { IQuestion } from '../../domain/model/course.model';

export type TBankQuestionType = 'multiple-choice' | 'true-false' | 'open';

/** A reusable question of the institution's bank. `question` keeps the quiz-block question shape. */
export interface IBankQuestion {
  id: string;
  category: string;
  type: TBankQuestionType;
  question: IQuestion;
  updatedAt: Date;
}

export interface IBankCategory {
  category: string;
  count: number;
}

export interface IBankQuestionPage {
  items: IBankQuestion[];
  total: number;
}

interface IBankQuestionApi {
  id: number;
  category: string;
  type: TBankQuestionType;
  question: Omit<IQuestion, 'id'>;
  updatedAt: string;
}

const toQuestion = (q: IBankQuestionApi): IBankQuestion => ({
  id: String(q.id),
  category: q.category,
  type: q.type,
  question: { ...q.question, id: `bank-${q.id}`, type: q.type } as IQuestion,
  updatedAt: new Date(q.updatedAt),
});

/** Question bank of the signed-in staff member's institution. */
@Injectable({ providedIn: 'root' })
export class QuestionBankService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrls.education.questionBank;

  list(filter: { category?: string; search?: string; page?: number; limit?: number } = {}): Observable<IBankQuestionPage> {
    let params = new HttpParams().set('page', filter.page ?? 0).set('limit', filter.limit ?? 20);
    if (filter.category) params = params.set('category', filter.category);
    if (filter.search) params = params.set('search', filter.search);
    return this.http.get<IBankQuestionApi[]>(this.url, { params, observe: 'response' }).pipe(map(r => ({
      items: (r.body ?? []).map(toQuestion),
      total: Number(r.headers.get('X-Total-Count') ?? r.body?.length ?? 0),
    })));
  }

  categories(): Observable<IBankCategory[]> {
    return this.http.get<IBankCategory[]>(`${this.url}/categories`);
  }

  /** The question keeps the quiz-block shape; its id is assigned by the API. */
  create(category: string, question: IQuestion): Observable<IBankQuestion> {
    return this.http.post<IBankQuestionApi>(this.url, { category, type: question.type, question }).pipe(map(toQuestion));
  }

  update(id: string, category: string, question: IQuestion): Observable<IBankQuestion> {
    return this.http.put<IBankQuestionApi>(`${this.url}/${id}`, { category, type: question.type, question })
      .pipe(map(toQuestion));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
