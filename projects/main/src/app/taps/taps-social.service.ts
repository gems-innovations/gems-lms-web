import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'shared/core';
import { TapsRankingService } from './taps-ranking.service';
import { ITapSocial, SOCIALES_MAX, leerMeGusta, leerSociales } from './taps.social';

/**
 * Vistas y me gusta de los Taps (GET /public/taps/sociales, POST /public/taps/{tapId}/me-gusta). El jugador es el mismo id
 * anónimo del ranking (TapsRankingService.jugadorId). Nada se pide en el prerender.
 *
 * - Los pedidos de varias tarjetas o rieles en el mismo instante se juntan en uno (hasta 60 ids) y cada Tap se pide una vez.
 * - `disponible` false (404, sin red, respuesta que no es la del contrato): quien muestra el corazón lo oculta; nunca un
 *   botón muerto ni una cifra inventada.
 * - Me gusta optimista: la cifra cambia al tocar y vuelve atrás si el API falla (también con 429, más de 60 cambios por
 *   minuto: no se reintenta).
 */
@Injectable({ providedIn: 'root' })
export class TapsSocialService {
  /** Sin interceptores: son llamadas públicas y el API pide que no lleven Authorization (aunque haya sesión). */
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly api = environment.apiBaseUrl;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly ranking = inject(TapsRankingService);

  /** null: aún no se sabe · true: el API responde · false: no está (se ocultan los corazones). */
  readonly disponible = signal<boolean | null>(null);
  readonly datos = signal<Record<string, ITapSocial>>({});

  private readonly pedidos = new Set<string>();
  private cola: string[] = [];
  private vaciado = false;
  /** Último toque por Tap: la respuesta de un toque viejo no pisa la de uno nuevo. */
  private readonly toques = new Map<string, number>();
  private toque = 0;

  /** Pide las cifras de estos Taps (las que no se pidieron ya). */
  pedir(ids: readonly string[]): void {
    if (!this.browser || this.disponible() === false) return;
    for (const id of ids) if (!this.pedidos.has(id)) { this.pedidos.add(id); this.cola.push(id); }
    if (!this.cola.length || this.vaciado) return;
    this.vaciado = true;
    queueMicrotask(() => {
      this.vaciado = false;
      const ids = this.cola; this.cola = [];
      for (let i = 0; i < ids.length; i += SOCIALES_MAX) this.cargar(ids.slice(i, i + SOCIALES_MAX));
    });
  }

  /** Da o quita el me gusta (optimista). Sin cifras de ese Tap o sin API no hace nada. */
  alternar(tapId: string): void {
    const antes = this.datos()[tapId];
    if (!antes || this.disponible() !== true) return;
    const meGusta = !antes.meGustaYo, n = ++this.toque;
    this.toques.set(tapId, n);
    this.fijar(tapId, { ...antes, meGustaYo: meGusta, meGusta: Math.max(0, antes.meGusta + (meGusta ? 1 : -1)) });
    const vale = () => this.toques.get(tapId) === n;
    this.http.post(`${this.api}/public/taps/${encodeURIComponent(tapId)}/me-gusta`, { jugador: this.ranking.jugadorId(), meGusta }).subscribe({
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
  }

  private cargar(ids: string[]): void {
    this.http.get(`${this.api}/public/taps/sociales`, { params: { ids: ids.join(','), jugador: this.ranking.jugadorId() } }).subscribe({
      next: r => {
        const taps = leerSociales(r);
        if (!taps) { this.sinApi(ids); return; }
        this.disponible.set(true);
        this.datos.update(d => ({ ...d, ...taps }));
      },
      error: () => this.sinApi(ids),
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
