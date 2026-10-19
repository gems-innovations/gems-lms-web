import { Directive, ElementRef, afterNextRender, effect, inject, input, DestroyRef } from '@angular/core';
import { I18nService } from 'shared/core';

/** True when the user asked the OS or the platform's display preferences for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('reduce-motion');
}

/**
 * Aparece con un leve desplazamiento cuando entra en pantalla. Con un índice, los elementos
 * de una misma lista entran en cascada: `<div libReveal [revealIndex]="i">`.
 */
@Directive({
  selector: '[libReveal]',
  host: { class: 'lib-reveal' },
})
export class RevealDirective {
  readonly revealIndex = input<number>(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const node = this.el.nativeElement;
      node.style.setProperty('--reveal-delay', `${Math.min(this.revealIndex(), 12) * 55}ms`);
      if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
        node.classList.add('lib-reveal--in');
        return;
      }
      const observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          node.classList.add('lib-reveal--in');
          observer.disconnect();
        }
      }, { rootMargin: '0px 0px -8% 0px' });
      observer.observe(node);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

/**
 * Cuenta desde el valor anterior hasta el nuevo: `<span [libCountUp]="total()" suffix="%">`.
 * Respeta los decimales pedidos y el formato es-CO para los miles.
 */
@Directive({
  selector: '[libCountUp]',
})
export class CountUpDirective {
  readonly libCountUp = input<number | null | undefined>(0);
  readonly decimals = input<number>(0);
  readonly suffix = input<string>('');
  readonly duration = input<number>(900);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly i18n = inject(I18nService);
  private current = 0;
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => {
      const target = Number(this.libCountUp() ?? 0);
      const decimals = this.decimals();
      const suffix = this.suffix();
      if (typeof window === 'undefined' || prefersReducedMotion() || !Number.isFinite(target)) {
        this.render(target, decimals, suffix);
        return;
      }
      cancelAnimationFrame(this.frame);
      const from = this.current;
      const start = performance.now();
      const duration = this.duration();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        this.render(from + (target - from) * eased, decimals, suffix);
        if (t < 1) this.frame = requestAnimationFrame(step);
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  private render(value: number, decimals: number, suffix: string): void {
    this.current = value;
    this.el.nativeElement.textContent = value.toLocaleString(this.i18n.locale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
  }
}

/**
 * Anima altas, bajas y reordenamientos de los hijos directos (filtros, búsquedas, listas que
 * cambian) con @formkit/auto-animate, cargado solo en el navegador.
 */
@Directive({
  selector: '[libAutoAnimate]',
})
export class AutoAnimateDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(async () => {
      if (prefersReducedMotion()) return;
      const { default: autoAnimate } = await import('@formkit/auto-animate');
      autoAnimate(this.el.nativeElement, { duration: 220, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    });
  }
}

/** Confeti para logros (curso completado, certificado). Carga la librería solo cuando se usa. */
export async function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }): Promise<void> {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#7B6FF0', '#4DE1FF', '#3DD6C8', '#C471ED', '#FBBF24'];
  confetti({ particleCount: 90, spread: 70, startVelocity: 38, origin, colors, zIndex: 1090, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 50, spread: 110, startVelocity: 28, origin, colors, zIndex: 1090, disableForReducedMotion: true }), 180);
}

// ── Retroalimentación compartida (mismo lenguaje que Taps). Las clases viven en _movimiento.scss. ──

/** Reinicia una animación CSS de una sola vez (gm-acierto, gm-error, gm-pop…) aunque la clase ya estuviera puesta. */
export function animarClase(el: Element | null | undefined, clase: string): void {
  if (!el) return;
  el.classList.remove(clase);
  void (el as HTMLElement).offsetWidth; // fuerza el reinicio de la animación
  el.classList.add(clase);
}

/** Acierto: rebote corto con destello verde (con movimiento reducido, solo el destello). */
export const marcarAcierto = (el: Element | null | undefined): void => animarClase(el, 'gm-acierto');

/** Error: sacudida corta con destello rojo (con movimiento reducido, solo el destello). */
export const marcarError = (el: Element | null | undefined): void => animarClase(el, 'gm-error');

/**
 * Confeti contenido: sale del elemento (no de media pantalla), con pocas piezas y los colores de GEMS.
 * Para logros pequeños (racha, reto resuelto). Para logros grandes, `celebrate()`.
 */
export async function celebrarEn(el: Element | null | undefined, piezas = 36): Promise<void> {
  if (!el || typeof window === 'undefined' || prefersReducedMotion()) return;
  const r = el.getBoundingClientRect();
  const origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
  const { default: confetti } = await import('canvas-confetti');
  confetti({
    particleCount: piezas, spread: 55, startVelocity: 24, gravity: 1.1, ticks: 120, scalar: 0.8, origin, zIndex: 1090,
    colors: ['#7B6FF0', '#4DE1FF', '#C471ED', '#34D399'], disableForReducedMotion: true,
  });
}
