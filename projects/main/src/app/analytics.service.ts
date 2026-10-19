import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  ARRIVAL_KEY, INTERNAL_KEY, TEventPath, VISIT_KEY, arrivalEvent, internalFlagFrom, localDay, parseVisitState, visitEvents,
} from './analytics-taxonomy';

interface IGoatCounterVars { path: string; title?: string; event?: boolean }

interface IGoatCounter {
  count?: (vars: IGoatCounterVars) => void;
}

/** Acciones clave del embudo, para medir conversión y no solo visitas. */
export type TAnalyticsEvent = 'empezar-gratis' | 'cuenta-creada' | 'solicitud-institucion'
  // Taps (feed de quizzes en vivo): ver un Tap, responder una pregunta, completarlo y pasar al siguiente.
  | 'taps-ver' | 'taps-responder' | 'taps-completar' | 'taps-siguiente';

const SCRIPT_ID = 'goatcounter-script';
const NUMERIC_OR_UUID = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const LONG_TOKEN = /^[\w-]{16,}$/;

/** Path sent to the counter: no query string and no ids or tokens, so visits are grouped by screen. */
export function toAnalyticsPath(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segments = path.split('/').map(segment => {
    if (NUMERIC_OR_UUID.test(segment)) return ':id';
    return LONG_TOKEN.test(segment) ? ':token' : segment;
  });
  return segments.join('/') || '/';
}

/**
 * Page views for GoatCounter (cookie-less). The script is in index.html with no_onload, so the router reports every page,
 * the first one included. También cuenta la llegada (fuente/video), la primera visita y el regreso, y no cuenta al equipo.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Lo que se pidió contar antes de que cargara count.js (async): todas las acciones y solo la última página. */
  private pending: IGoatCounterVars[] = [];
  private waiting = false;

  start(): void {
    if (!this.isBrowser) return;
    this.applyInternalFlag();
    if (this.isInternal()) return;                             // tráfico del equipo: ni páginas ni acciones
    this.countArrival();
    this.countVisit();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => this.send({ path: toAnalyticsPath(event.urlAfterRedirects) }));
  }

  /**
   * Acción (GoatCounter la lista aparte de las páginas). Nunca falla ni bloquea.
   * Acepta los nombres antiguos (`taps-ver`) y los de la taxonomía con detalle en el path (`taps/ver/redstone`).
   */
  event(name: TAnalyticsEvent | TEventPath): void {
    if (!this.isBrowser || this.isInternal()) return;
    try { this.send({ path: name, title: name, event: true }); } catch { /* sin analítica no pasa nada */ }
  }

  /** Navegador del equipo: `?interno=1` (o `#toggle-goatcounter` de GoatCounter) deja de contar para siempre en él. */
  isInternal(): boolean {
    try { return localStorage.getItem(INTERNAL_KEY) === 't'; } catch { return false; }
  }

  private applyInternalFlag(): void {
    const flag = internalFlagFrom(location.search);
    if (flag === null) return;
    try { if (flag) localStorage.setItem(INTERNAL_KEY, 't'); else localStorage.removeItem(INTERNAL_KEY); } catch { /* sin almacenamiento */ }
  }

  /** `llegada/<fuente>[/<video>]`, una vez por pestaña. */
  private countArrival(): void {
    try {
      if (sessionStorage.getItem(ARRIVAL_KEY)) return;
      const path = arrivalEvent(location.search, document.referrer, location.hostname);
      sessionStorage.setItem(ARRIVAL_KEY, '1');
      if (path) this.event(path);
    } catch { /* sin sessionStorage no se mide la llegada */ }
  }

  /** `visita/nueva` o `regreso/<tramo>/<cohorte>`: aproximación de D1/D7 sin cookies (marca en localStorage). */
  private countVisit(): void {
    try {
      const { events, state } = visitEvents(localDay(new Date()), parseVisitState(localStorage.getItem(VISIT_KEY)));
      localStorage.setItem(VISIT_KEY, JSON.stringify(state));
      events.forEach(path => this.event(path));
    } catch { /* sin almacenamiento todos parecerían nuevos: mejor no contar */ }
  }

  private send(vars: IGoatCounterVars): void {
    const counter = this.counter();
    if (counter?.count) { counter.count(vars); return; }
    // count.js carga async: guarda las acciones y la última página, y las envía cuando esté listo.
    if (!vars.event) this.pending = this.pending.filter(v => v.event);
    this.pending.push(vars);
    if (this.waiting) return;
    this.waiting = true;
    document.getElementById(SCRIPT_ID)?.addEventListener('load', () => {
      const queued = this.pending;
      this.pending = [];
      this.waiting = false;
      queued.forEach(v => { try { this.counter()?.count?.(v); } catch { /* sin analítica no pasa nada */ } });
    }, { once: true });
  }

  private counter(): IGoatCounter | undefined {
    return (window as unknown as { goatcounter?: IGoatCounter }).goatcounter;
  }
}
