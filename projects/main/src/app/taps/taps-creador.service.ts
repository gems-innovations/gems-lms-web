import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'shared/core';

/** Lo que el API responde al crear, guardar o publicar (TapsCreadorController.TapResponse); aquí solo se usa esto. */
export interface ITapCreador { id: string; estado: 'borrador' | 'en_revision' | 'publicado' | 'rechazado' }

/** Taps de creador en el API (`/api/v1/taps`, con sesión) y el público por enlace (`/api/v1/public/taps/u/{id}`, sin token). */
@Injectable({ providedIn: 'root' })
export class TapsCreadorService {
  private readonly http = inject(HttpClient);
  private readonly publico = new HttpClient(inject(HttpBackend));
  private readonly api = environment.apiBaseUrl;

  /**
   * Guarda el Tap en la cuenta y lo publica con enlace. Con `idPrevio` (ya se publicó desde este borrador) lo actualiza en vez de
   * crear otro, para no gastar la cuota de 30; si ese ya no existe (404), crea uno nuevo. Docentes: `publicado`; creadores: `en_revision`.
   */
  async publicar(payload: object, idPrevio: string | null): Promise<ITapCreador> {
    let tap: ITapCreador | null = null;
    if (idPrevio) {
      tap = await firstValueFrom(this.http.put<ITapCreador>(`${this.api}/taps/${encodeURIComponent(idPrevio)}`, payload))
        .catch((e: unknown) => { if (e instanceof HttpErrorResponse && e.status === 404) return null; throw e; });
    }
    tap ??= await firstValueFrom(this.http.post<ITapCreador>(`${this.api}/taps`, payload));
    return firstValueFrom(this.http.post<ITapCreador>(`${this.api}/taps/${encodeURIComponent(tap.id)}/publicar`, { visibilidad: 'enlace' }));
  }

  /** El JSON del Tap publicado con enlace (el feed lo convierte con `tapDeUsuario`); null si no existe, no está publicado o no hay red. */
  tapPublico(id: string): Promise<unknown> {
    return firstValueFrom(this.publico.get(`${this.api}/public/taps/u/${encodeURIComponent(id)}`)).catch(() => null);
  }
}
