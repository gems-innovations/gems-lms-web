import { ITap } from './taps.types';

/**
 * Personalización de un Tap (producto/taps/estudio-personalizacion.md). Todo es opcional y son ids de catálogo, colores
 * `#rrggbb` y texto corto: nada de URLs ni HTML. Sin `estilo` el Tap se ve como siempre (los del banco no lo traen).
 */
export interface ITapEstilo {
  fondo?: ITapFondo;
  marco?: string;
  paleta?: string;
  letra?: string;
  capas?: ITapCapa[];
  /** Id de una pista de fondo del manifiesto de música (public/taps-musica/musica.json). */
  musica?: string;
}
/** Tinte sobre el escenario del motor (el escenario sigue debajo): color, degradado o patrón; `fuerza` es la opacidad. */
export type ITapFondo =
  | { tipo: 'color'; color: string; fuerza: number }
  | { tipo: 'degradado'; de: string; a: string; angulo: number; fuerza: number }
  | { tipo: 'patron'; id: string; color: string; fuerza: number };
/** Texto o sticker sobre la zona del mundo (nunca sobre la pregunta ni las opciones); x e y en % de esa zona. */
export interface ITapCapa { tipo: 'texto' | 'sticker'; id?: string; texto?: string; x: number; y: number; escala: number; giro: number; color: string }

/** Marcos animados (CSS, taps-feed.estilo.scss). Con «reducir movimiento» quedan quietos. */
export const MARCOS: Readonly<Record<string, string>> = {
  brillo: 'Brillo que gira', neon: 'Neón', arcoiris: 'Arcoíris', latido: 'Latido', destellos: 'Destellos', pixel: 'Píxel',
};
/** Paletas de las 4 opciones (en orden de la forma: triángulo, rombo, círculo, cuadrado). Texto blanco ≥ 3,8:1 en todas. */
export const PALETAS: Readonly<Record<string, { nombre: string; colores: readonly [string, string, string, string] }>> = {
  oceano: { nombre: 'Océano', colores: ['#1565C0', '#00838F', '#5E35B1', '#2E7D32'] },
  atardecer: { nombre: 'Atardecer', colores: ['#C62828', '#AD1457', '#BF360C', '#6A1B9A'] },
  bosque: { nombre: 'Bosque', colores: ['#33691E', '#00695C', '#795548', '#4E7A27'] },
  dulce: { nombre: 'Dulce', colores: ['#AD1457', '#7B1FA2', '#C2185B', '#0277BD'] },
  noche: { nombre: 'Noche', colores: ['#283593', '#4527A0', '#37474F', '#00695C'] },
  grafito: { nombre: 'Grafito', colores: ['#263238', '#37474F', '#455A64', '#546E7A'] },
};
/** Variables CSS de cada paleta (`--op-0` … `--op-3`), calculadas una vez para que el feed no cree objetos en cada pintado. */
export const PALETA_VARS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.fromEntries(
  Object.entries(PALETAS).map(([id, p]) => [id, Object.fromEntries(p.colores.map((c, k) => [`--op-${k}`, c]))]));
