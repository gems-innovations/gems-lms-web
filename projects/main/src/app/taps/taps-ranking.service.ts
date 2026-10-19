import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NEVER, Observable, map } from 'rxjs';
import { environment } from 'shared/core';
import { AuthSessionService } from 'auth/core';
import {
  IPartidaRespuesta, IRanking, RANKING_LIMITE, TPartidaEstado, TRankingPeriodo, TRankingTema, UUID_V4, aliasValido, esPartidaRespuesta,
  esRanking, nuevoUuid, temaDeRanking,
} from './taps.ranking';

export const JUGADOR_KEY = 'gems-taps-jugador';
export const ALIAS_KEY = 'gems-taps-alias';

/**
 * Clave de almacenamiento por dueño: el invitado usa la clave base; cada cuenta, la suya (`gems-taps-jugador:u:<id>`).
 * Así, en un equipo compartido, iniciar o cerrar sesión cambia de jugador y de alias: lo de un alumno no se acredita a otro.
 */
export function claveDe(base: string, usuarioId: string | null): string {
  return usuarioId ? `${base}:u:${usuarioId}` : base;
}

export interface IPartidaTerminada { tapId: string; topic: string; aciertos: number; total: number; duracionMs: number }

/**
 * Rankings de Taps en el navegador: el id anónimo del dispositivo (uuid v4 en localStorage; sin almacenamiento, uno en
 * memoria), el envío de cada partida terminada y la lectura del ranking.
 *
 * - Nada se pide en el servidor (prerender): ahí todo es no-op y el HTML nunca lleva datos del API.
 * - Enviar una partida no bloquea el juego: si falla (404 mientras el backend no está, 429, 400, sin red) la partida queda
 *   «sin datos» y el resultado simplemente no muestra la tarjeta de XP. Nada inventado y sin errores intrusivos.
 * - Con sesión el interceptor agrega el Bearer (rutas bajo `environment.apiBaseUrl`), igual que en el resto del app.
 * - Id y alias se guardan por dueño (invitado o cada cuenta): al iniciar o cerrar sesión se cambia de jugador.
 */
