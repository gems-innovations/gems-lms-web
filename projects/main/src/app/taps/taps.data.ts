import { ITap, ITapTopic } from './taps.types';
import { TAPS_BANCO, TAPS_RETIRADOS } from './taps.banco.generated';

/**
 * Los Taps salen del banco de preguntas (src/app/taps/banco/*.json) a través del generador
 * (`npm run taps:generar` → taps.banco.generated.ts). Aquí no se escribe ningún Tap a mano: para agregar o corregir
 * preguntas se cambia el banco. Tema visual, personaje, escenario y objeto de cada Tap los asigna el generador
 * (reglas en scripts/generar-taps.mjs). Los Taps retirados del banco ya no están en `TAPS`.
 */
export const TAPS: ITap[] = TAPS_BANCO;

/** Ids de los Taps que el banco marcó como retirados (el enlace compartido avisa y deja uno parecido). */
export const RETIRED_TAP_IDS: readonly string[] = TAPS_RETIRADOS;

/**
 * Catálogo de categorías del selector (`/taps?tema=<id>`). El id es el `topic` del Tap (o su `theme` si no trae uno).
 * Una categoría sin Taps se muestra como «Pronto»; en cuanto se agrega un Tap con ese `topic` queda jugable, sin tocar
 * el componente. Un `topic` que no esté aquí también aparece (con su id como nombre).
 */
export const TAP_TOPICS: ITapTopic[] = [
  { id: 'minecraft', name: 'Minecraft', blurb: 'Quiz de bloques', color: '#5fbf3a' },
  { id: 'logica', name: 'Lógica y trampas', blurb: 'Piénsalo dos veces', color: '#8b6cf0' },
  { id: 'cultura', name: 'Cultura general', blurb: 'Ciencia y datos que sorprenden', color: '#f0a43a' },
];

/**
 * Tipografía de acento de cada tema del motor (`--tap-display-font`): solo para el nombre del tema, nunca para preguntas
 * ni opciones. La carga el motor (`font` del theme.json). Un tema nuevo agrega aquí su familia; sin entrada usa la del sitio.
 */
export const TAP_DISPLAY_FONTS: Record<string, string> = {
  minecraft: "'Pixelify Sans', var(--tap-font)",
  estudio: "'Rubik', var(--tap-font)",
};

/** Taps de gancho (uno por tema, el primero de cada banco): la primera pregunta es facilísima. */
export const HOOK_TAP_IDS: readonly string[] = TAPS.filter(t => t.hook).map(t => t.id);
/** Tap de gancho del tema más popular (el que ve primero quien llega sin enlace). */
export const HOOK_TAP_ID: string = HOOK_TAP_IDS[0];

const bySubtopic = (topic: string, subtopic: string) => TAPS.find(t => t.topic === topic && t.subtopic === subtopic)?.id;
/** Los cinco primeros Taps (antes escritos a mano) ya circulan en enlaces: sus ids apuntan a su equivalente del banco. */
const LEGACY_IDS: Record<string, string | undefined> = {
  'primeros-pasos': HOOK_TAP_IDS.find(id => id.startsWith('mc-')),
  redstone: bySubtopic('minecraft', 'redstone'),
  nether: bySubtopic('minecraft', 'nether-end'),
  'logica-trampas': HOOK_TAP_IDS.find(id => id.startsWith('lg-')),
  'ciencia-curiosa': HOOK_TAP_IDS.find(id => id.startsWith('cu-')),
};

/** El Tap de un id (`/t/<id>` o `?t=`); los ids antiguos llevan a su equivalente. null si no existe o se retiró. */
export function findTap(id: string | null | undefined): ITap | null {
  if (!id) return null;
  const real = LEGACY_IDS[id] ?? id;
  return TAPS.find(t => t.id === real) ?? null;
}
