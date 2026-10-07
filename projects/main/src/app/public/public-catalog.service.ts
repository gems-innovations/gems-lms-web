import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'shared/core';

export interface IPublicLesson { id: number; title: string; blocks: number; free: boolean; }
export interface IPublicModule { id: number; title: string; lessons: IPublicLesson[]; }
export interface IPublicCourse {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  difficulty: string | null;
  tags: string[] | null;
  instructorName: string | null;
  modules: number;
  lessons: number;
  durationMinutes: number | null;
  enrolled: number | null;
  outline: IPublicModule[];
}

export interface IInstitutionRequest {
  institutionName: string;
  contactName: string;
  email: string;
  phone?: string;
  role?: string;
  students?: number | null;
  message?: string;
}

/** Lo que se ve sin sesión: cursos gratis de GEMS Abierto y la solicitud de instituciones. */
@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  courses(): Observable<IPublicCourse[]> {
    return this.http.get<IPublicCourse[]>(`${this.api}/public/courses`);
  }

  course(id: string): Observable<IPublicCourse> {
    return this.http.get<IPublicCourse>(`${this.api}/public/courses/${encodeURIComponent(id)}`);
  }

  requestInstitution(body: IInstitutionRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/public/institution-requests`, body);
  }
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado',
};
