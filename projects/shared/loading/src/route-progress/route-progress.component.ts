import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, signal, untracked } from '@angular/core';
import { LoadingGate } from '../loading-timing';

/**
 * Barra de progreso delgada (3 px) arriba de la pantalla para cambios de página que tardan (descarga del chunk,
 * guards, resolvers). No aparece si la navegación dura menos de `delay` (200 ms); avanza sola hasta ~88 % con una
 * curva que frena (nunca «se queda quieta») y al terminar se completa y se desvanece. Solo anima transform/opacity.
 *
 * Es decorativa (aria-hidden): el cambio de título de la página ya lo anuncia el router. Ver ESTADOS-DE-CARGA.md.
 *
 *   <lib-route-progress [active]="navegando()" />
 */
@Component({
  selector: 'lib-route-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<i class="rp__bar" [class.rp__bar--run]="phase() === 'run'" [class.rp__bar--done]="phase() === 'done'"></i>`,
  host: { 'aria-hidden': 'true', '[class.rp--on]': 'phase() === "run"' },
  styles: [`
    :host { position: fixed; inset: 0 0 auto 0; z-index: var(--z-progreso-ruta, 2100); height: 3px; pointer-events: none; opacity: 0;
      transition: opacity var(--dur-base, 200ms) var(--curva-estandar, ease) 150ms; }
    :host(.rp--on) { opacity: 1; transition-delay: 0ms; }
    .rp__bar { display: block; height: 100%; transform-origin: 0 50%; transform: scaleX(0);
      background: linear-gradient(90deg, var(--color-primario, #7b6ff0), var(--color-acento, #4de1ff));
      box-shadow: 0 0 10px color-mix(in srgb, var(--color-acento, #4de1ff) 60%, transparent); border-radius: 0 3px 3px 0; }
    .rp__bar--run { animation: rp-trickle 8s cubic-bezier(0.08, 0.7, 0.2, 1) forwards; }
    .rp__bar--done { transform: scaleX(1); transition: transform var(--dur-base, 200ms) var(--curva-salida, ease-out); }
    @keyframes rp-trickle { 0% { transform: scaleX(0.08); } 30% { transform: scaleX(0.55); } 100% { transform: scaleX(0.88); } }
    @media (prefers-reduced-motion: reduce) { .rp__bar--run { animation: none; transform: scaleX(0.6); } }
    :host-context(html.reduce-motion) .rp__bar--run { animation: none; transform: scaleX(0.6); }
  `],
})
export class RouteProgressComponent implements OnDestroy {
  /** true mientras hay una navegación en curso. */
  readonly active = input(false);
  /** ms antes de mostrarse (las navegaciones rápidas no la ven). */
  readonly delay = input(200);

  private readonly visible = signal(false);
  private readonly finishing = signal(false);
  protected readonly phase = computed<'idle' | 'run' | 'done'>(() =>
    this.finishing() ? 'done' : this.visible() ? 'run' : 'idle');

  private gate: LoadingGate | null = null;
  private doneTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const active = this.active();
      untracked(() => {
        this.gate ??= new LoadingGate(v => this.onVisible(v), this.delay(), 300);
        this.gate.set(active);
      });
    });
  }

  private onVisible(visible: boolean): void {
    clearTimeout(this.doneTimer);
    if (visible) { this.finishing.set(false); this.visible.set(true); return; }
    // Se completa al 100 % y se desvanece (host sin .rp--on); la barra vuelve a 0 ya invisible.
    this.finishing.set(true);
    this.doneTimer = setTimeout(() => { this.finishing.set(false); this.visible.set(false); }, 400);
  }

  ngOnDestroy(): void {
    this.gate?.dispose();
    clearTimeout(this.doneTimer);
  }
}
