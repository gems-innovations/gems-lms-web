import { TEventPath } from '../analytics-taxonomy';

/**
 * Lógica pura de la ruta /crear (PR-6 del plan, producto/taps/disenador-plan-ux.md §A): de dónde llegó la persona, qué
 * eventos `taps/crear/*` del embudo (§A.4) se derivan de los `taps/disenador/*` que ya emite el diseñador, y la cinta de
 * transparencia (§A.3.1) que se muestra una sola vez por navegador. PR-8 añade el copy del gancho de «Publicar» (§A.3.2) y el
 * borrador adjunto a la solicitud de /instituciones (§A.3.3). Sin Angular ni DOM, para probarla sin navegador.
 */

/** Marca de «ya vio la cinta» (localStorage, junto a las claves taps.disenador.* del diseñador). */
export const CLAVE_AVISO_PUBLICAR = 'taps.crear.aviso-publicar';

/** Copy de la cinta de transparencia (§A.3.1): se lee antes de invertir esfuerzo, no es un modal. */
export const CINTA_TRANSPARENCIA = 'Crea y prueba gratis, sin cuenta. Para publicar y compartir con tu grupo necesitas una cuenta de docente o institución. Tu trabajo se guarda en este navegador.';
/** Nombre del cuarto punto de progreso desde el inicio: nadie llega sorprendido. */
export const PASO_PUBLICAR = 'Publicar (con cuenta)';
/**
 * Copy de la hoja de «Publicar» sin sesión (§A.3.2): transparente, sin culpas ni urgencias, apto para menores. Nunca pide
 * edad ni datos a quien no va a registrarse; al estudiante solo se le ofrece mandar su personaje por enlace.
 */
export const COPY_GANCHO = {
  titulo: 'Para publicarlo, regístrate como docente o institución',
  intro: 'Publicar significa que tu Tap tenga enlace y código para que lo juegue tu grupo. Crear y probar sigue siendo gratis y sin cuenta.',
  ganas: ['Enlace y QR para tu grupo', 'Resultados por pregunta', 'Tu personaje con los colores de tu colegio'] as const,
  docente: 'Soy docente o institución',
  docenteDetalle: 'Te llevamos al formulario de solicitud; tu personaje va adjunto y lo encontrarás en tu cuenta.',
  estudiante: 'Soy estudiante',
  estudianteDetalle: 'Pídele a tu docente que lo publique: puedes enviarle tu personaje por enlace.',
  copiar: 'Copiar enlace',
  copiado: 'Enlace copiado. Pégalo donde quieras.',
  compartido: 'Enlace compartido.',
  sinCopiar: 'No se pudo copiar solo. Selecciona el enlace y cópialo.',
  volver: 'Volver y seguir creando',
  conserva: 'No pierdes nada: tu personaje se queda guardado en este navegador.',
} as const;

// ───────────── borrador adjunto a la solicitud de /instituciones (§A.3.3) ─────────────

/** Parámetro con el que /crear manda a /instituciones el id del borrador local: `/instituciones?borrador=<id>&desde=crear`. */
export const PARAM_BORRADOR = 'borrador';
/** Forma de los ids de guardado.js (`nuevoId`: tiempo en base 36, guion, 7+ caracteres en base 36). */
const ID_BORRADOR = /^[0-9a-z]{1,12}-[0-9a-z]{7,12}$/;
/** Tope del JSON adjunto (un look real ocupa ~650 caracteres); el campo `message` del API corta a 2000. */
export const MAX_ADJUNTO = 2048;
/** Marcas del bloque que se concatena en `msg` mientras el API no tenga campo propio (PR-9). */
export const MARCA_ADJUNTO_INICIO = '[gems-borrador v1]';
export const MARCA_ADJUNTO_FIN = '[/gems-borrador]';
/** Largo máximo que acepta el API en `message`. */
export const MAX_MENSAJE_API = 2000;

/** El valor de `?borrador=` si tiene la forma de un id; null si no (nunca se usa un valor libre). */
export function idBorradorValido(valor: string | null | undefined): string | null {
  return valor && ID_BORRADOR.test(valor) ? valor : null;
}

/** Id del borrador en `?borrador=` de una búsqueda completa; null si no viene o no tiene la forma de un id. */
export function leerBorradorId(search: string): string | null {
  let v: string | null = null;
  try { v = new URLSearchParams(search || '').get(PARAM_BORRADOR); } catch { v = null; }
  return idBorradorValido(v);
}

/** Enlace de «Soy docente o institución»: el formulario de /instituciones con el borrador (si hay) y de dónde viene. */
export function enlaceRegistro(borradorId: string | null): { ruta: string; query: Record<string, string>; fragment: string } {
  const query: Record<string, string> = { desde: 'crear' };
  if (borradorId) query[PARAM_BORRADOR] = borradorId;
  return { ruta: '/instituciones', query, fragment: 'solicitud' };
}

