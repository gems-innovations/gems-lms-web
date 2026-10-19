import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from 'shared';

/**
 * Microefectos de la landing sin librerías: CSS y requestAnimationFrame. El acierto, el error, la barra y la
 * aparición usan las clases compartidas (.gm-acierto, .gm-error, .gm-progreso, .gm-aparecer) de
 * projects/shared/src/infrastructure/ui/styles/_movimiento.scss. Quien pide menos movimiento no ve ninguno.
 */

/** Un número que sube hasta su valor final (racha, puntaje), con la misma curva de salida del sistema. */
export function countUp(el: HTMLElement | null | undefined, to: number, from = 0, duracion = 600): void {
  if (!el) return;
  if (typeof window === 'undefined' || prefersReducedMotion()) { el.textContent = String(to); return; }
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / duracion);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/**
 * La tarjeta se inclina hacia el puntero (máximo ±3°). Solo con mouse, sin librerías: escribe el transform y deja
 * que una transición corta lo suavice.
 */
@Directive({ selector: '[gemsTilt]', standalone: true })
export class TiltDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return;
      const el = this.el;
      let frame = 0;
      const inclinar = (x: number, y: number) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          el.style.transform = x || y ? `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateY(var(--elevar-hover))` : '';
        });
      };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        inclinar(((e.clientX - r.left) / r.width - 0.5) * 6, -((e.clientY - r.top) / r.height - 0.5) * 6);
      });
      el.addEventListener('pointerleave', () => inclinar(0, 0));
    });
  }
}
