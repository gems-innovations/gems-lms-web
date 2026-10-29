import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Injectable, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { loadTapsEngine, tapsThemeUrl } from './taps-engine.loader';
import { portadasAnimadas } from './taps.social';
import { ITap, ITapsEngineModule, ITapsStage } from './taps.types';

interface IEscenario { theme: string; stage: ITapsStage; el: HTMLElement | null }

/**
 * Portadas vivas de Explorar: la escena y el personaje de cada Tap con el motor real en modo LIGERO (DOM + CSS, sin WebGL
 * ni audio). Cuida batería y memoria:
 * - Solo las tarjetas a la vista (IntersectionObserver) reciben escenario; se reparten al detenerse el desplazamiento.
 * - Hay pocos escenarios (POOL) y se reutilizan: uno del mismo tema se mueve de tarjeta (attachTo + setScene); si faltan, se
 *   destruye uno libre de otro tema. Nunca un motor por Tap.
 * - Solo los primeros ANIMAN a la vista se mueven; los demás quedan en pausa (foto fija del personaje).
 * - Movimiento reducido, ahorro de datos o poca memoria (portadasAnimadas): no se carga el motor; queda la portada fija.
 * - En el prerender no hace nada: el HTML horneado no lleva el motor.
 */
@Injectable()
export class TapsPreviasService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly activo = this.browser && typeof IntersectionObserver !== 'undefined' && portadasAnimadas({
    reducido: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    memoria: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  });
  private readonly ancho = this.browser && typeof matchMedia === 'function' && matchMedia('(min-width: 768px)').matches;
  /** Escenarios vivos como mucho (móvil / escritorio) y cuántos de ellos se animan a la vez. */
  private readonly POOL = this.ancho ? 10 : 6;
  private readonly ANIMAN = this.ancho ? 4 : 2;

  private io: IntersectionObserver | null = null;
  private readonly taps = new Map<HTMLElement, ITap>();
  private readonly vistos = new Set<HTMLElement>();
  private readonly escenarios: IEscenario[] = [];
  private motor: ITapsEngineModule | null = null;
  private cargando = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
      this.io?.disconnect();
      for (const e of this.escenarios.splice(0)) e.stage.destroy();
    });
  }

  observar(el: HTMLElement, tap: ITap): void {
    if (!this.activo) return;
    this.taps.set(el, tap);
    this.io ??= new IntersectionObserver(entradas => {
      for (const e of entradas) { const t = e.target as HTMLElement; if (e.isIntersecting) this.vistos.add(t); else this.vistos.delete(t); }
      this.programar();
    }, { threshold: 0.5 });
    this.io.observe(el);
  }

  dejar(el: HTMLElement): void {
    if (!this.taps.delete(el)) return;
    this.vistos.delete(el);
    this.io?.unobserve(el);
    const e = this.escenarios.find(x => x.el === el);
    if (e) { e.stage.pause('fuera'); e.el = null; }
    this.programar();
  }

  /** Espera a que el desplazamiento se calme: durante un deslizamiento rápido no se crea ni se mueve nada. */
  private programar(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.repartir(); }, 160);
  }

  private repartir(): void {
    if (!this.motor) { void this.cargarMotor(); return; }
    const orden = [...this.vistos].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).slice(0, this.POOL);
    for (const e of this.escenarios) if (e.el && !orden.includes(e.el)) { e.stage.pause('fuera'); e.el = null; }
    orden.forEach((el, i) => {
      const e = this.escenarios.find(x => x.el === el) ?? this.asignar(el);
      if (!e) return;
      if (i < this.ANIMAN) e.stage.resume(); else e.stage.pause('quieta');
    });
  }

  private asignar(el: HTMLElement): IEscenario | null {
    const tap = this.taps.get(el)!;
    // volver a una tarjeta que aún guarda su escenario en pausa: se retoma tal cual, sin moverlo ni repintar
    const quieto = this.escenarios.find(x => !x.el && x.stage.root?.parentElement === el);
    if (quieto) { quieto.el = el; return quieto; }
    let e = this.escenarios.find(x => !x.el && x.theme === tap.theme);
    if (!e) {
      if (this.escenarios.length >= this.POOL) {
        const libre = this.escenarios.findIndex(x => !x.el);
        if (libre < 0) return null;
        this.escenarios.splice(libre, 1)[0].stage.destroy();
      }
      const stage = this.motor!.create(el, { theme: tapsThemeUrl(tap.theme), mode: 'light', audio: { play: () => undefined }, slowMs: 0 });
      const root = stage.root;
      if (root) { root.setAttribute('aria-hidden', 'true'); root.inert = true; root.style.pointerEvents = 'none'; }
      e = { theme: tap.theme, stage, el: null };
      this.escenarios.push(e);
      const nuevo = e;
      stage.ready.catch(() => { const i = this.escenarios.indexOf(nuevo); if (i >= 0) this.escenarios.splice(i, 1); stage.destroy(); });
    }
    e.el = el;
    e.stage.attachTo(el);
    const h = el.clientHeight;
    // la pregunta y el título tapan la mitad de abajo: el personaje se encaja en la de arriba, como en el Tap
    e.stage.setSafeArea?.({ top: Math.round(h * 0.04), bottom: Math.round(h * 0.5) });
    const s = e.stage;
    void s.ready.then(() => (e!.el === el ? s.setScene(tap.scene) : undefined)).catch(() => undefined);
    return e;
  }

  private async cargarMotor(): Promise<void> {
    if (this.cargando) return;
    this.cargando = true;
    try { this.motor = await loadTapsEngine(); this.repartir(); } catch { /* sin motor: portadas fijas */ }
  }
}

/** Marca el hueco de la portada de una tarjeta: el servicio de Explorar le pone (o le quita) su escenario vivo. */
@Directive({ selector: '[gemsTapPrevia]' })
export class TapPreviaDirective {
  readonly gemsTapPrevia = input.required<ITap>();

  constructor() {
    const previas = inject(TapsPreviasService), el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => previas.observar(el, this.gemsTapPrevia()));
    inject(DestroyRef).onDestroy(() => previas.dejar(el));
  }
}
