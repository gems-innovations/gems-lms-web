/**
 * Ritmo de un Tap (experiencia-ux.md §5.1): tras un acierto se avanza solo a los 1,4 s; tras un error se deja leer la
 * explicación 3,5 s. Mantener presionado pausa la cuenta, tocar adelanta (desde los 400 ms, para que el mismo toque
 * que respondió no salte la reacción). Sin DOM: el reloj se inyecta para poder probarlo con tiempo simulado.
 */
export const TAP_RHYTHM = {
  /** Tras acertar: un «beat» corto y a la siguiente. */
  correctMs: 1400,
  /** Tras fallar: tiempo para leer «La correcta era…» y una frase de por qué. */
  wrongMs: 3500,
  /** Tocar para adelantar solo vale pasado este tiempo desde la respuesta. */
  skipAfterMs: 400,
  /** Toques sobre las opciones en los primeros ms de una pregunta nueva se ignoran (el toque de «adelantar» no responde). */
  guardMs: 350,
  /** Mantener presionado este tiempo pausa la cuenta. */
  holdMs: 280,
  /** Lo mínimo que se deja ver la reacción, aunque la respuesta haya llegado antes de hidratar. */
  minMs: 300,
} as const;

/**
 * Cuánto esperar antes de avanzar. `elapsed` es lo que ya pasó desde el toque (p. ej. si se respondió antes de que
 * Angular hidratara: el color ya se vio, así que el acierto no repite su espera completa). El error siempre deja la
 * explicación completa, porque antes de hidratar solo se pintaron los colores.
 */
export function advanceDelay(correct: boolean, elapsed = 0): number {
  if (!correct) return TAP_RHYTHM.wrongMs;
  return Math.max(TAP_RHYTHM.minMs, TAP_RHYTHM.correctMs - Math.max(0, elapsed));
}

export interface IClockHost {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const browserClockHost: IClockHost = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Cuenta atrás que se puede pausar, reanudar, adelantar o cancelar. Llama `onDone` una sola vez por `start`. */
export class AdvanceClock {
  private handle: unknown = null;
  private startedAt = 0;
  private endsAt = 0;
  private left = 0;
  private state: 'idle' | 'running' | 'paused' = 'idle';

  constructor(private readonly host: IClockHost, private readonly onDone: () => void) {}

  get running(): boolean { return this.state === 'running'; }
  get paused(): boolean { return this.state === 'paused'; }
  get active(): boolean { return this.state !== 'idle'; }

  /** Lo que falta (ms). */
  remaining(): number {
    if (this.state === 'running') return Math.max(0, this.endsAt - this.host.now());
    return this.state === 'paused' ? this.left : 0;
  }

  /** Tiempo desde el último `start` (ms): «tocar adelanta» solo desde los 400 ms. */
  sinceStart(): number { return this.state === 'idle' ? Infinity : this.host.now() - this.startedAt; }

  start(ms: number): void {
    this.cancel();
    this.state = 'running';
    this.startedAt = this.host.now();
    this.arm(ms);
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.left = this.remaining();
    this.host.clearTimeout(this.handle);
    this.handle = null;
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.arm(this.left);
  }

  /** Adelanta: termina ya si pasó `minElapsed` desde el inicio. Devuelve si avanzó. */
  skip(minElapsed = TAP_RHYTHM.skipAfterMs): boolean {
    if (this.state === 'idle' || this.sinceStart() < minElapsed) return false;
    this.finish();
    return true;
  }

  /** Termina ya, sin condiciones (p. ej. el Tap salió de la pantalla con la respuesta a la vista). */
  flush(): void { if (this.state !== 'idle') this.finish(); }

  cancel(): void {
    if (this.handle !== null) this.host.clearTimeout(this.handle);
    this.handle = null;
    this.state = 'idle';
  }

  private arm(ms: number): void {
    this.endsAt = this.host.now() + ms;
    this.handle = this.host.setTimeout(() => this.finish(), ms);
  }

  private finish(): void {
    this.cancel();
    this.onDone();
  }
}
