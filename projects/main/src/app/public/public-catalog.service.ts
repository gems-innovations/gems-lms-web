import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NEVER, Observable, catchError, shareReplay, tap, throwError } from 'rxjs';
import { environment } from 'shared/core';
import { retryTransient } from 'shared/loading';

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
  /** Borrador del personaje hecho en /crear (PR-9): JSON compacto como string ({v:1,borradorId,b,l,i,w}, ≤ 2048 bytes). El API lo valida. */
  draft?: string;
}

/**
 * Lo que se ve sin sesión: cursos gratis de GEMS Abierto y la solicitud de instituciones.
 * La lista se pide una sola vez por visita (la comparten la portada, /retos y la ficha) y los fallos pasajeros de red
 * se reintentan solos; así la ficha de un curso puede pintar al instante lo que ya se sabe de él (carga progresiva).
 */
@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private list$: Observable<IPublicCourse[]> | null = null;
  private readonly known = new Map<string, IPublicCourse>();

  courses(): Observable<IPublicCourse[]> {
    // En el prerender (build sin API) no se pide: la página sale con el esqueleto de las tarjetas, nunca con un
    // «no pudimos cargar» congelado en el HTML. El navegador pide la lista al hidratar.
    if (this.server) return NEVER;
    return this.list$ ??= this.http.get<IPublicCourse[]>(`${this.api}/public/courses`).pipe(
      retryTransient(),
      tap(list => list.forEach(c => this.known.set(String(c.id), c))),
      // Un fallo no se queda en caché: el próximo «Reintentar» vuelve a pedir.
      catchError(error => { this.list$ = null; return throwError(() => error); }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Lo que ya se conoce de un curso (de la lista), sin pedir nada: para pintar la ficha antes del detalle. */
  peek(id: string): IPublicCourse | null {
    return this.known.get(id) ?? null;
  }

  course(id: string): Observable<IPublicCourse> {
    return this.http.get<IPublicCourse>(`${this.api}/public/courses/${encodeURIComponent(id)}`).pipe(
      retryTransient(),
      tap(c => this.known.set(String(c.id), c)),
    );
  }

  requestInstitution(body: IInstitutionRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/public/institution-requests`, body);
  }
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado',
};
