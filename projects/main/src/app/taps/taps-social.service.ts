import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, tap } from 'rxjs';
import { environment } from 'shared/core';
import { AuthSessionService } from 'auth/core';
import { isGuestUser } from '../public/guest-access.service';
import { ITapComentario, ITapSocial, SOCIALES_MAX, leerComentario, leerComentarios, leerMeGusta, leerMios, leerSociales } from './taps.social';

const RESPUESTA_RARA = () => new HttpErrorResponse({ status: 502, statusText: 'Respuesta inesperada' });

/**
 * Vistas, me gusta y comentarios de los Taps. Decisión del dueño (29-oct): las cifras son públicas; dar me gusta, comentar y
 * reportar es SOLO con sesión (no hay identidad anónima para esto).
 *
 * - Cifras: GET /public/taps/sociales, sin interceptores (pública, sin Authorization). Los pedidos del mismo instante se juntan
 *   en lotes de 60 como máximo y cada Tap se pide una vez.
 * - Con sesión (HttpClient con el interceptor de auth): GET /taps/sociales/yo (qué Taps le gustan), PUT /taps/{id}/me-gusta y
 *   los comentarios. Al entrar o salir de la sesión se piden o se olvidan los «me gusta» propios.
 * - `disponible` false (404, sin red, respuesta ajena al contrato): se ocultan corazón y comentarios. Nada se inventa.
 * - Me gusta optimista: cambia al tocar y vuelve atrás si el API falla (también con 429: más de 60 cambios por minuto; no se
 *   reintenta). Nada se pide en el prerender.
 */
@Injectable({ providedIn: 'root' })
export class TapsSocialService {
  private readonly publico = new HttpClient(inject(HttpBackend));
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(AuthSessionService, { optional: true });

  /** Hay sesión con cuenta: me gusta y comentarios funcionan; sin ella (o como invitado, que el API rechaza con 403), tocarlos pide iniciar sesión. */
  readonly sesion = computed(() => !!this.auth?.isAuthenticated() && !isGuestUser(this.auth.user()));
  /** null: aún no se sabe · true: el API responde · false: no está (se ocultan los corazones y los comentarios). */
  readonly disponible = signal<boolean | null>(null);
  /** La lista de comentarios no existe en el API (404): se oculta el botón aunque haya cifra. */
  readonly sinComentarios = signal(false);
  readonly datos = signal<Record<string, ITapSocial>>({});

  private readonly pedidos = new Set<string>();
  private cola: string[] = [];
  private vaciado = false;
  /** Último toque por Tap: la respuesta de un toque viejo no pisa la de uno nuevo. */
  private readonly toques = new Map<string, number>();
  private toque = 0;