/** Letra de la pregunta y las opciones (archivos locales de /fonts y del tema Minecraft). */
export const LETRAS: Readonly<Record<string, string>> = { redonda: 'Redonda', pixel: 'Píxel' };
export const PATRONES: Readonly<Record<string, string>> = { puntos: 'Puntos', rayas: 'Rayas', cuadricula: 'Cuadrícula', ondas: 'Ondas' };
/** Pistas de fondo que se pueden elegir (las instrumentales del manifiesto; las de celebración no). */
export const MUSICAS: Readonly<Record<string, string>> = {
  'pixel-quest-loop': 'Aventura pixelada', 'cave-quiz-crawl': 'Cueva y mina', 'magma-quest-loop': 'Nether', 'village-morning-loop': 'Mañana en la aldea',
  'island-quiz-loop': 'Playa', 'cozy-study-loop': 'Estudio tranquilo', 'puzzle-tick-loop': 'Lógica', 'wonder-loop': 'Asombro', 'orbit-quiz-drift': 'Espacio',
};
/** Stickers dibujados (sin emojis): un trazo relleno en una caja de 24 × 24. */
export const STICKERS: Readonly<Record<string, { nombre: string; d: string }>> = {
  estrella: { nombre: 'Estrella', d: 'M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z' },
  corazon: { nombre: 'Corazón', d: 'M12 20.5S3 15 3 8.8C3 6 5.2 4 7.7 4c1.8 0 3.3 1 4.3 2.4C13 5 14.5 4 16.3 4 18.8 4 21 6 21 8.8 21 15 12 20.5 12 20.5z' },
  rayo: { nombre: 'Rayo', d: 'M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.2z' },
  llama: { nombre: 'Llama', d: 'M12 2.5c1 3.5 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.4 2.6-5.7.2 1.7 1 2.9 2.2 3.4-.6-3.2-.1-6.2.7-8.7z' },
  corona: { nombre: 'Corona', d: 'M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11.5H5z' },
  trofeo: { nombre: 'Trofeo', d: 'M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.6 12 5 5 0 0 1 13 14.8V18h3.5v3h-9v-3H11v-3.2A5 5 0 0 1 7.4 12 4.5 4.5 0 0 1 3.5 7.5V5H7zm0 4H5.6a2.6 2.6 0 0 0 1.5 2.3zm10 0v2.3a2.6 2.6 0 0 0 1.5-2.3z' },
  cohete: { nombre: 'Cohete', d: 'M12 2c3.3 2.3 5 5.7 5 9.6l2.5 3.4-.8 4-3.6-2.2H8.9L5.3 19l-.8-4L7 11.6C7 7.7 8.7 4.3 12 2zm0 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM10.5 18.5h3L12 22z' },
  bombillo: { nombre: 'Bombillo', d: 'M12 2.5a6.5 6.5 0 0 1 3.8 11.8c-.6.5-.8 1.1-.8 1.8V17H9v-.9c0-.7-.2-1.3-.8-1.8A6.5 6.5 0 0 1 12 2.5zM9 18.5h6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' },
  nota: { nombre: 'Nota musical', d: 'M9 4.5 20 2v13.2a3.3 3.3 0 1 1-2-3V6.6l-7 1.6v9.4a3.3 3.3 0 1 1-2-3z' },
  diana: { nombre: 'Diana', d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 3.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z' },
  medalla: { nombre: 'Medalla', d: 'M6.5 2h4l1.5 4.2L13.5 2h4l-3 7.3a6 6 0 1 1-5 0zM12 11.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z' },
  pregunta: { nombre: 'Pregunta', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zm.2 4.3c-2.2 0-3.8 1.3-3.9 3.4h2.4c.1-.9.7-1.4 1.5-1.4s1.4.5 1.4 1.2c0 1.6-2.7 1.7-2.7 4.4v.6h2.4v-.4c0-1.8 2.8-2 2.8-4.7 0-1.9-1.6-3.1-3.9-3.1zM12 16a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z' },
  exclamacion: { nombre: 'Atención', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zM10.8 6l.3 8.2h1.8l.3-8.2zM12 15.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z' },
  check: { nombre: 'Correcto', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zm4.4 5.7-5.7 5.9-3-3-1.8 1.8 4.8 4.7 7.5-7.6z' },
  nube: { nombre: 'Nube', d: 'M7.2 19A4.7 4.7 0 0 1 6.6 9.6 6 6 0 0 1 18 8.4 5.3 5.3 0 0 1 17.6 19z' },
  planeta: { nombre: 'Planeta', d: 'M12 5.5a6.5 6.5 0 0 1 6.4 5.3c2.4.6 3.8 1.6 3.6 2.6-.3 1.6-4.8 2-10 .9S2.5 11.4 2.8 9.8c.2-.8 1.5-1.2 3.4-1.1A6.5 6.5 0 0 1 12 5.5zm-6 9.4c1.6.6 3.6 1.1 5.6 1.4 2.2.4 4.3.5 5.9.3a6.5 6.5 0 0 1-11.5-1.7z' },
};

export const MAX_CAPAS = 6;
export const MAX_TEXTO_CAPA = 40;

const HEX = /^#[0-9a-f]{6}$/i;
const esObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const color = (v: unknown, def: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : def);
const de = (cat: Readonly<Record<string, unknown>>, v: unknown) => (typeof v === 'string' && Object.hasOwn(cat, v) ? v : undefined);

function fondoValido(v: unknown): ITapFondo | undefined {
  if (!esObj(v)) return undefined;
  const fuerza = num(v['fuerza'], 0.1, 0.7, 0.35);
  if (v['tipo'] === 'color' && HEX.test(String(v['color']))) return { tipo: 'color', color: color(v['color'], ''), fuerza };
  if (v['tipo'] === 'degradado' && HEX.test(String(v['de'])) && HEX.test(String(v['a'])))
    return { tipo: 'degradado', de: color(v['de'], ''), a: color(v['a'], ''), angulo: Math.round(num(v['angulo'], 0, 360, 180)), fuerza };
  const id = de(PATRONES, v['id']);
  if (v['tipo'] === 'patron' && id) return { tipo: 'patron', id, color: color(v['color'], '#ffffff'), fuerza };
  return undefined;
}

function capaValida(v: unknown): ITapCapa | null {
  if (!esObj(v)) return null;
  const base = { x: num(v['x'], 0, 100, 50), y: num(v['y'], 0, 100, 50), escala: num(v['escala'], 0.5, 2.5, 1), giro: Math.round(num(v['giro'], -45, 45, 0)), color: color(v['color'], '#ffffff') };
  if (v['tipo'] === 'sticker') { const id = de(STICKERS, v['id']); return id ? { tipo: 'sticker', id, ...base } : null; }
  if (v['tipo'] === 'texto' && typeof v['texto'] === 'string') {
    // Una sola línea, sin caracteres de control; el filtro de palabras va al publicar en la API (W3).
    const texto = v['texto'].replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_TEXTO_CAPA);
    return texto ? { tipo: 'texto', texto, ...base } : null;
  }
  return null;
}

/**
 * Deja solo lo que el feed sabe pintar (frontera de confianza: un Tap puede venir de la API o de un enlace). Lo desconocido
 * se descarta en silencio; sin nada válido devuelve null y el Tap se ve como siempre.
 */
export function validarEstilo(v: unknown): ITapEstilo | null {
  if (!esObj(v)) return null;
  const capas = Array.isArray(v['capas']) ? v['capas'].slice(0, MAX_CAPAS).map(capaValida).filter((c): c is ITapCapa => !!c) : [];
  const e: ITapEstilo = {
    fondo: fondoValido(v['fondo']), marco: de(MARCOS, v['marco']), paleta: de(PALETAS, v['paleta']), letra: de(LETRAS, v['letra']),
    capas: capas.length ? capas : undefined, musica: de(MUSICAS, v['musica']),
  };
  (Object.keys(e) as (keyof ITapEstilo)[]).forEach(k => e[k] === undefined && delete e[k]);
  return Object.keys(e).length ? e : null;
}

const cache = new WeakMap<ITap, ITapEstilo | null>();
/** El estilo ya validado de un Tap (se calcula una vez por objeto). */
export function estiloDe(tap: ITap): ITapEstilo | null {
  if (!tap.estilo) return null;
  let e = cache.get(tap);
  if (e === undefined) { e = validarEstilo(tap.estilo); cache.set(tap, e); }
  return e;
}

/** `background` CSS del tinte de color o degradado (el patrón lo dibuja la hoja de estilos con `--tinte-c`). */
export function fondoCss(f: ITapFondo): string | null {
  if (f.tipo === 'color') return f.color;
  if (f.tipo === 'degradado') return `linear-gradient(${f.angulo}deg, ${f.de}, ${f.a})`;
  return null;
}
