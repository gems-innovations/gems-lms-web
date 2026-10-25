import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, InjectionToken, Injector, PLATFORM_ID, afterNextRender, inject, signal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../analytics.service';
import { TEventPath } from '../analytics-taxonomy';
import { CINTA_TRANSPARENCIA, CLAVE_AVISO_PUBLICAR, COPY_GANCHO, PASO_PUBLICAR, enlaceRegistro, hitosCrear, origenCrear } from './taps.crear';

/** Lo que el diseñador entrega al tocar «Publicar (con cuenta)»: el id del borrador local (ya guardado) y el enlace del look. */
export interface IContextoPublicar {
  borradorId: string | null;
  /** Enlace `#look=` de compartir.js con el personaje completo (no viaja a ningún servidor). */
  enlace: string;
  nombre: string;
}

/** Lo que exporta public/taps-engine/disenador.js (la lógica del prototipo, extraída sin cambiar su comportamiento). */
export interface IDisenadorModule {
  montarDisenador(raiz: HTMLElement, opciones: {
    enviar?: (path: string) => void;
    alEvento?: (nombreCorto: string) => void;
    pasoPublicar?: { texto: string; alTocar?: (contexto: IContextoPublicar) => void };
    /** Cómo quitar `#look=` de la URL sin pisar el estado del router (la página suelta usa history directamente). */
    limpiarHash?: () => void;
  }): Promise<{ ok: boolean; registro?: string[]; destruir(): void }>;
}

/**
 * Dónde vive el diseñador: archivos estáticos del mismo origen (public/taps-engine), fuera del bundle, como el motor
 * (taps-engine.loader.ts). nginx lo sirve con `no-cache`; la query evita que una caché vieja entregue el módulo anterior.
 */
const DISENADOR_VERSION = '2';
export const DISENADOR_URL = `/taps-engine/disenador.js?v=${DISENADOR_VERSION}`;
/** Cómo se carga el módulo (inyectable para probar el componente sin servir los estáticos). */
export const DISENADOR_LOADER = new InjectionToken<() => Promise<IDisenadorModule>>('DISENADOR_LOADER', {
  providedIn: 'root',
  factory: () => () => { const url = DISENADOR_URL; return import(/* @vite-ignore */ url) as Promise<IDisenadorModule>; },
});

