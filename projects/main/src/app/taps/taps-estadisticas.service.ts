import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'shared/core';
import { AnalyticsService } from '../analytics.service';

/** Lo que el API entiende por «evento» de un Tap (POST /api/v1/public/taps/eventos). */
export interface ITapEvento { tapId: string; evento: 'vista' | 'respuesta' | 'completado' | 'compartido'; pregunta?: number; acierto?: boolean }

/**
 * Estadísticas anónimas por Tap: vistas, respuestas (con su número de pregunta y si fue acierto), completados y compartidos.
 * El servidor solo suma contadores por día: no recibe ni guarda a quién pertenece cada evento (sin IP, sin id de dispositivo).
 * Sirven para decidir con datos el orden de los Taps y para mostrar el más visto; no para premios.
 *
 * - En el prerender y en el navegador del equipo (`?interno=1`) no se envía nada.
 * - Nunca bloquea ni molesta: si falla (sin red, API aún sin la ruta) se ignora, sin reintentos.
 */
@Injectable({ providedIn: 'root' })
export class TapsEstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly analytics = inject(AnalyticsService, { optional: true });

  vista(tapId: string): void { this.enviar({ tapId, evento: 'vista' }); }
  /** `pregunta` cuenta desde 0; `acierto` solo en preguntas que puntúan (no en los pasos de una historia). */
  respuesta(tapId: string, pregunta: number, acierto: boolean): void { this.enviar({ tapId, evento: 'respuesta', pregunta, acierto }); }
  completado(tapId: string): void { this.enviar({ tapId, evento: 'completado' }); }
  compartido(tapId: string): void { this.enviar({ tapId, evento: 'compartido' }); }

  private enviar(evento: ITapEvento): void {
    if (!this.browser || this.analytics?.isInternal()) return;
    try { this.http.post(`${this.api}/public/taps/eventos`, evento).subscribe({ error: () => { /* sin estadísticas no pasa nada */ } }); } catch { /* ídem */ }
  }
}