import { BLOQUES } from '../public/retos.data';
import { ITap, ITapQuestion, ITapResult, ITapScene, ITapTopic } from './taps.types';
import { TAPS_ESTUDIO } from './taps-estudio.data';

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
  { id: 'logica', name: 'Lógica y trampas', blurb: 'Piénsalo dos veces', color: '#8b6cf0' },
  { id: 'ciencia', name: 'Ciencia curiosa', blurb: 'Datos que no esperabas', color: '#4de1ff' },
  { id: 'cultura', name: 'Cultura general', blurb: 'Datos que sorprenden', color: '#f0a43a' },
];

/**
 * Tipografía de acento de cada tema del motor (`--tap-display-font`): solo para el nombre del tema, nunca para preguntas
 * ni opciones. La carga el motor (`font` del theme.json). Un tema nuevo agrega aquí su familia; sin entrada usa la del sitio.
 */
export const TAP_DISPLAY_FONTS: Record<string, string> = {
  minecraft: "'Pixelify Sans', var(--tap-font)",
  estudio: "'Rubik', var(--tap-font)",
};

/**
 * Tema «estudio» (datos en taps-estudio.data.ts, compartidos con la demo del motor): aquí solo se le da su categoría del
 * selector y se acortan los textos a los límites de Taps (pregunta ≤ 70, explicación ≤ 90, título nunca negativo).
 */
const ESTUDIO_TOPIC: Record<string, string> = { 'logica-trampas': 'logica', 'ciencia-curiosa': 'ciencia' };
const ESTUDIO_EDITS: Record<string, Partial<Pick<ITapQuestion, 'q' | 'options' | 'why'>>> = {
  bate: { q: 'Bate y pelota cuestan $1.100. El bate vale $1.000 más. ¿Y la pelota?',
    why: '$50: el bate cuesta $1.050 y suman $1.100. Con $100 el total sería $1.200.' },
  maquinas: { q: '5 máquinas hacen 5 piezas en 5 min. ¿100 máquinas, 100 piezas?',
    why: '5 minutos: cada máquina hace una pieza en 5 minutos, todas a la vez.' },
  algas: { q: 'Unas algas se duplican cada día y cubren el lago en 48. ¿Y la mitad?',
    why: '47: si se duplican cada día, un día antes cubrían justo la mitad.' },
  carrera: { options: ['Primero', 'Segundo', 'Tercero', 'Depende'] },
  meses: { why: 'Los 12: todos tienen al menos 28 días. Febrero es el único que tiene solo 28.' },
  venus: { why: 'Venus: gira sobre sí en unos 243 días y da la vuelta al Sol en unos 225.' },
  hervir: { options: ['A nivel del mar', 'En una montaña', 'En una mina', 'En ninguna parte'],
    why: 'Arriba hay menos presión: en Bogotá (2.600 m) el agua hierve cerca de 91 °C.' },
};
const ESTUDIO_TITLES: Record<string, string> = { 'Cayó en la trampa': 'Aprendiz de detective' };

function forTaps(t: ITap): ITap {
  return {
    ...t,
    topic: t.topic ?? ESTUDIO_TOPIC[t.id],
    questions: t.questions.map(q => ({ ...q, ...ESTUDIO_EDITS[q.id] })),
    results: t.results.map(r => ({ ...r, title: ESTUDIO_TITLES[r.title] ?? r.title })),
  };
}

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
  // Tema «estudio» (otro estilo visual, mismo motor): Lógica y trampas, Ciencia curiosa
  ...TAPS_ESTUDIO.map(forTaps),
];
