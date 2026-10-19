import { BLOQUES } from '../public/retos.data';
import { ITap, ITapQuestion, ITapResult, ITapScene, ITapTopic } from './taps.types';

/**
 * Los Taps. Agregar uno = agregar un objeto a TAPS (las preguntas pueden salir del banco ya existente por id).
 * Para otro videojuego: cambia `theme` y `scene` por los de ese tema (ver public/taps-engine/README.md).
 */

/**
 * Ajustes de texto solo para Taps (el banco de /bloques conserva sus explicaciones largas): en Taps la pregunta cabe en
 * 2 líneas (≤ 70), las opciones en la rejilla 2×2 (≤ 22) y la explicación se lee en ~3 s (≤ 90). `taps.logic.spec` lo valida.
 */
const TAP_EDITS: Record<string, Partial<Pick<ITapQuestion, 'q' | 'options' | 'why'>>> = {
  observador: { options: ['Empujar bloques', 'Detectar cambios', 'Contar mobs', 'Medir la hora'],
    why: 'Detecta cuando cambia el bloque de enfrente y manda un pulso. Clave en granjas.' },
  pegajoso: { why: 'Una bola de slime: así, además de empujar, jala el bloque al retraerse.' },
  portal: { q: '¿Cuánta obsidiana necesita, como mínimo, un portal al Nether?',
    why: 'Diez: las 4 esquinas del marco no hacen falta para que el portal se encienda.' },
  piglin: { options: ['Si llevas hierro', 'Si no llevas oro', 'Solo de noche', 'Nunca atacan'],
    why: 'Si no llevas nada de oro. Con una sola pieza de armadura de oro te dejan en paz.' },
  ghast: { options: ['Me escondo bajo tierra', 'Le devuelvo la bola', 'Le doy oro', 'Le lanzo agua'] },
  sol: { options: ['Corren más rápido', 'Se prenden fuego', 'Se esconden', 'Nada'],
    why: 'Arden con la luz del sol, salvo que estén bajo techo o a la sombra.' },
  caida: { options: ['Mueres igual', 'El agua te salva', 'Pierdes todo', 'Rebotas'],
    why: 'El agua amortigua la caída: caer en ella no hace daño, aunque sea desde muy alto.' },
};

function fromBank(ids: string[]): ITapQuestion[] {
  return ids.map(id => {
    const r = BLOQUES.find(b => b.id === id);
    if (!r) throw new Error(`taps.data: no existe la pregunta «${id}» en BLOQUES`);
    return { id: r.id, q: r.q, options: r.options, answer: r.answer, why: r.why, ...TAP_EDITS[id] };
  });
}

function tap(t: { id: string; title: string; scene: ITapScene; backdrop: [string, string]; questions: ITapQuestion[]; results: ITapResult[]; theme?: string; topic?: string; hook?: boolean }): ITap {
  return { theme: 'minecraft', kicker: 'Quiz de bloques', ...t };
}

/**
 * Catálogo de categorías del selector (`/taps?tema=<id>`). El id es el `topic` del Tap (o su `theme` si no trae uno).
 * Una categoría sin Taps se muestra como «Pronto»; en cuanto se agrega un Tap con ese `topic` queda jugable, sin tocar
 * el componente. Un `topic` que no esté aquí también aparece (con su id como nombre).
 */
export const TAP_TOPICS: ITapTopic[] = [
  { id: 'minecraft', name: 'Minecraft', blurb: 'Quiz de bloques', color: '#5fbf3a' },
  { id: 'logica', name: 'Lógica', blurb: 'Piénsala bien', color: '#8b6cf0' },
  { id: 'cultura', name: 'Cultura general', blurb: 'Datos que sorprenden', color: '#f0a43a' },
];

/**
 * Tipografía de acento de cada tema del motor (`--tap-display-font`): solo para el nombre del tema, nunca para preguntas
 * ni opciones. La carga el motor (`font` del theme.json). Un tema nuevo agrega aquí su familia; sin entrada usa la del sitio.
 */
export const TAP_DISPLAY_FONTS: Record<string, string> = {
  minecraft: "'Pixelify Sans', var(--tap-font)",
};

/** Id del Tap de gancho (primer Tap de alguien nuevo). */
export const HOOK_TAP_ID = 'primeros-pasos';

export const TAPS: ITap[] = [
  // Tap de gancho: la primera pregunta es facilísima y su respuesta queda abajo a la derecha, donde pulsa la pista
  // «Toca tu respuesta» (la opción más cómoda para el pulgar). El primer toque casi siempre se premia.
  tap({
    id: HOOK_TAP_ID,
    hook: true,
    title: 'Primeros pasos',
    scene: { world: 'pradera', host: 'leo', item: 'pick' },
    backdrop: ['#3f8fd6', '#2f5a1c'],
    questions: [
      { id: 'creeper-verde', q: '¿Qué mob verde explota cuando se te acerca?', options: ['Zombi', 'Cerdo', 'Aldeano', 'Creeper'], answer: 3,
        why: 'El creeper: se acerca en silencio, sisea y explota. Aléjate cuando lo oigas.' },
      ...fromBank(['antorcha', 'sol', 'caida', 'mesa']),
    ],
    results: [
      { min: 0, title: 'Explorador valiente', line: 'Todo gran jugador empezó por aquí. El siguiente te va a salir mejor.' },
      { min: 2, title: 'Aventurero en marcha', line: 'Ya sabes moverte por el mundo. Desliza y sube de nivel.' },
      { min: 4, title: 'Superviviente nato', line: 'Casi perfecto: tu primera noche no te asusta.' },
      { min: 5, title: 'Leyenda del primer día', line: 'Cinco de cinco. Ahora vienen los difíciles.' },
    ],
  }),
  tap({
    id: 'redstone',
    title: 'Redstone',
    scene: { world: 'cueva', host: 'sofi', item: 'pick' },
    backdrop: ['#0b0a09', '#3a322b'],
    questions: fromBank(['piston', 'pegajoso', 'observador', 'repetidor', 'antorcha-redstone']),
    results: [
      { min: 0, title: 'Aprendiz de antorchas', line: 'Todo gran ingeniero empezó quemándose los dedos. Inténtalo otra vez.' },
      { min: 2, title: 'Electricista del pueblo', line: 'Ya sabes lo básico. Un repetidor más y te sale la granja.' },
      { min: 4, title: 'Maquinista de pistones', line: 'Casi no fallas: tus circuitos ya mueven bloques.' },
      { min: 5, title: 'Crack de redstone', line: 'Perfecto. Hasta los observadores te piden consejo.' },
    ],
  }),
  tap({
    id: 'nether',
    title: 'Nether y End',
    scene: { world: 'nether', host: 'leo', item: 'sword' },
    backdrop: ['#1a0303', '#7a2410'],
    questions: fromBank(['portal', 'perlas', 'piglin', 'cama', 'ghast']),
    results: [
      { min: 0, title: 'Turista del Nether', line: 'Cuidado con las camas y con la lava. Inténtalo otra vez.' },
      { min: 2, title: 'Cazador de piglins', line: 'Ya no te roban el oro. Te falta conocer el End.' },
      { min: 4, title: 'Explorador del Nether', line: 'Casi perfecto: los ghast te tienen miedo.' },
      { min: 5, title: 'Rey del Nether', line: 'Cero errores. Hasta el dragón te manda saludos.' },
    ],
  }),
];
