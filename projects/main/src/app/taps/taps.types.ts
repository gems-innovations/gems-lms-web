/**
 * Formato de un Tap (solo datos). Para crear uno nuevo basta un objeto así en `taps.data.ts`: no se toca el motor
 * ni este componente. El motor (public/taps-engine) solo recibe `theme` y `scene`; las preguntas las maneja la app.
 */
/**
 * Formato de una pregunta. `clasica` (o sin campo): 4 opciones. `duo`: 2 opciones grandes, una contra otra, con cuenta
 * regresiva corta (DUO_MS): sin responder a tiempo cuenta como fallo. `vf`: verdadero o falso (`options` = ['Verdadero', 'Falso']),
 * se responde tocando o deslizando hacia el lado de la opción (izquierda = primera, derecha = segunda).
 * `paso`: un paso de un Tap de historia (ver ITap.tipo): una decisión narrativa de 2 o 3 opciones, sin respuesta correcta,
 * que no puntúa; cada opción trae su `consecuencias` (lo que pasa) y la historia sigue.
 */
export type TTapQuestionTipo = 'clasica' | 'duo' | 'vf' | 'paso';

/** Cuenta regresiva del formato duo (ms). */
export const DUO_MS = 7000;
/** `chosen` cuando se acabó el tiempo sin responder (formato duo): fallo sin opción marcada. */
export const SIN_RESPUESTA = -1;

export interface ITapQuestion {
  id: string;
  q: string;
  options: string[];
  /** Formato (ver TTapQuestionTipo). Sin campo: clásica de 4 opciones. */
  tipo?: TTapQuestionTipo;
  /** Índice de la opción correcta. */
  answer: number;
  /** Explicación corta que se muestra al fallar: 90 caracteres como máximo (se lee en ~3 s). */
  why: string;
  /** Solo en un `paso`: lo que pasa tras cada decisión (una por opción, 90 caracteres como máximo). Sustituye a la explicación. */
  consecuencias?: string[];
  /** Explicación ampliada (280 caracteres como máximo) para el panel de escritorio tras fallar. Opcional: el banco aún no la trae. */
  more?: string;
  /** Objeto para explicar tras responder (catálogo del tema: theme.json → visuals.objects). Sin él, la explicación es solo texto. */
  visual?: ITapVisual;
  /**
   * Elemento visual de la PREGUNTA (no de la respuesta): se ve mientras se piensa, en una tarjeta arriba a la izquierda del
   * mundo. Un fragmento de código, una operación grande, una serie en fichas o un objeto / diagrama del tema
   * (theme.json → escenas.objects). Nunca contiene la respuesta (el generador lo revisa).
   */
  escena?: ITapEscena;
}

/** Escena de la pregunta (public/taps-engine/escena.js la dibuja). */
export type ITapEscena =
  | { tipo: 'codigo'; lineas: string[]; lenguaje?: 'pseudo' | 'python' | 'js' | 'bash' | 'http' | 'prompt'; texto?: string }
  | { tipo: 'operacion'; lineas: string[]; texto?: string }
  | { tipo: 'serie'; items: string[]; texto?: string }
  | { tipo: 'objeto' | 'diagrama'; cosa: string; texto?: string };

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
  /**
   * Modo cine (theme.json → cine; todo opcional y determinista por Tap). Plano de cámara: 'general', 'cenital', 'picado',
   * 'contrapicado', 'primer-plano', 'travelling', 'orbita' o 'diagonal'. Entre preguntas cambia un poco (stage.plano).
   */
  camara?: string;
  /** Hora del día: 'dia', 'tarde', 'amanecer' o 'noche' (solo en los lugares que la admiten: cine.horasMundos). */
  hora?: string;
  /** Clima o partículas del ambiente: lluvia, polen, hojas, arena, luciérnagas, polvo, burbujas, chispas… (cine.climas). */
  clima?: string;
  /** Animales o criaturas de fondo: ovejas, gallinas, murciélagos, gato, peces… (cine.fauna). */
  fauna?: string;
  /** Transición al llegar a este Tap: 'corte', 'barrido', 'zoom' o 'fundido'. */
  transicion?: string;
}

export interface ITap {
  id: string;
  /**
   * Clase de Tap. Sin campo: `quiz` (preguntas que puntúan). `historia`: 3 a 5 `paso` (decisiones que no puntúan) y una pregunta
   * final de selección, la única que puntúa (ver `puntuables`). Los pasos van siempre antes de la pregunta final.
   */
  tipo?: 'quiz' | 'historia';
  /** Se juega por su enlace (`/t/<id>`) pero no entra en «Para ti» ni en el selector de temas (ni como Tap siguiente). */
  soloEnlace?: boolean;
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
  /** Opción elegida en la pregunta actual (null = aún sin responder; SIN_RESPUESTA = se acabó el tiempo en un duo). */
  chosen: number | null;
  score: number;
  /** Acierto (true) o fallo (false) de cada pregunta respondida, en orden: cuadrícula del resultado y racha. */
  answers: boolean[];
  finished: boolean;
}

/** Contrato mínimo del escenario del motor (ver public/taps-engine/README.md). */
export interface ITapsStage {
  /** Nodo raíz del escenario (foto fija que deja al irse de un Tap y fundido al llegar). */
  readonly root?: HTMLElement;
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
  /** Escena de la pregunta dentro de `el` (motor v10). Devuelve su descripción o false si el tema no la dibuja. */
  escena?(spec: ITapEscena, el: HTMLElement, opts?: { side?: 'izq' | 'der' }): Promise<string | false>;
  clearEscena?(): void;
  preloadEscenas?(): Promise<void>;
  /** Pequeño cambio de plano entre preguntas (motor v10): n = pregunta (0 = plano base), seed = número estable del Tap. */
  plano?(n: number, seed?: number): void;
  /**
   * Zona segura (motor v11): px del escenario que tapan arriba la barra y abajo la tarjeta de la pregunta. El personaje se
   * encaja en lo que queda a la vista. `null` = todo el escenario.
   */
  setSafeArea?(area: { top: number; bottom: number } | null): void;
  attachTo(el: HTMLElement): void;
  /** Motor v12: (re)programa la espera máxima del 3D en ms (el precargado la empieza al verse). */
  setSlow?(ms: number): void;
  /** Dónde está el personaje ahora (px del escenario). */
  caja?(): { modo: 'light' | '3d'; top: number; pecho: number; pies: number; x: number };
  destroy(): void;
  on(name: 'mode' | 'degrade' | 'visual', fn: (data: { mode?: 'light' | '3d'; reason?: string; step?: string; type?: string }) => void): () => void;
  stats(): { mode: string; tier: string; size: { w: number; h: number }; fpsCap: number; fps: number; degraded: number; canvas?: 'webgl' | '2d' | null };
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
  create(container: HTMLElement, opts: { theme: string; mode?: 'auto' | '3d' | 'light'; audio?: ITapsAudioMotor; slowMs?: number }): ITapsStage;
}
