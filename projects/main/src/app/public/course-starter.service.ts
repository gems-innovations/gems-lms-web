import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from 'shared/core';
import { GuestAccessService } from './guest-access.service';
import { AnalyticsService } from '../analytics.service';

/**
 * «Empezar gratis» en un solo paso: abre sesión de invitado si hace falta, inscribe y entra al curso.
 * Lo usan las tarjetas de la landing y la ficha del curso.
 */
@Injectable({ providedIn: 'root' })
export class CourseStarterService {
  private readonly guests = inject(GuestAccessService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  /** Curso que se está abriendo (para mostrar «Entrando…» en su botón). */
  readonly starting = signal<number | null>(null);

  /** Devuelve un mensaje de error para mostrar, o null si entró al curso. */
  async start(courseId: number, nickname?: string): Promise<string | null> {
    if (this.starting() !== null) return null;
    this.starting.set(courseId);
    try {
      const user = await this.guests.ensureSession(nickname);
      try {
        await firstValueFrom(this.http.post(environment.apiUrls.education.enrollments,
          { studentId: Number(user.id), courseId }));
      } catch (e) {
        // Ya inscrito: se sigue directo al curso.
        if (!(e instanceof HttpErrorResponse && e.status === 409)) throw e;
      }
      this.analytics.event('empezar-gratis');
      const target = `/learn/courses/${courseId}`;
      // Respaldo: si la transición animada no puede completarse (pestaña sin pintar), carga directa.
      const fallback = setTimeout(() => { if (typeof location !== 'undefined') location.assign(target); }, 3000);
      await this.router.navigateByUrl(target);
      clearTimeout(fallback);
      return null;
    } catch (e) {
      return e instanceof HttpErrorResponse && e.status === 429
        ? 'Hay demasiadas personas entrando desde esta red. Intenta en unos minutos.'
        : e instanceof HttpErrorResponse && e.status === 403
          ? 'Tu cuenta no puede abrir los cursos gratis. Abre la página en una ventana privada.'
          : 'No pudimos abrir el curso. Revisa tu conexión e inténtalo de nuevo.';
    } finally {
      this.starting.set(null);
    }
  }
}
