/**
 * Rueda del ratón y trackpad en escritorio (escritorio.md §6.1): un gesto = un Tap.
 * Se acumula `deltaY` normalizado; al pasar de 50 px se cambia de Tap y se bloquea hasta que pasen 600 ms Y 120 ms sin
 * eventos (la inercia del trackpad no salta tres Taps). `deltaX` y Ctrl + rueda (zoom) no cuentan. Sin DOM: se prueba con relojes falsos.
 */
export const WHEEL_THRESHOLD_PX = 50;
export const WHEEL_LOCK_MS = 600;
export const WHEEL_QUIET_MS = 120;
/** Si pasa más de esto entre dos eventos, el acumulado empieza de cero (era otro gesto). */
const WHEEL_RESET_MS = 250;

export interface IWheelInput { deltaY: number; deltaX?: number; deltaMode?: number; ctrlKey?: boolean }

export class WheelGate {
  private sum = 0;
  private lastAt = -Infinity;
  private lockedAt: number | null = null;

  /** Devuelve 1 (siguiente), -1 (anterior) o 0 (nada todavía). `viewportH` normaliza `deltaMode` de páginas. */
  push(event: IWheelInput, now: number, viewportH = 800): -1 | 0 | 1 {
    if (event.ctrlKey) return 0;
    const dy = normalizeDelta(event.deltaY, event.deltaMode ?? 0, viewportH);
    if (this.lockedAt !== null) {
      const quiet = now - this.lastAt >= WHEEL_QUIET_MS;
      this.lastAt = now;
      if (now - this.lockedAt < WHEEL_LOCK_MS || !quiet) return 0;     // inercia o aún bloqueado
      this.lockedAt = null;
      this.sum = 0;
    }
    if (now - this.lastAt > WHEEL_RESET_MS) this.sum = 0;
    this.lastAt = now;
    if (dy === 0 || Math.abs(event.deltaX ?? 0) > Math.abs(dy)) return 0;   // gesto horizontal: se ignora
    if (this.sum !== 0 && Math.sign(dy) !== Math.sign(this.sum)) this.sum = 0;   // cambió de sentido
    this.sum += dy;
    if (Math.abs(this.sum) < WHEEL_THRESHOLD_PX) return 0;
    const dir = this.sum > 0 ? 1 : -1;
    this.sum = 0;
    this.lockedAt = now;
    return dir;
  }

  reset(): void { this.sum = 0; this.lockedAt = null; this.lastAt = -Infinity; }
}

/** `deltaMode` 1 (líneas) → ×16 px; 2 (páginas) → ×alto de la ventana. */
export function normalizeDelta(delta: number, mode: number, viewportH: number): number {
  return mode === 1 ? delta * 16 : mode === 2 ? delta * viewportH : delta;
}
