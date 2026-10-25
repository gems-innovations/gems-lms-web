import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, InjectionToken, PLATFORM_ID, afterNextRender, inject, signal, viewChild,
} from '@angular/core';
import { AnalyticsService } from '../analytics.service';
import { TEventPath } from '../analytics-taxonomy';
import { CINTA_TRANSPARENCIA, CLAVE_AVISO_PUBLICAR, PASO_PUBLICAR, PRONTO_PUBLICAR, hitosCrear, origenCrear } from './taps.crear';

/** Lo que exporta public/taps-engine/disenador.js (la lógica del prototipo, extraída sin cambiar su comportamiento). */
export interface IDisenadorModule {
  montarDisenador(raiz: HTMLElement, opciones: {
    enviar?: (path: string) => void;
    alEvento?: (nombreCorto: string) => void;
    pasoPublicar?: { texto: string; alTocar?: () => void };
    /** Cómo quitar `#look=` de la URL sin pisar el estado del router (la página suelta usa history directamente). */
    limpiarHash?: () => void;
  }): Promise<{ ok: boolean; registro?: string[]; destruir(): void }>;
}

/**
 * Dónde vive el diseñador: archivos estáticos del mismo origen (public/taps-engine), fuera del bundle, como el motor
 * (taps-engine.loader.ts). nginx lo sirve con `no-cache`; la query evita que una caché vieja entregue el módulo anterior.
 */
const DISENADOR_VERSION = '1';
export const DISENADOR_URL = `/taps-engine/disenador.js?v=${DISENADOR_VERSION}`;
/** Cómo se carga el módulo (inyectable para probar el componente sin servir los estáticos). */
export const DISENADOR_LOADER = new InjectionToken<() => Promise<IDisenadorModule>>('DISENADOR_LOADER', {
  providedIn: 'root',
  factory: () => () => { const url = DISENADOR_URL; return import(/* @vite-ignore */ url) as Promise<IDisenadorModule>; },
});

/**
 * Ruta /crear (PR-6 del plan, producto/taps/disenador-plan-ux.md §A y §5): el diseñador de personajes dentro de la web.
 * Envuelve `taps-engine/disenador.js` (misma lógica y mismas claves de localStorage `taps.disenador.*` que disenador.html)
 * y añade lo que es de la web: el cuarto punto de progreso «Publicar (con cuenta)» visible desde el inicio (sin gancho aún:
 * PR-8), la cinta de transparencia de §A.3.1 (una vez por navegador, sobre la vista previa, no modal) y la analítica
 * `taps/crear/*` por AnalyticsService (los `taps/disenador/*` del diseñador salen por el mismo canal, una sola vez).
 * Todo lo del DOM ocurre tras el primer render en el navegador: el prerender solo deja el esqueleto.
 */
