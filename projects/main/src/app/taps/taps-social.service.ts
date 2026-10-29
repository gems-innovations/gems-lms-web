import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NEVER, Observable, tap } from 'rxjs';
import { environment } from 'shared/core';
import { TapsRankingService } from './taps-ranking.service';

export interface ITapSocial { likes: number; comentarios: number; yoLike: boolean }
export interface ITapComentario { id: number; alias: string; texto: string; creado: string; mio: boolean }
export interface ITapComentarios { comentarios: ITapComentario[]; siguiente: string | null }

export const COMENTARIO_MAX = 200;

/**
 * Likes y comentarios de Taps (gems-lms-api#35). Mismo patrón que {@link TapsRankingService}: en el prerender nada se pide,
 * sin sesión cuenta el dispositivo (`jugadorId` del ranking) y con sesión el interceptor agrega el Bearer.
 * - Las cifras solo se muestran cuando llegaron del servidor: si fallan, el riel enseña los botones sin número.
 * - El like es optimista: cambia al tocar y vuelve atrás si el servidor falla. Toques rápidos: gana la última respuesta.
 * - Comentar exige sesión (401 sin ella); la hoja lo explica y enlaza a entrar.
 */
@Injectable({ providedIn: 'root' })
export class TapsSocialService {
  private readonly http = inject(HttpClient);
  private readonly ranking = inject(TapsRankingService);
  private readonly api = environment.apiBaseUrl;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cifras = signal<Record<string, ITapSocial>>({});
  private readonly pedidos = new Set<string>();
  private readonly ultimoLike = new Map<string, number>();
  private envio = 0;

  /** Cifras del Tap, o undefined si aún no llegaron (o fallaron). */
  de(tapId: string): ITapSocial | undefined {
    return this.cifras()[tapId];
  }

  /** Pide las cifras una vez por visita (y otra vez si la anterior falló). */
  cargar(tapId: string): void {
    if (!this.browser || this.pedidos.has(tapId)) return;
    this.pedidos.add(tapId);
    this.http.get<ITapSocial>(this.url(tapId, 'social'), { params: this.dispositivo() }).subscribe({
      next: s => { if (!this.ultimoLike.has(tapId)) this.fijar(tapId, s); },
      error: () => this.pedidos.delete(tapId),
    });
  }

  alternarLike(tapId: string): void {
    const antes = this.de(tapId);
    if (!this.browser || !antes) return;
    const dar = !antes.yoLike, n = ++this.envio;
    this.ultimoLike.set(tapId, n);
    this.fijar(tapId, { ...antes, yoLike: dar, likes: Math.max(0, antes.likes + (dar ? 1 : -1)) });
    const url = this.url(tapId, 'like'), opciones = { params: this.dispositivo() };
    (dar ? this.http.put<ITapSocial>(url, null, opciones) : this.http.delete<ITapSocial>(url, opciones)).subscribe({
      next: s => { if (this.ultimoLike.get(tapId) === n) this.fijar(tapId, s); },
      error: () => { if (this.ultimoLike.get(tapId) === n) this.fijar(tapId, antes); },
    });
  }

  comentarios(tapId: string, cursor: string | null): Observable<ITapComentarios> {
    if (!this.browser) return NEVER;
    const params = cursor ? new HttpParams().set('cursor', cursor) : undefined;
    return this.http.get<ITapComentarios>(this.url(tapId, 'comentarios'), { params });
  }

  comentar(tapId: string, texto: string): Observable<ITapComentario> {
    return this.http.post<ITapComentario>(this.url(tapId, 'comentarios'), { texto }).pipe(tap(() => this.sumar(tapId, 1)));
  }

  borrar(tapId: string, id: number): Observable<unknown> {
    return this.http.delete(`${this.url(tapId, 'comentarios')}/${id}`).pipe(tap(() => this.sumar(tapId, -1)));
  }

  reportar(tapId: string, id: number): Observable<unknown> {
    return this.http.post(`${this.url(tapId, 'comentarios')}/${id}/reportar`, null);
  }

  private sumar(tapId: string, d: number): void {
    const s = this.de(tapId);
    if (s) this.fijar(tapId, { ...s, comentarios: Math.max(0, s.comentarios + d) });
  }

  private fijar(tapId: string, s: ITapSocial): void {
    this.cifras.update(all => ({ ...all, [tapId]: s }));
  }

  private dispositivo(): HttpParams {
    return new HttpParams().set('jugadorId', this.ranking.jugadorId());
  }

  private url(tapId: string, ruta: string): string {
    return `${this.api}/public/taps/${encodeURIComponent(tapId)}/${ruta}`;
  }
}
