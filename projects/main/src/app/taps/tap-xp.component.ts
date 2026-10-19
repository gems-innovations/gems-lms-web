import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { LoadingGate, SkeletonComponent } from 'shared/loading';
import { TPartidaEstado, frasePercentil, frasePuesto, numero } from './taps.ranking';

/**
 * Tarjeta de XP del resultado (competencia-y-recompensas.md §4.3): «+60 XP», «Puesto 7 de 120 esta semana» y «Mejor que el
 * 72 % de hoy». Solo con datos reales del API: mientras llegan, un esqueleto (tras 300 ms, mínimo 500 ms); si el API no
 * responde (404 mientras se despliega, 429, sin red) la tarjeta no aparece. La cifra sube con una animación corta que se
 * apaga con prefers-reduced-motion; el lector de pantalla oye la frase completa una sola vez.
 */
@Component({
  selector: 'gems-tap-xp',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="xp-live" aria-live="polite">
      @if (datos(); as d) {
        <div class="xp">
          <p class="xp__gana" aria-hidden="true">
            <span class="gm-icono xp__icono"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3.5 14.6 9l5.9.6-4.4 4 1.3 5.9L12 16.5l-5.4 3 1.3-5.9-4.4-4 5.9-.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
            <span class="xp__num">+{{ mostrado() }} XP</span>
          </p>
          <ul class="xp__lineas" aria-hidden="true">
            @if (puesto()) { <li>{{ puesto() }}</li> }
            @if (percentil()) { <li>{{ percentil() }}</li> }
          </ul>
          <button type="button" class="xp__ver" (click)="ranking.emit()">Ver ranking</button>
          <p class="visually-hidden">Ganaste {{ d.xpGanado }} XP. {{ puesto() }}. {{ percentil() }}.</p>
        </div>
      } @else if (cargando()) {
        <div class="xp xp--cargando" aria-busy="true">
          <span class="visually-hidden">Calculando tu XP</span>
          <lib-skeleton shape="title" width="42%" />
          <lib-skeleton shape="text" [lines]="1" width="72%" />
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .xp { display: grid; justify-items: center; gap: 4px; margin: 0 0 12px; padding: 10px 12px; border-radius: 16px;
      background: linear-gradient(155deg, rgba(255, 255, 255, .1), transparent 60%), rgba(77, 225, 255, .08); border: 1px solid rgba(77, 225, 255, .28);
      animation: xp-in var(--dur-base, .32s) var(--curva-estandar, cubic-bezier(.2, 0, 0, 1)); }
    .xp--cargando { min-height: 74px; align-content: center; background: rgba(255, 255, 255, .05); border-color: rgba(255, 255, 255, .1); animation: none;
      lib-skeleton { display: flex; justify-content: center; width: 100%; } }
    .xp__gana { display: inline-flex; align-items: center; gap: 8px; margin: 0; }
    .xp__icono { --caja: 30px; --tinte: #4de1ff; color: #4de1ff; }
    .xp__num { font-size: 1.5rem; font-weight: 800; letter-spacing: -.01em; color: #fff; font-variant-numeric: tabular-nums; }
    .xp__lineas { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 14px; margin: 0; padding: 0; list-style: none;
      font-size: .9375rem; font-weight: 700; color: #dfe6ef; font-variant-numeric: tabular-nums; }
    .xp__ver { min-height: 44px; padding: 0 14px; border: 0; background: none; color: #9fe9ff; font: inherit; font-size: .9375rem; font-weight: 800;
      text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
    .xp__ver:focus-visible { outline: 3px solid #fff; outline-offset: 2px; border-radius: 8px; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    @keyframes xp-in { from { opacity: 0; transform: translateY(6px) scale(.98); } }
    @media (prefers-reduced-motion: reduce) { .xp { animation: none; } }
  `,
})
export class TapXpComponent {
  readonly estado = input<TPartidaEstado | undefined>(undefined);
  readonly ranking = output<void>();

  protected readonly datos = computed(() => { const e = this.estado(); return e?.estado === 'listo' ? e.datos : null; });
  protected readonly puesto = computed(() => { const d = this.datos(); return d ? frasePuesto(d.semana.puesto, d.semana.jugadores) : null; });
  protected readonly percentil = computed(() => { const d = this.datos(); return d ? frasePercentil(d.hoy.percentil, d.hoy.jugadores) : null; });
  protected readonly cargando = signal(false);
  protected readonly mostrado = signal('0');

  private readonly gate = new LoadingGate(v => this.cargando.set(v), 300, 500);
  private frame = 0;

  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => { this.gate.dispose(); if (this.frame) cancelAnimationFrame(this.frame); });
    effect(() => {
      const e = this.estado();
      untracked(() => this.gate.set(e?.estado === 'enviando'));
    });
    effect(() => {
      const d = this.datos();
      untracked(() => { if (d) this.contar(d.xpGanado); });
    });
  }

  /** La cifra sube de 0 al total en ~0,6 s (sin animación con movimiento reducido). */
  private contar(total: number): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    const quieto = typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof requestAnimationFrame !== 'function';
    if (quieto || total <= 0) { this.mostrado.set(numero(total)); return; }
    const inicio = performance.now(), dur = 600;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / dur), suave = 1 - Math.pow(1 - k, 3);
      this.mostrado.set(numero(total * suave));
      this.frame = k < 1 ? requestAnimationFrame(paso) : 0;
    };
    this.frame = requestAnimationFrame(paso);
  }
}
