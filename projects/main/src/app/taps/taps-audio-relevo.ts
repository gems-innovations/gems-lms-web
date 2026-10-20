import { Injectable, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';

/** Si el feed nuevo no recoge el audio en este tiempo (la navegación falló o fue a otra parte), se cierra. */
export const RELEVO_MS = 10_000;

/** Lo que un feed deja al siguiente: el reproductor de sonido (con su AudioContext en marcha) y la música que suena. */
export interface ITapsRelevoParte<T> { valor: T; cerrar(): void }

/**
 * Relevo del audio entre feeds de Taps (raíz). El audio vive en servicios del componente `<gems-taps>`; al pasar de la
 * portada («/») a /taps («Siguiente», «Seguir jugando», un tema) el componente se destruye y nace otro. Sin relevo la
 * música se cortaría y volvería a empezar (otro AudioContext, otra descarga). Con él, el feed que se va entrega su sonido
 * y su música y el que llega los recoge tal cual: la pista sigue sonando sin cortes.
 *
 * Solo se entrega cuando el feed lo pide justo antes de navegar a otro feed. Si la navegación no acaba en /taps (cancelada,
 * con error o a otra página) se cierra al terminar; si nadie recoge en RELEVO_MS, también.
 */
@Injectable({ providedIn: 'root' })
export class TapsAudioRelevo {
  private readonly partes = new Map<string, ITapsRelevoParte<unknown>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(Router, { optional: true })?.events.subscribe(e => {
      if (!this.partes.size) return;
      const fuera = e instanceof NavigationCancel || e instanceof NavigationError
        || (e instanceof NavigationEnd && !/^\/taps(?:[/?#]|$)/.test(e.urlAfterRedirects));
      if (fuera) this.cerrarTodo();
    });
  }

  entregar<T>(clave: string, parte: ITapsRelevoParte<T>): void {
    this.partes.get(clave)?.cerrar();
    this.partes.set(clave, parte as ITapsRelevoParte<unknown>);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.cerrarTodo(), RELEVO_MS);
  }

  recoger<T>(clave: string): T | null {
    const parte = this.partes.get(clave);
    this.partes.delete(clave);
    if (!this.partes.size && this.timer) { clearTimeout(this.timer); this.timer = null; }
    return (parte?.valor as T | undefined) ?? null;
  }

  private cerrarTodo(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    // La música antes que el sonido: el sonido cierra el AudioContext en el que suena la música.
    for (const clave of ['musica', ...this.partes.keys()]) {
      const parte = this.partes.get(clave);
      this.partes.delete(clave);
      try { parte?.cerrar(); } catch { /* ya cerrado */ }
    }
  }
}