@Component({
  selector: 'gems-tap-disenador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crear" [class.crear--listo]="listo()">
      @if (fallo()) {
        <p class="crear__carga" role="alert">No se pudo cargar el creador. Revisa la conexión y vuelve a intentar.</p>
      } @else if (!listo()) {
        <p class="crear__carga" aria-live="polite">Cargando el creador de personajes…</p>
      }
      <div class="dsn" #raiz></div>
      <!-- Avisos de la web: nacen aquí y se mueven a la ranura sobre la vista previa cuando el diseñador está montado. -->
      <div class="crear__avisos" #avisos>
        <div class="cinta" role="region" aria-label="Antes de empezar" [hidden]="!cinta()">
          <p>{{ CINTA }}</p>
          <button type="button" class="primario" (click)="entendido()">Entendido</button>
        </div>
        <div class="cinta cinta--pronto" role="status" aria-live="polite" [hidden]="!pronto()">
          <p>{{ PRONTO }}</p>
          <button type="button" class="cerrar" aria-label="Cerrar" (click)="cerrarPronto()"><svg class="ic" aria-hidden="true"><use href="#i-cerrar"/></svg></button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; background: #0f0e17; color: #ecebf5; min-height: 100dvh; }
    .crear { position: relative; min-height: 100dvh; }
    .crear__carga { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; padding: 24px; text-align: center; font: 15px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #a6a3c0; }
    .crear--listo .crear__carga { display: none; }
    .crear__avisos:empty { display: none; }
  `,
})
export class TapDisenadorComponent {
  protected readonly CINTA = CINTA_TRANSPARENCIA;
  protected readonly PRONTO = PRONTO_PUBLICAR;
  protected readonly listo = signal(false);
  protected readonly fallo = signal(false);
  protected readonly cinta = signal(false);
  protected readonly pronto = signal(false);

  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly avisos = viewChild.required<ElementRef<HTMLElement>>('avisos');
  private readonly analytics = inject(AnalyticsService);
  private readonly loader = inject(DISENADOR_LOADER);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Hitos del embudo ya contados en esta visita (cada uno una vez). */
  private readonly hitos = new Set<string>();
  private disenador: { destruir(): void } | null = null;
  /** Se salió de la ruta: lo que el montaje asíncrono devuelva después se destruye en el acto y no toca señales. */
  private destruido = false;

  constructor() {
    if (this.isBrowser) afterNextRender(() => void this.montar());
    this.destroyRef.onDestroy(() => { this.destruido = true; this.disenador?.destruir(); this.disenador = null; });
  }

  private async montar(): Promise<void> {
    let resultado: Awaited<ReturnType<IDisenadorModule['montarDisenador']>>;
    try {
      const modulo = await this.loader();
      if (this.destruido) return;
      resultado = await modulo.montarDisenador(this.raiz().nativeElement, {
        enviar: path => this.analytics.event(path as TEventPath),
        alEvento: nombre => this.alEvento(nombre),
        pasoPublicar: { texto: PASO_PUBLICAR, alTocar: () => this.publicar() },
        limpiarHash: () => this.location.replaceState(location.pathname, location.search),
      });
    } catch {
      if (!this.destruido) { this.fallo.set(true); this.contar('taps/crear/error/carga'); }
      return;
    }
    if (this.destruido) { resultado.destruir(); return; }
    if (!resultado.ok) { this.fallo.set(true); return; }
    this.disenador = resultado;
    this.listo.set(true);
    // La cinta y el aviso de «Publicar» van sobre la vista previa (ranura del diseñador), no como modal.
    const ranura = this.raiz().nativeElement.querySelector('#ranuraVista');
    const avisos = this.avisos().nativeElement;
    if (ranura) { ranura.append(...Array.from(avisos.children)); }
    this.ofrecerCinta();
  }

  /** `taps/disenador/*` ya viajó por `enviar`; aquí solo se derivan los hitos `taps/crear/*` del embudo (§A.4). */
  private alEvento(nombreCorto: string): void {
    if (nombreCorto.startsWith('abrir/')) {
      this.contar(`taps/crear/abrir/${origenCrear(location.search, nombreCorto)}`);
      return;
    }
    for (const hito of hitosCrear(nombreCorto, this.hitos)) this.contar(hito);
  }

  /** §A.3.1: una sola vez por navegador; «Entendido» la cierra y se recuerda. Sin almacenamiento, se muestra cada vez. */
  private ofrecerCinta(): void {
    if (this.leer(CLAVE_AVISO_PUBLICAR)) return;
    this.cinta.set(true);
    this.contar('taps/crear/aviso-publicar/visto');
  }

  protected entendido(): void {
    this.cinta.set(false);
    this.escribir(CLAVE_AVISO_PUBLICAR, '1');
    this.contar('taps/crear/aviso-publicar/entendido');
    this.enfocarDisenador();
  }

  protected cerrarPronto(): void {
    this.pronto.set(false);
    this.enfocarDisenador();
  }

  /** Al cerrar un aviso el foco no cae al body: vuelve al título del paso (o al primer punto de partida). */
  private enfocarDisenador(): void {
    const raiz = this.raiz().nativeElement;
    const titulo = raiz.querySelector<HTMLElement>('#titulo');
    if (titulo) { titulo.tabIndex = -1; titulo.focus(); return; }
    raiz.querySelector<HTMLElement>('.tarjeta, button')?.focus();
  }

  /** El gancho real (hoja inferior con registro y borrador adjunto) es PR-8: hoy solo se dice que llega pronto. */
  private publicar(): void {
    this.pronto.set(true);
    this.contar('taps/crear/intento-publicar/sin-cuenta');
  }

  private contar(path: TEventPath): void { this.analytics.event(path); }
  private leer(clave: string): string | null { try { return localStorage.getItem(clave); } catch { return null; } }
  private escribir(clave: string, valor: string): void { try { localStorage.setItem(clave, valor); } catch { /* modo privado: la cinta vuelve a salir */ } }
}