  constructor() {
    if (!this.browser) return;
    // Entrar: se piden los «me gusta» propios de lo ya cargado; salir: se olvidan.
    effect(() => {
      const con = this.sesion();
      untracked(() => {
        if (con) this.lotes(Object.keys(this.datos()), ids => this.cargarMios(ids));
        else if (Object.values(this.datos()).some(d => d.meGustaYo)) this.datos.update(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { ...v, meGustaYo: false }])));
      });
    });
  }

  /** Pide las cifras de estos Taps (las que no se pidieron ya). */
  pedir(ids: readonly string[]): void {
    if (!this.browser || this.disponible() === false) return;
    for (const id of ids) if (!this.pedidos.has(id)) { this.pedidos.add(id); this.cola.push(id); }
    if (!this.cola.length || this.vaciado) return;
    this.vaciado = true;
    queueMicrotask(() => {
      this.vaciado = false;
      const ids = this.cola; this.cola = [];
      this.lotes(ids, lote => this.cargar(lote));
    });
  }

  /**
   * Da o quita el me gusta (optimista). Devuelve false si hace falta iniciar sesión (quien llama abre la hoja de acceso).
   * Sin cifras de ese Tap o sin API no hace nada.
   */
  alternar(tapId: string): boolean {
    if (!this.sesion()) return false;
    const antes = this.datos()[tapId];
    if (!antes || this.disponible() !== true) return true;
    const meGusta = !antes.meGustaYo, n = ++this.toque;
    this.toques.set(tapId, n);
    this.fijar(tapId, { ...antes, meGustaYo: meGusta, meGusta: Math.max(0, antes.meGusta + (meGusta ? 1 : -1)) });
    const vale = () => this.toques.get(tapId) === n;
    this.http.put(`${this.api}/taps/${encodeURIComponent(tapId)}/me-gusta`, { meGusta }).subscribe({
      next: r => {
        if (!vale()) return;
        const ok = leerMeGusta(r, tapId);
        this.fijar(tapId, ok ? { ...this.datos()[tapId], meGustaYo: ok.meGusta, meGusta: ok.total } : antes);
      },
      error: (e: { status?: number }) => {
        if (!vale()) return;
        this.fijar(tapId, antes);
        if (e?.status === 404) this.disponible.set(false);
      },
    });
    return true;
  }

  /** Una página de comentarios (20); `antes` = cursor `siguiente` de la página anterior. 404: se apagan los comentarios. */
  comentarios(tapId: string, antes: string | null = null): Observable<{ comentarios: ITapComentario[]; siguiente: string | null }> {
    const params: Record<string, string> = antes ? { antes } : {};
    return this.http.get(`${this.api}/taps/${encodeURIComponent(tapId)}/comentarios`, { params }).pipe(
      map(r => { const p = leerComentarios(r); if (!p) throw RESPUESTA_RARA(); return p; }),
      tap({ error: (e: { status?: number }) => { if (e?.status === 404) this.sinComentarios.set(true); } }),
    );
  }

  /** Publica un comentario (1 a 200 caracteres; el API responde 422 con su mensaje si no vale). Suma 1 a la cifra. */
  comentar(tapId: string, texto: string): Observable<ITapComentario> {
    return this.http.post(`${this.api}/taps/${encodeURIComponent(tapId)}/comentarios`, { texto }).pipe(
      map(r => { const c = leerComentario(r); if (!c) throw RESPUESTA_RARA(); return c; }),
      tap(() => this.sumarComentarios(tapId, 1)),
    );
  }

  /** Borra un comentario propio. Resta 1 a la cifra. */
  borrarComentario(tapId: string, id: string): Observable<unknown> {
    return this.http.delete(`${this.api}/taps/comentarios/${encodeURIComponent(id)}`).pipe(tap(() => this.sumarComentarios(tapId, -1)));
  }

  /** Reporta un comentario de otra persona para que el equipo lo revise. */
  reportar(id: string): Observable<unknown> {
    return this.http.post(`${this.api}/taps/comentarios/${encodeURIComponent(id)}/reportar`, {});
  }

  private sumarComentarios(tapId: string, n: number): void {
    const d = this.datos()[tapId];
    if (d?.comentarios != null) this.fijar(tapId, { ...d, comentarios: Math.max(0, d.comentarios + n) });
  }

  private lotes(ids: string[], fn: (lote: string[]) => void): void {
    for (let i = 0; i < ids.length; i += SOCIALES_MAX) fn(ids.slice(i, i + SOCIALES_MAX));
  }

  private cargar(ids: string[]): void {
    this.publico.get(`${this.api}/public/taps/sociales`, { params: { ids: ids.join(',') } }).subscribe({
      next: r => {
        const taps = leerSociales(r);
        if (!taps) { this.sinApi(ids); return; }
        this.disponible.set(true);
        this.datos.update(d => {
          const out = { ...d };
          for (const [id, v] of Object.entries(taps)) out[id] = { ...v, meGustaYo: d[id]?.meGustaYo ?? false };
          return out;
        });
        if (this.sesion()) this.cargarMios(Object.keys(taps));
      },
      error: () => this.sinApi(ids),
    });
  }

  private cargarMios(ids: string[]): void {
    if (!ids.length) return;
    this.http.get(`${this.api}/taps/sociales/yo`, { params: { ids: ids.join(',') } }).subscribe({
      next: r => {
        const mios = leerMios(r);
        if (!mios || !this.sesion()) return;
        this.datos.update(d => {
          const out = { ...d };
          for (const [id, yo] of Object.entries(mios)) if (out[id] && !this.toques.has(id)) out[id] = { ...out[id], meGustaYo: yo };
          return out;
        });
      },
      error: () => undefined,      // sin los propios, los corazones salen vacíos; tocar uno lo corrige con el total del servidor
    });
  }

  /** Si el API nunca respondió, se da por ausente; si ya respondió antes, solo se podrán volver a pedir estos ids. */
  private sinApi(ids: string[]): void {
    if (this.disponible() !== true) this.disponible.set(false);
    else for (const id of ids) this.pedidos.delete(id);
  }

  private fijar(tapId: string, v: ITapSocial): void {
    this.datos.update(d => ({ ...d, [tapId]: v }));
  }
}