/**
 * Ruta /crear (PR-6 y PR-8 del plan, producto/taps/disenador-plan-ux.md §A y §5): el diseñador de personajes dentro de la web.
 * Envuelve `taps-engine/disenador.js` (misma lógica y mismas claves de localStorage `taps.disenador.*` que disenador.html)
 * y añade lo que es de la web: el cuarto punto de progreso «Publicar (con cuenta)» visible desde el inicio, la cinta de
 * transparencia de §A.3.1 (una vez por navegador, sobre la vista previa, no modal), la hoja inferior del gancho de §A.3.2
 * (tres salidas: docente → /instituciones con el borrador adjunto, estudiante → enlace del look, volver) y la analítica
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
      </div>
      <!-- Gancho de «Publicar» sin sesión (§A.3.2): hoja inferior con el personaje detrás; foco atrapado, Escape vuelve. -->
      <div class="gancho" #gancho role="dialog" aria-modal="true" aria-labelledby="ganchoTitulo" aria-describedby="ganchoIntro"
           [hidden]="!hoja()" (keydown)="teclaHoja($event)" (pointerdown)="fondoAbajo($event)" (click)="fondoHoja($event)">
        <div class="gancho__hoja">
          <h2 id="ganchoTitulo" tabindex="-1">{{ G.titulo }}</h2>
          <p id="ganchoIntro" class="gancho__intro">{{ G.intro }}</p>
          @if (!estudiante()) {
            <ul class="gancho__ganas" aria-label="Qué ganas al publicar">
              <li><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.6.4l3-3a4 4 0 0 0-5.6-5.6l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.6-.4l-3 3a4 4 0 0 0 5.6 5.6l1.5-1.5"/></svg>{{ G.ganas[0] }}</li>
              <li><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 16V10M12 16V5M17 16v-7"/></svg>{{ G.ganas[1] }}</li>
              <li><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h1a4 4 0 0 0 4-4 9 9 0 0 0-8-10z"/><circle cx="7.5" cy="12" r="1.2"/><circle cx="10" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/></svg>{{ G.ganas[2] }}</li>
            </ul>
            <button type="button" class="gancho__btn gancho__btn--primario" id="ganchoDocente" (click)="docente()">{{ G.docente }}</button>
            <p class="gancho__nota">{{ G.docenteDetalle }}</p>
            <button type="button" class="gancho__btn" id="ganchoEstudiante" (click)="verEstudiante()">{{ G.estudiante }}</button>
          } @else {
            <p class="gancho__estudiante" id="ganchoEstudianteTexto">{{ G.estudianteDetalle }}</p>
            <button type="button" class="gancho__btn gancho__btn--primario" id="ganchoCopiar" (click)="copiar()">
              <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>{{ G.copiar }}
            </button>
            <div class="gancho__enlace" [hidden]="!enlaceVisible()">
              <input #enlaceInput readonly aria-label="Enlace de tu personaje" [value]="contexto()?.enlace ?? ''" (focus)="seleccionarEnlace()" />
            </div>
            <p class="gancho__estado" role="status" aria-live="polite">{{ estadoCopia() }}</p>
          }
          <button type="button" class="gancho__btn gancho__btn--terciario" id="ganchoVolver" (click)="volver()">{{ G.volver }}</button>
          <p class="gancho__conserva">{{ G.conserva }}</p>
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
    /* La hoja: mismos tonos que el diseñador (disenador.css), personaje visible detrás. */
    .gancho { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; justify-content: center; padding: 12px; padding-bottom: max(12px, env(safe-area-inset-bottom)); background: rgba(15,14,23,.72); font: 15px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ecebf5; }
    .gancho[hidden] { display: none; }
    .gancho__hoja { width: 100%; max-width: 440px; max-height: calc(100dvh - 24px); overflow: auto; background: #1a1926; border: 1px solid #2e2c42; border-radius: 20px; padding: 18px 16px; display: grid; gap: 10px; }
    .gancho h2 { margin: 0; font-size: 18px; line-height: 1.25; }
    .gancho p { margin: 0; }
    .gancho__intro, .gancho__nota, .gancho__estudiante, .gancho__conserva { color: #a6a3c0; font-size: 13px; }
    .gancho__ganas { list-style: none; margin: 2px 0 4px; padding: 0; display: grid; gap: 8px; }
    .gancho__ganas li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .ic { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .gancho__ganas .ic { color: #d3b27a; }
    .gancho__btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; font: inherit; font-weight: 600; color: #ecebf5; background: #221f33; border: 1px solid #2e2c42; border-radius: 12px; padding: 10px 14px; cursor: pointer; touch-action: manipulation; }
    .gancho__btn--primario { background: #d3b27a; border-color: #d3b27a; color: #1a1408; }
    .gancho__btn--terciario { background: transparent; border-color: transparent; color: #a6a3c0; min-height: 44px; font-weight: 500; }
    .gancho__btn:focus-visible, .gancho__enlace input:focus-visible { outline: 2px solid #d3b27a; outline-offset: 2px; }
    .gancho__nota { margin-top: -4px; }
    .gancho__enlace input { width: 100%; box-sizing: border-box; font: 13px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; color: #ecebf5; background: #0f0e17; border: 1px solid #2e2c42; border-radius: 10px; padding: 10px 12px; }
    .gancho__estado { min-height: 1.2em; font-size: 13px; color: #34d399; }
    .gancho__estado:empty { display: none; }
    .gancho__conserva { text-align: center; }
    @media (min-width: 820px) { .gancho { align-items: center; } }
  `,
})
export class TapDisenadorComponent {
  protected readonly CINTA = CINTA_TRANSPARENCIA;
  protected readonly G = COPY_GANCHO;
  protected readonly listo = signal(false);
  protected readonly fallo = signal(false);
  protected readonly cinta = signal(false);
  /** Hoja del gancho abierta. */
  protected readonly hoja = signal(false);
  /** Dentro de la hoja: la salida de estudiante (copiar enlace) en vez de las tres opciones. */
  protected readonly estudiante = signal(false);
  protected readonly enlaceVisible = signal(false);
  protected readonly estadoCopia = signal('');
  protected readonly contexto = signal<IContextoPublicar | null>(null);

  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly avisos = viewChild.required<ElementRef<HTMLElement>>('avisos');
  private readonly gancho = viewChild.required<ElementRef<HTMLElement>>('gancho');
  private readonly enlaceInput = viewChild<ElementRef<HTMLInputElement>>('enlaceInput');
  private readonly analytics = inject(AnalyticsService);
  private readonly loader = inject(DISENADOR_LOADER);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Hitos del embudo ya contados en esta visita (cada uno una vez). */
  private readonly hitos = new Set<string>();
  private disenador: { destruir(): void } | null = null;
  /** Se salió de la ruta: lo que el montaje asíncrono devuelva después se destruye en el acto y no toca señales. */
  private destruido = false;
  /** Quién tenía el foco al abrir la hoja (vuelve ahí al cerrarla). */
  private focoAnterior: HTMLElement | null = null;

  constructor() {
    if (this.isBrowser) afterNextRender(() => void this.montar());
    this.destroyRef.onDestroy(() => { this.destruido = true; if (this.hoja()) this.inerte(false); this.disenador?.destruir(); this.disenador = null; });
  }

  private async montar(): Promise<void> {
    let resultado: Awaited<ReturnType<IDisenadorModule['montarDisenador']>>;
    try {
      const modulo = await this.loader();
      if (this.destruido) return;
      resultado = await modulo.montarDisenador(this.raiz().nativeElement, {
        enviar: path => this.analytics.event(path as TEventPath),
        alEvento: nombre => this.alEvento(nombre),
        pasoPublicar: { texto: PASO_PUBLICAR, alTocar: contexto => this.publicar(contexto) },
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
    // La cinta va sobre la vista previa (ranura del diseñador), no como modal.
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

  /** Al cerrar un aviso el foco no cae al body: vuelve al título del paso (o al primer punto de partida). */
  private enfocarDisenador(): void {
    const raiz = this.raiz().nativeElement;
    const titulo = raiz.querySelector<HTMLElement>('#titulo');
    if (titulo) { titulo.tabIndex = -1; titulo.focus(); return; }
    raiz.querySelector<HTMLElement>('.tarjeta, button')?.focus();
  }

  // ───────────── gancho de «Publicar» (§A.3.2): sin sesión siempre, hasta que PR-10 traiga el estudio con cuenta ─────────────

  /** Abre la hoja con el personaje detrás; el diseñador queda inerte (sin foco ni toques) mientras está abierta. */
  private publicar(contexto: IContextoPublicar): void {
    this.contexto.set(contexto);
    this.estudiante.set(false); this.enlaceVisible.set(false); this.estadoCopia.set('');
    const activo = document.activeElement;
    this.focoAnterior = activo instanceof HTMLElement && this.raiz().nativeElement.contains(activo) ? activo : null;
    this.hoja.set(true);
    this.inerte(true);
    this.contar('taps/crear/intento-publicar/sin-cuenta');
    this.trasPintar(() => this.gancho().nativeElement.querySelector<HTMLElement>('h2')?.focus());
  }

  private cerrarHoja(): void {
    this.hoja.set(false);
    this.inerte(false);
    const volverA = this.focoAnterior?.isConnected ? this.focoAnterior : this.raiz().nativeElement.querySelector<HTMLElement>('#publicar');
    if (volverA) volverA.focus(); else this.enfocarDisenador();
    this.focoAnterior = null;
  }

  /** «Soy docente o institución»: al formulario de /instituciones con el borrador adjunto (id local) y de dónde viene. */
  protected docente(): void {
    this.contar('taps/crear/gancho/docente');
    const destino = enlaceRegistro(this.contexto()?.borradorId ?? null);
    this.hoja.set(false); this.inerte(false);
    void this.router.navigate([destino.ruta], { queryParams: destino.query, fragment: destino.fragment });
  }

  /** «Soy estudiante»: nada de registro ni datos; solo cómo mandarle el personaje a su docente. */
  protected verEstudiante(): void {
    this.contar('taps/crear/gancho/estudiante');
    this.estudiante.set(true);
    this.trasPintar(() => this.gancho().nativeElement.querySelector<HTMLElement>('#ganchoCopiar')?.focus());
  }

  /** Copiar (o compartir) el enlace del look: la hoja del sistema si existe, el portapapeles si no, y si falla, el enlace a la vista. */
  protected async copiar(): Promise<void> {
    const c = this.contexto(); if (!c) return;
    // `gancho/copiar` solo cuenta cuando el enlace salió de verdad (hoja del sistema resuelta o portapapeles escrito).
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: `Mira a ${c.nombre}`, text: 'Te mando mi personaje. Ábrelo y cámbialo a tu gusto.', url: c.enlace }); this.estadoCopia.set(this.G.compartido); this.contar('taps/crear/gancho/copiar'); return; }
      catch (e) { if ((e as { name?: string })?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(c.enlace); this.estadoCopia.set(this.G.copiado); this.contar('taps/crear/gancho/copiar'); return; } catch { /* sin portapapeles */ }
    this.enlaceVisible.set(true); this.estadoCopia.set(this.G.sinCopiar);
    this.trasPintar(() => this.enlaceInput()?.nativeElement.focus());
  }

  protected seleccionarEnlace(): void { try { this.enlaceInput()?.nativeElement.select(); } catch { /* nada */ } }

  protected volver(): void {
    this.contar('taps/crear/gancho/volver');
    this.cerrarHoja();
  }

  /** Tocar el fondo oscuro (fuera de la hoja) equivale a «Volver», solo si el gesto empezó y terminó en el fondo (arrastrar para seleccionar el enlace y soltar fuera no cierra). */
  private gestoEnFondo = false;
  protected fondoAbajo(ev: PointerEvent): void { this.gestoEnFondo = ev.target === this.gancho().nativeElement; }
  protected fondoHoja(ev: MouseEvent): void {
    const enFondo = this.gestoEnFondo && ev.target === this.gancho().nativeElement;
    this.gestoEnFondo = false;
    if (enFondo) this.volver();
  }

  /** El diseñador no recibe foco ni toques mientras la hoja está abierta: `inert`, o `aria-hidden` donde no exista. */
  private inerte(si: boolean): void {
    const raiz = this.raiz().nativeElement;
    if ('inert' in HTMLElement.prototype) { raiz.inert = si; return; }
    if (si) raiz.setAttribute('aria-hidden', 'true'); else raiz.removeAttribute('aria-hidden');
  }

  /** Escape vuelve; Tab y Shift+Tab giran dentro de la hoja (foco atrapado). */
  protected teclaHoja(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') { ev.preventDefault(); this.volver(); return; }
    if (ev.key !== 'Tab') return;
    const focables = Array.from(this.gancho().nativeElement.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')).filter(e => !e.hidden && e.offsetParent !== null);
    if (!focables.length) return;
    const primero = focables[0], ultimo = focables[focables.length - 1], activo = document.activeElement;
    if (ev.shiftKey && (activo === primero || !focables.includes(activo as HTMLElement))) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
  }

  /** Mover el foco a algo que la señal acaba de mostrar: cuando Angular ya lo pintó. */
  private trasPintar(fn: () => void): void { afterNextRender(fn, { injector: this.injector }); }

  private contar(path: TEventPath): void { this.analytics.event(path); }
  private leer(clave: string): string | null { try { return localStorage.getItem(clave); } catch { return null; } }
  private escribir(clave: string, valor: string): void { try { localStorage.setItem(clave, valor); } catch { /* modo privado: la cinta vuelve a salir */ } }
}
