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
/** Tope del JSON adjunto (un look real ocupa ~650 caracteres): el mismo límite del campo `draft` del API (PR-9a). */
export const MAX_ADJUNTO = 2048;

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
/** Lo que el formulario necesita del borrador local: `json` es lo que viaja en el campo `draft` de la solicitud (string). */
export interface IBorradorAdjunto { adjunto: IAdjuntoBorrador; json: string; miniatura: string }

/**
 * Valida un adjunto antes de enviarlo (el API lo vuelve a validar contra el catálogo): forma cerrada, look sin errores según `validar`
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
 * URL. Null si no hay borrador, si es otro, si el look no valida o si excede el tope: el formulario sigue funcionando normal.
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
  return { adjunto, json, miniatura };
}

// ───────────── lectura del `draft` que devuelve el API (panel /solicitudes, PR-9b) ─────────────

/** Nombres legibles de puntos de partida (theme.json), objetos y escenarios (sugerencias.js) para mostrar un borrador como texto. */
export const NOMBRES_ADJUNTO: Readonly<Record<string, string>> = Object.freeze({
  grabador: 'Tomás (grabador)', arqueologa: 'Inés (arqueóloga)', senador: 'Lucio (senador)', escriba: 'Nefer (escriba)', artesano: 'Beltrán (artesano)',
  investigadora: 'Marta (investigadora)', periodista: 'Álvaro (periodista)', sorpresa: 'Sorpréndeme',
  pluma: 'Pluma', cepillo: 'Cepillo', pergamino: 'Pergamino', libro: 'Libro', lupa: 'Lupa', matraz: 'Matraz', antorcha: 'Antorcha', mapa: 'Mapa',
  'taller-londres': 'Taller de Londres', 'excavacion-egipto': 'Excavación en Egipto', 'foro-roma': 'Foro de Roma', 'sala-medieval': 'Sala medieval', 'laboratorio-moderno': 'Laboratorio moderno',
});
/** Colores del look que se enseñan como muestras, con su nombre para personas (el resto son matices derivados). */
export const COLORES_ADJUNTO: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ['skin', 'Piel'], ['hair', 'Pelo'], ['coat', 'Prenda'], ['shirt', 'Camisa'], ['vest', 'Chaleco'], ['cravat', 'Corbatín'], ['trousers', 'Pantalón'],
  ['shoes', 'Zapatos'], ['accent', 'Detalle'], ['hatColor', 'Sombrero'],
] as const);

/** Lo que el panel enseña de un borrador: todo texto plano y colores #rrggbb ya comprobados (nunca se interpreta como HTML). */
export interface IResumenAdjunto { adjunto: IAdjuntoBorrador; base: string; objeto: string; escenario: string; colores: { nombre: string; hex: string }[] }

const HEX = /^#[0-9a-fA-F]{6}$/;
const ETIQUETA = /^[0-9a-zA-Z-]{1,40}$/;
const nombre = (clave: unknown): string => typeof clave === 'string' && ETIQUETA.test(clave) ? (NOMBRES_ADJUNTO[clave] ?? clave) : '';

/**
 * Lee el `draft` tal como lo devuelve el API (string con el JSON canónico, null si no hubo o no validó). Es un dato de una
 * solicitud pública: solo se acepta la forma cerrada, con valores de tipos simples, y nunca se confía en él más que para mostrarlo.
 * Null con nulo, vacío, JSON roto o forma distinta: el panel enseña la solicitud sin personaje.
 */
export function leerDraft(raw: unknown): IResumenAdjunto | null {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_ADJUNTO) return null;
  let obj: unknown; try { obj = JSON.parse(raw); } catch { return null; }
  const adjunto = validarAdjunto(obj, look => Object.entries(look).some(([k, v]) => !ETIQUETA.test(k) || (typeof v === 'string' && v.length > 40)) ? ['forma'] : []);
  if (!adjunto) return null;
  const colores = COLORES_ADJUNTO.flatMap(([k, n]) => { const v = adjunto.l[k]; return typeof v === 'string' && HEX.test(v) ? [{ nombre: n, hex: v.toLowerCase() }] : []; });
  return { adjunto, base: nombre(adjunto.b) || 'Sorpréndeme', objeto: adjunto.i ? nombre(adjunto.i) || 'Objeto' : 'Sin objeto', escenario: nombre(adjunto.w) || 'Escenario', colores };
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
