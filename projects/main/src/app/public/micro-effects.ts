import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Microefectos de la landing con Motion. Todo se descarga bajo demanda (`import('motion')`) y solo en el
 * navegador, así no pesa en la carga inicial. Quien pide menos movimiento no ve ninguno.
 */
const motionAllowed = (): boolean =>
  typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** «Pop»: el elemento se agranda un instante, como confirmación de un acierto. */
export async function pop(el: Element | null | undefined): Promise<void> {
  if (!el || !motionAllowed()) return;
  const { animate } = await import('motion');
  animate(el, { scale: [1, 1.07, 1] }, { duration: 0.35, ease: 'easeOut' });
}

/** La barra se llena desde su ancho anterior hasta el nuevo (0-100). */
export async function fillBar(el: HTMLElement | null | undefined, percent: number): Promise<void> {
  if (!el) return;
  el.style.width = `${percent}%`;
  if (!motionAllowed()) return;
  const { animate } = await import('motion');
  animate(el, { scaleX: [0.92, 1] }, { duration: 0.45, ease: 'easeOut' });
}

/** Un número que sube hasta su valor final (racha, puntaje). */
export async function countUp(el: HTMLElement | null | undefined, to: number, from = 0): Promise<void> {
  if (!el) return;
  if (!motionAllowed()) { el.textContent = String(to); return; }
  const { animate } = await import('motion');
  animate(from, to, { duration: 0.7, ease: 'easeOut', onUpdate: v => { el.textContent = String(Math.round(v)); } });
}

/**
 * La tarjeta se inclina hacia el puntero. Solo con mouse (no en pantallas táctiles) y sin carga previa:
 * Motion se pide la primera vez que el puntero entra.
 */
@Directive({ selector: '[gemsTilt]', standalone: true })
export class TiltDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => {
      if (!motionAllowed() || !window.matchMedia('(hover: hover)').matches) return;
      let animate: typeof import('motion').animate | null = null;
      const load = () => animate ? Promise.resolve(animate) : import('motion').then(m => (animate = m.animate));
      const tilt = (x: number, y: number) => load().then(a => a(this.el, { rotateX: y, rotateY: x }, { duration: 0.25 }));
      this.el.style.transformStyle = 'preserve-3d';
      this.el.addEventListener('pointermove', e => {
        const r = this.el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 6;   // máximo ±3°
        const y = -((e.clientY - r.top) / r.height - 0.5) * 6;
        void tilt(x, y);
      });
      this.el.addEventListener('pointerleave', () => void tilt(0, 0));
    });
  }
}
