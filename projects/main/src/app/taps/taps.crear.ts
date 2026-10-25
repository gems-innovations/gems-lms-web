import { TEventPath } from '../analytics-taxonomy';

/**
 * Lógica pura de la ruta /crear (PR-6 del plan, producto/taps/disenador-plan-ux.md §A): de dónde llegó la persona, qué
 * eventos `taps/crear/*` del embudo (§A.4) se derivan de los `taps/disenador/*` que ya emite el diseñador, y la cinta de
 * transparencia (§A.3.1) que se muestra una sola vez por navegador. Sin Angular ni DOM, para probarla sin navegador.
 */

/** Marca de «ya vio la cinta» (localStorage, junto a las claves taps.disenador.* del diseñador). */
export const CLAVE_AVISO_PUBLICAR = 'taps.crear.aviso-publicar';

/** Copy de la cinta de transparencia (§A.3.1): se lee antes de invertir esfuerzo, no es un modal. */
export const CINTA_TRANSPARENCIA = 'Crea y prueba gratis, sin cuenta. Para publicar y compartir con tu grupo necesitas una cuenta de docente o institución. Tu trabajo se guarda en este navegador.';
/** Nombre del cuarto punto de progreso desde el inicio: nadie llega sorprendido. */
export const PASO_PUBLICAR = 'Publicar (con cuenta)';
/** Lo que dice «Publicar» mientras el gancho real (PR-8) no existe: honesto, sin prometer fecha. */
export const PRONTO_PUBLICAR = 'Publicar todavía no está listo. Cuando lo activemos, compartir tu Tap con un grupo pedirá una cuenta de docente o institución. Mientras tanto, guarda tu personaje en este dispositivo o mándalo por enlace.';

/** Puntos de entrada del plan (§A.2, los pone PR-7 con `?desde=`), más los que detecta el propio diseñador al abrir. */
export const ORIGENES_CREAR = ['portada', 'feed', 'enlace', 'instituciones', 'instructor', 'directo', 'continuar'] as const;
export type TOrigenCrear = (typeof ORIGENES_CREAR)[number];

/**
 * Origen de `taps/crear/abrir/<origen>`: `?desde=` si trae un valor conocido; si no, lo que vio el diseñador al abrir
 * (`enlace` con `#look=`, `continuar` con borrador, `directo` el resto).
 */
export function origenCrear(search: string, abrirDisenador: string | null | undefined): TOrigenCrear {
  let desde: string | null = null;
  try { desde = new URLSearchParams(search || '').get('desde'); } catch { desde = null; }
  if (desde && (ORIGENES_CREAR as readonly string[]).includes(desde)) return desde as TOrigenCrear;
  const abrir = (abrirDisenador ?? '').replace(/^abrir\//, '');
  return abrir === 'enlace' || abrir === 'continuar' ? abrir : 'directo';
}

/** Primer gesto creativo: tocar un punto de partida, cambiar una pieza, «Sorpréndeme» o aplicar una sugerencia. */
const CREO = /^(preset|cambio|sorprendeme)\//;

/**
 * Traduce un evento corto del diseñador (`preset/grabador`, `paso/listo`, `listo`…) a los hitos del embudo de /crear que
 * aún no se habían contado (`ya` guarda los emitidos: cada hito cuenta una vez por visita). `abrir/*` se resuelve aparte
 * con `origenCrear`. Devuelve [] si no hay hito nuevo.
 */
export function hitosCrear(nombreCorto: string, ya: Set<string>): TEventPath[] {
  const hitos: TEventPath[] = [];
  const marcar = (h: 'creo' | 'personaje-listo'): void => { if (!ya.has(h)) { ya.add(h); hitos.push(`taps/crear/${h}`); } };
  if (CREO.test(nombreCorto)) marcar('creo');
  // Llegar al paso «Listo» o guardar el look: el personaje está terminado (guardar sin pasar por el paso no ocurre, pero por si acaso).
  if (nombreCorto === 'paso/listo' || nombreCorto === 'listo') { marcar('creo'); marcar('personaje-listo'); }
  return hitos;
}