/** Look del tema época tal como lo guarda guardado.js (claves largas) o compartir.js (claves cortas). */
export interface IEstadoLook { base: string; look: Record<string, unknown>; item: string | null; world: string }
/** Lo que viaja en la solicitud: la misma forma compacta de compartir.js (v, b, l, i, w) más el `borradorId`. Sin nombre ni miniatura. */
export interface IAdjuntoBorrador { v: 1; borradorId: string; b: string; l: Record<string, unknown>; i: string | null; w: string }
/** Lo que el formulario necesita del borrador local. */
export interface IBorradorAdjunto { adjunto: IAdjuntoBorrador; json: string; bloque: string; miniatura: string }

/**
 * Valida un adjunto (lo que se arma aquí o lo que PR-9 leerá en el API): forma cerrada, look sin errores según `validar`
 * (validarLook de rig.js), id con forma de id y tamaño acotado. Devuelve el adjunto limpio o null.
 */
export function validarAdjunto(obj: unknown, validar: (look: Record<string, unknown>) => string[]): IAdjuntoBorrador | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (o['v'] !== 1 || typeof o['borradorId'] !== 'string' || !ID_BORRADOR.test(o['borradorId'])) return null;
  const look = o['l'];
  if (!look || typeof look !== 'object' || Array.isArray(look)) return null;
  const l = look as Record<string, unknown>;
  if (Object.values(l).some(v => v !== null && !['string', 'boolean'].includes(typeof v))) return null;
  if (validar(l).length) return null;
  const b = typeof o['b'] === 'string' && o['b'] ? o['b'].slice(0, 40) : 'sorpresa';
  const i = typeof o['i'] === 'string' && o['i'] ? o['i'].slice(0, 40) : null;
  if (typeof o['w'] !== 'string' || !o['w']) return null;
  const adjunto: IAdjuntoBorrador = { v: 1, borradorId: o['borradorId'], b, l, i, w: o['w'].slice(0, 40) };
  return JSON.stringify(adjunto).length <= MAX_ADJUNTO ? adjunto : null;
}

/**
 * Arma el adjunto a partir del borrador crudo de localStorage (`taps.disenador.borrador`) cuando su `borradorId` es el de la
 * URL. Null si no hay borrador, si es otro, si el look no valida o si no cabe: el formulario sigue funcionando normal.
 * `vest` nulo no viaja (como compactar de compartir.js). La miniatura (PNG pequeña del propio borrador) solo se muestra; no se envía.
 */
export function armarAdjunto(raw: string | null, borradorId: string | null, validar: (look: Record<string, unknown>) => string[]): IBorradorAdjunto | null {
  if (!raw || !borradorId) return null;
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  if (!b || typeof b !== 'object' || b['borradorId'] !== borradorId) return null;
  const look = b['look'] && typeof b['look'] === 'object' && !Array.isArray(b['look']) ? { ...(b['look'] as Record<string, unknown>) } : null;
  if (!look) return null;
  if (!look['vest']) delete look['vest'];
  const adjunto = validarAdjunto({ v: 1, borradorId, b: b['base'], l: look, i: b['item'] ?? null, w: b['world'] }, validar);
  if (!adjunto) return null;
  const json = JSON.stringify(adjunto);
  const miniatura = typeof b['miniatura'] === 'string' && b['miniatura'].startsWith('data:image/') ? b['miniatura'] : '';
  return { adjunto, json, bloque: `${MARCA_ADJUNTO_INICIO}\n${json}\n${MARCA_ADJUNTO_FIN}`, miniatura };
}

/** Cuántos caracteres le quedan a la persona en el mensaje cuando el bloque va dentro de `message` (API: 2000). */
export function restaMensaje(bloque: string | null): number {
  return Math.max(0, MAX_MENSAJE_API - (bloque ? bloque.length + 2 : 0));
}

/** `message` final: lo escrito (recortado a lo que cabe) y, si hay adjunto, el bloque marcado al final. */
export function mensajeConAdjunto(mensaje: string, bloque: string | null): string {
  const texto = (mensaje ?? '').trim();
  if (!bloque) return texto;
  const propio = texto.slice(0, restaMensaje(bloque));
  return propio ? `${propio}\n\n${bloque}` : bloque;
}

/** Lo inverso (para PR-9 y las pruebas): saca el adjunto de un `message` con bloque; null si no hay o no valida. */
export function extraerAdjunto(message: string | null | undefined, validar: (look: Record<string, unknown>) => string[]): { adjunto: IAdjuntoBorrador; mensaje: string } | null {
  const m = message ?? '';
  const i = m.indexOf(MARCA_ADJUNTO_INICIO), f = m.indexOf(MARCA_ADJUNTO_FIN);
  if (i < 0 || f < i) return null;
  let obj: unknown; try { obj = JSON.parse(m.slice(i + MARCA_ADJUNTO_INICIO.length, f).trim()); } catch { return null; }
  const adjunto = validarAdjunto(obj, validar);
  return adjunto ? { adjunto, mensaje: (m.slice(0, i) + m.slice(f + MARCA_ADJUNTO_FIN.length)).trim() } : null;
}

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
