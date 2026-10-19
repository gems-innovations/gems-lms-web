import { DestroyRef, Injector, PLATFORM_ID, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Antes de este tiempo no se muestra ningún indicador: una carga rápida no debe parpadear. */
export const LOADING_DELAY_MS = 300;
/** Si un indicador llegó a verse, se queda al menos esto (evita el «flash» de 50 ms). */
export const LOADING_MIN_VISIBLE_MS = 500;

export interface IDelayedLoadingOptions {
  /** ms antes de mostrar el indicador (por defecto {@link LOADING_DELAY_MS}). */
  delay?: number;
  /** ms mínimos que se ve una vez mostrado (por defecto {@link LOADING_MIN_VISIBLE_MS}). */
  minVisible?: number;
  injector?: Injector;
}

/**
 * Lógica pura (sin Angular) de «mostrar tarde, ocultar no antes de»: recibe cambios de `loading` y avisa cuándo
 * el indicador debe verse. Separada para probarla con relojes falsos y reutilizarla fuera de Angular (Taps).
 */
export class LoadingGate {
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private shownAt = 0;
  private visible = false;

  constructor(
    private readonly onChange: (visible: boolean) => void,
    private readonly delay = LOADING_DELAY_MS,
    private readonly minVisible = LOADING_MIN_VISIBLE_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  set(loading: boolean): void {
    if (loading) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
      if (this.visible || this.showTimer) return;
      this.showTimer = setTimeout(() => {
        this.showTimer = undefined;
        this.shownAt = this.now();
        this.emit(true);
      }, this.delay);
      return;
    }
    clearTimeout(this.showTimer);
    this.showTimer = undefined;
    if (!this.visible || this.hideTimer) return;
    const rest = this.minVisible - (this.now() - this.shownAt);
    if (rest <= 0) { this.emit(false); return; }
    this.hideTimer = setTimeout(() => { this.hideTimer = undefined; this.emit(false); }, rest);
  }

  dispose(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
  }

  private emit(visible: boolean): void {
    this.visible = visible;
    this.onChange(visible);
  }
}

/**
 * Señal «¿muestro el indicador?» a partir de una señal «¿está cargando?»: no aparece antes de `delay` y, si
 * apareció, dura al menos `minVisible`. Úsala para spinners, superposiciones y la barra de ruta; los esqueletos
 * NO la necesitan (reservan su espacio desde el primer instante y su dibujo ya entra con retraso por CSS).
 *
 * En el servidor (prerender) devuelve la misma señal: allí no hay que esperar a nadie.
 */
export function delayedLoading(source: Signal<boolean>, options: IDelayedLoadingOptions = {}): Signal<boolean> {
  const injector = options.injector ?? inject(Injector);
  if (!isPlatformBrowser(injector.get(PLATFORM_ID))) return computed(() => source());
  const shown = signal(false);
  const gate = new LoadingGate(v => shown.set(v), options.delay ?? LOADING_DELAY_MS, options.minVisible ?? LOADING_MIN_VISIBLE_MS);
  effect(() => {
    const loading = source();
    untracked(() => gate.set(loading));
  }, { injector });
  injector.get(DestroyRef).onDestroy(() => gate.dispose());
  return shown.asReadonly();
}
