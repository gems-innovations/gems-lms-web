/**
 * Formato de un Tap (solo datos). Para crear uno nuevo basta un objeto así en `taps.data.ts`: no se toca el motor
 * ni este componente. El motor (public/taps-engine) solo recibe `theme` y `scene`; las preguntas las maneja la app.
 */
export interface ITapQuestion {
  id: string;
  q: string;
  options: string[];
  /** Índice de la opción correcta. */
  answer: number;
  /** Explicación corta que se muestra al responder. */
  why: string;
}

/** Título que se gana según el puntaje: se elige el de mayor `min` que no supere los aciertos. */
export interface ITapResult {
  min: number;
  title: string;
  line: string;
}

/** Qué se ve en el escenario: el mundo, el personaje anfitrión y el objeto que sostiene (claves del tema). */
export interface ITapScene {
  world: string;
  host: string;
  item?: string;
}

export interface ITap {
  id: string;
  /** Id del tema del motor (carpeta en public/taps-engine/themes). Cambiarlo cambia de videojuego. */
  theme: string;
  title: string;
  kicker: string;
  scene: ITapScene;
  /** Colores del degradado de fondo mientras carga el escenario [arriba, abajo]. */
  backdrop: [string, string];
  questions: ITapQuestion[];
  results: ITapResult[];
}

/** Estado de una partida de un Tap (inmutable: cada paso devuelve uno nuevo). */
export interface ITapRun {
  tapId: string;
  index: number;
  /** Opción elegida en la pregunta actual (null = aún sin responder). */
  chosen: number | null;
  score: number;
  finished: boolean;
}

/** Contrato mínimo del escenario del motor (ver public/taps-engine/README.md). */
export interface ITapsStage {
  readonly mode: 'light' | '3d';
  readonly ready: Promise<void>;
  readonly ready3d: Promise<'light' | '3d'>;
  setScene(spec: ITapScene): Promise<void>;
  preload(spec: ITapScene): Promise<void>;
  say(text: string, opts?: { ms?: number; hold?: boolean; tone?: string }): void;
  react(name: string, opts?: { say?: boolean | string }): void;
  pause(why?: string): void;
  resume(): void;
  setMuted(muted: boolean): void;
  attachTo(el: HTMLElement): void;
  destroy(): void;
  on(name: 'mode' | 'degrade', fn: (data: { mode?: 'light' | '3d'; reason?: string; step?: string }) => void): () => void;
  stats(): { mode: string; tier: string; size: { w: number; h: number }; fpsCap: number; fps: number; degraded: number };
}

export interface ITapsEngineModule {
  create(container: HTMLElement, opts: { theme: string; mode?: 'auto' | '3d' | 'light' }): ITapsStage;
}