@Injectable({ providedIn: 'root' })
export class TapsRankingService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session = inject(AuthSessionService, { optional: true });
  /** Dueño del progreso en este navegador: la cuenta con sesión o el invitado (null). */
  private readonly usuarioId = computed(() => (this.session?.isAuthenticated() ? this.session.user()?.id ?? null : null) || null);
  /** Ids en memoria por dueño (sin almacenamiento disponible). */
  private readonly memoria = new Map<string, string>();
  /** Cada envío lleva un número: si la persona repite el Tap y termina otra vez, la respuesta vieja no pisa la nueva. */
  private envio = 0;
  private readonly ultimoEnvio = new Map<string, number>();

  private readonly estados = signal<Record<string, TPartidaEstado>>({});
  /** Alias del jugador («Creeper Veloz 482»): lo asigna el servidor y se recuerda en este navegador. */
  readonly alias = signal<string | null>(null);

  constructor() {
    if (!this.browser) return;
    let anterior = untracked(() => this.usuarioId());
    // Al cambiar de dueño (iniciar o cerrar sesión) se lee el alias de ese dueño y se olvidan las partidas de esta visita.
    effect(() => {
      const dueno = this.usuarioId();
      untracked(() => {
        if (anterior !== dueno) { this.estados.set({}); this.ultimoEnvio.clear(); }
        anterior = dueno;
        this.alias.set(this.leerAlias());
      });
    });
    this.alias.set(this.leerAlias());
  }

  /** Estado de la última partida enviada de un Tap (undefined: no se envió ninguna en esta visita). */
  partida(tapId: string): TPartidaEstado | undefined {
    return this.estados()[tapId];
  }

  /** Id anónimo y estable de este dispositivo (uuid v4). */
  jugadorId(): string {
    const clave = claveDe(JUGADOR_KEY, this.usuarioId());
    const guardado = this.leer(clave);
    if (guardado && UUID_V4.test(guardado)) return guardado;
    const id = this.memoria.get(clave) ?? nuevoUuid();
    this.memoria.set(clave, id);
    this.escribir(clave, id);
    return id;
  }

  /** Envía la partida en segundo plano. Devuelve false si no se envió (servidor o tema que el ranking aún no conoce). */
  enviarPartida(p: IPartidaTerminada): boolean {
    const tema = temaDeRanking(p.topic);
    if (!this.browser || !tema || !(p.total > 0)) return false;
    const dueno = this.usuarioId();
    const n = ++this.envio;
    this.ultimoEnvio.set(p.tapId, n);
    this.fijar(p.tapId, { estado: 'enviando' });
    const body = {
      jugadorId: this.jugadorId(), tapId: p.tapId, tema, aciertos: Math.max(0, Math.min(p.total, Math.round(p.aciertos))), total: p.total,
      duracionMs: Math.max(0, Math.round(p.duracionMs)),
    };
    this.http.post<IPartidaRespuesta>(`${this.api}/public/taps/partidas`, body).subscribe({
      next: res => {
        if (this.ultimoEnvio.get(p.tapId) !== n) return;
        if (!esPartidaRespuesta(res)) { this.fijar(p.tapId, { estado: 'sin-datos' }); return; }
        if (aliasValido(res.alias) && dueno === this.usuarioId()) this.recordarAlias(res.alias);
        this.fijar(p.tapId, { estado: 'listo', datos: res });
      },
      error: () => { if (this.ultimoEnvio.get(p.tapId) === n) this.fijar(p.tapId, { estado: 'sin-datos' }); },
    });
    return true;
  }

  /** Olvida la partida de un Tap (al repetirlo): su tarjeta de XP desaparece hasta el próximo resultado. */
  olvidar(tapId: string): void {
    this.ultimoEnvio.delete(tapId);
    if (!(tapId in this.estados())) return;
    this.estados.update(all => { const resto = { ...all }; delete resto[tapId]; return resto; });
  }

  /** Ranking del periodo (y tema). En el prerender no emite nunca. */
  ranking(periodo: TRankingPeriodo, tema: TRankingTema | null): Observable<IRanking> {
    if (!this.browser) return NEVER;
    const dueno = this.usuarioId();
    let params = new HttpParams().set('periodo', periodo).set('jugadorId', this.jugadorId()).set('limite', RANKING_LIMITE);
    if (tema) params = params.set('tema', tema);
    return this.http.get<IRanking>(`${this.api}/public/taps/ranking`, { params }).pipe(
      map(r => {
        if (!esRanking(r)) throw new HttpErrorResponse({ status: 502, statusText: 'Respuesta inesperada' });
        const yo = r.yo ?? null;
        if (yo && aliasValido(yo.alias) && dueno === this.usuarioId()) this.recordarAlias(yo.alias);
        return { ...r, yo, top: r.top.slice(0, RANKING_LIMITE) };
      }),
    );
  }

  private fijar(tapId: string, estado: TPartidaEstado): void {
    this.estados.update(all => ({ ...all, [tapId]: estado }));
  }

  private recordarAlias(alias: string): void {
    const limpio = alias.trim();
    if (this.alias() !== limpio) this.alias.set(limpio);
    this.escribir(claveDe(ALIAS_KEY, this.usuarioId()), limpio);
  }

  private leerAlias(): string | null {
    const a = this.leer(claveDe(ALIAS_KEY, this.usuarioId()));
    return aliasValido(a) ? a : null;
  }

  private leer(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private escribir(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: vale para esta visita */ }
  }
}

/** El backend del ranking aún no está desplegado (o la ruta no existe): se muestra «se está preparando», no un error. */
export function rankingNoDisponible(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 501);
}
