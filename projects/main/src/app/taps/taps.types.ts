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
  /** Explicación corta que se muestra al fallar: 90 caracteres como máximo (se lee en ~3 s). */
  why: string;
  /** Explicación ampliada (280 caracteres como máximo) para el panel de escritorio tras fallar. Opcional: el banco aún no la trae. */
  more?: string;
  /** Objeto para explicar tras responder (catálogo del tema: theme.json → visuals.objects). Sin él, la explicación es solo texto. */
  visual?: ITapVisual;
}

/** Objeto que el motor muestra y anima junto a la explicación (p. ej. un pistón que no mueve la obsidiana). Se toca y se arrastra. */
export interface ITapVisual {
  objeto: string;
  accion: string;
  /** Dato de la acción (p. ej. la receta «antorcha» o la palabra «BANANA|A»). */
  valor?: string;
}

/** Título que se gana según el puntaje: se elige el de mayor `min` que no supere los aciertos. */
export interface ITapResult {
  min: number;
  title: string;
  line: string;
  /** Variantes de la línea (la primera es `line`): se elige una con semilla para que el resultado no se lea siempre igual. */
  lines?: string[];
}

/**
 * Qué se ve en el escenario: el mundo, el personaje anfitrión y el objeto que sostiene, más el encuadre (lado, distancia y
 * ángulo), la entrada del personaje y el decorado de fondo (claves del tema). Lo asigna el generador de forma determinista.
 */
export interface ITapScene {
  world: string;
  host: string;
  item?: string;
  /** Encuadre (theme.json → shots): 'izquierda', 'derecha', 'cerca-izquierda', 'cerca-derecha', 'lejos' o 'centro'. */
  shot?: string;
  /** Cómo entra el personaje al llegar a este Tap (theme.json → enters). */
  enter?: string;
  /** Decorado de fondo (theme.json → props). */
  props?: string;
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
  /** Color del suelo del mundo: franja inferior del fondo mientras carga (con la textura de su tema). */
  ground?: string;
  questions: ITapQuestion[];
  results: ITapResult[];
  /** Categoría del selector de temas (`/taps?tema=<id>`). Sin ella se usa `theme` (el videojuego). */
  topic?: string;
  /** Tap «de gancho»: preguntas muy fáciles para el primer Tap de alguien nuevo (el primer toque casi siempre se premia). */
  hook?: boolean;
  /** Dificultad del Tap (promedio de sus 5 preguntas): el feed la sube y la baja en «diente de sierra». */
  level?: 'facil' | 'media' | 'dificil';
  /** Subtema dentro de su categoría (p. ej. «redstone», «espacio»): solo informativo. */
  subtopic?: string;
}

/** Una categoría del selector. Las que aún no tienen Taps se muestran como «Pronto». */
export interface ITapTopic {
  id: string;
  name: string;
  /** Línea corta bajo el nombre (p. ej. «Quiz de bloques»). */
  blurb: string;
  /** Color del tema en todo el sistema (chip, borde). */
  color: string;
}

/** Estado de una partida de un Tap (inmutable: cada paso devuelve uno nuevo). */
export interface ITapRun {
  tapId: string;
  index: number;
  /** Opción elegida en la pregunta actual (null = aún sin responder). */
  chosen: number | null;
  score: number;
  /** Acierto (true) o fallo (false) de cada pregunta respondida, en orden: cuadrícula del resultado y racha. */
  answers: boolean[];
  finished: boolean;
}

/** Contrato mínimo del escenario del motor (ver public/taps-engine/README.md). */
export interface ITapsStage {
  readonly mode: 'light' | '3d';
  readonly ready: Promise<void>;
  readonly ready3d: Promise<'light' | '3d'>;
  setScene(spec: ITapScene): Promise<void>;
  preload(spec: ITapScene): Promise<void>;
  /** `voz: false` = solo globo; `globo: false` = solo voz (si hay voz conectada con `setVoz`). */
  say(text: string, opts?: { ms?: number; hold?: boolean; tone?: string; voz?: boolean; globo?: boolean }): void;
  /** Voz de los personajes (taps-engine/voz). Opcional: motores anteriores no la tienen. */
  setVoz?(voz: ITapsVozMotor | null): void;
  react(name: string, opts?: { say?: boolean | string }): void;
  pause(why?: string): void;
  resume(): void;
  setMuted(muted: boolean): void;
  /**
   * Muestra un objeto para explicar dentro de `el`; `side` = lado donde está (el personaje se corre al otro). Devuelve su
   * descripción para lectores de pantalla, o false si el tema no lo tiene.
   */
  visual?(spec: ITapVisual, el: HTMLElement, opts?: { side?: 'izq' | 'der' }): Promise<string | false>;
  clearVisual?(): void;
  replayVisual?(): void;
  preloadVisuals?(): Promise<void>;
  attachTo(el: HTMLElement): void;
  destroy(): void;
  on(name: 'mode' | 'degrade' | 'visual', fn: (data: { mode?: 'light' | '3d'; reason?: string; step?: string; type?: string }) => void): () => void;
  stats(): { mode: string; tier: string; size: { w: number; h: number }; fpsCap: number; fps: number; degraded: number };
}

/** Voz que el motor usa en `say()` (taps-engine/voz/voz.js → paraMotor()). */
export interface ITapsVozMotor {
  hablar(texto: string, personaje?: string): Promise<void> | void;
  callar(): void;
}

/** Sonido de la app que recibe los sonidos del tema por nombre (taps-engine/audio/sonido.js → paraMotor()). */
export interface ITapsAudioMotor {
  play(name: string, opts?: { theme?: string }): void;
}

export interface ITapsEngineModule {
  create(container: HTMLElement, opts: { theme: string; mode?: 'auto' | '3d' | 'light'; audio?: ITapsAudioMotor }): ITapsStage;
}
