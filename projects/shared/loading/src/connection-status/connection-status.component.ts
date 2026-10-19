import { ChangeDetectionStrategy, Component, OnDestroy, effect, input, signal, untracked } from '@angular/core';

/**
 * Aviso de conexión de toda la app: «Sin conexión» mientras no hay red y «Conexión recuperada» unos segundos al
 * volver. No promete lo que no hacemos (no hay cola de envíos): dice que lo cargado sigue disponible.
 * `placement="bottom"` lo baja para pantallas con controles arriba (Taps).
 *
 *   <lib-connection-status [online]="appStatus.online()" [placement]="enTaps() ? 'bottom' : 'top'" />
 */
@Component({
  selector: 'lib-connection-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-live': 'polite', '[class.cs--bottom]': 'placement() === "bottom"' },
  template: `
    @if (state() !== 'hidden') {
      <div class="cs" [class.cs--back]="state() === 'back'">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          @if (state() === 'offline') {
            <path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.3-1.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M12 20h.01"/>
          } @else {
            <path d="M5 12.9a10 10 0 0 1 14 0M2 8.8a15 15 0 0 1 20 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01"/>
          }
        </svg>
        @if (state() === 'offline') {
          <span><strong>Sin conexión.</strong> Lo que ya cargó sigue aquí; lo nuevo llegará cuando vuelva la señal.</span>
        } @else {
          <span><strong>Conexión recuperada.</strong></span>
        }
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; top: 0.75rem; left: 50%; z-index: 1500; transform: translateX(-50%); width: max-content; max-width: min(92vw, 44rem); pointer-events: none; }
    :host(.cs--bottom) { top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem); }
    .cs { display: flex; gap: 0.6rem; align-items: center; padding: 0.6rem 0.95rem; border-radius: 999px; pointer-events: auto;
      border: 1px solid color-mix(in srgb, var(--color-advertencia) 55%, transparent);
      background: color-mix(in srgb, var(--color-advertencia) 14%, var(--color-superficie));
      color: var(--color-texto-principal); font-size: 0.875rem; line-height: 1.35; box-shadow: 0 8px 30px rgb(0 0 0 / 0.22);
      animation: cs-in var(--dur-enfasis, 320ms) var(--curva-salida, ease-out) both; }
    .cs svg { flex: none; color: var(--color-advertencia-texto, var(--color-advertencia)); }
    .cs--back { border-color: color-mix(in srgb, var(--color-exito) 55%, transparent); background: color-mix(in srgb, var(--color-exito) 14%, var(--color-superficie)); }
    .cs--back svg { color: var(--color-exito-texto, var(--color-exito)); }
    @keyframes cs-in { from { opacity: 0; transform: translateY(-8px); } }
    :host(.cs--bottom) .cs { animation-name: cs-in-up; }
    @keyframes cs-in-up { from { opacity: 0; transform: translateY(8px); } }
    @media (max-width: 40rem) { :host { width: calc(100% - 1rem); } .cs { border-radius: 14px; } }
    @media (prefers-reduced-motion: reduce) { .cs { animation: none; } }
  `],
})
export class ConnectionStatusComponent implements OnDestroy {
  readonly online = input(true);
  readonly placement = input<'top' | 'bottom'>('top');

  protected readonly state = signal<'hidden' | 'offline' | 'back'>('hidden');
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const online = this.online();
      untracked(() => {
        clearTimeout(this.timer);
        if (!online) { this.state.set('offline'); return; }
        if (this.state() !== 'offline') return;
        this.state.set('back');
        this.timer = setTimeout(() => this.state.set('hidden'), 3000);
      });
    });
  }

  ngOnDestroy(): void { clearTimeout(this.timer); }
}
