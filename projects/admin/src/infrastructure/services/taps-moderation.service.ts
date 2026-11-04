import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'shared';

export interface ITapReportado {
  id: number;
  tapId: string;
  autor: string;
  texto: string;
  creado: string;
  oculto: boolean;
  reportes: number;
}

/** Cola de comentarios de Taps reportados (solo superadmin). Ocultar o restaurar los saca de la cola. */
@Injectable({ providedIn: 'root' })
export class TapsModerationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/taps/comentarios`;

  reportados(antes: number | null = null): Observable<{ comentarios: ITapReportado[]; siguiente: number | null }> {
    return this.http.get<{ comentarios: ITapReportado[]; siguiente: number | null }>(
      `${this.api}/reportados`, { params: antes ? { antes } : {} });
  }

  cambiarOculto(id: number, oculto: boolean): Observable<unknown> {
    return this.http.put(`${this.api}/${id}/estado`, { oculto });
  }
}
