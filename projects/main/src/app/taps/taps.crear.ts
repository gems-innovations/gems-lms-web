import { TEventPath } from '../analytics-taxonomy';

/**
 * Lógica pura de la ruta /crear (PR-6 del plan, producto/taps/disenador-plan-ux.md §A): de dónde llegó la persona, qué
 * eventos `taps/crear/*` del embudo (§A.4) se derivan de los `taps/disenador/*` que ya emite el diseñador, y la cinta de
 * transparencia (§A.3.1) que se muestra una sola vez por navegador. PR-8 añade el copy del gancho de «Publicar» (§A.3.2) y el
 * borrador adjunto a la solicitud de /instituciones (§A.3.3). Sin Angular ni DOM, para probarla sin navegador.
 */

/**
 * Bandera `tapsCreador` (PR-W0): enciende el paso «Preguntas» de /crear. Vive en config.js (`globalThis.tapsCreador = true`, apagada
 * por defecto y ausente en los despliegues que no la ponen). Solo en desarrollo y pruebas e2e (`dev`) se puede encender además con
 * `?editor=1`. Cualquier otro valor (cadenas, 1, "true") cuenta como apagada.
 */
export function tapsCreadorActivo(bandera: unknown, search: string, dev: boolean): boolean {
  if (bandera === true) return true;
  if (!dev) return false;
  try { return new URLSearchParams(search || '').get('editor') === '1'; } catch { return false; }
}

/** Marca de «ya vio la cinta» (localStorage, junto a las claves taps.disenador.* del diseñador). */
export const CLAVE_AVISO_PUBLICAR = 'taps.crear.aviso-publicar';
/**
 * Silencio general de Taps: la misma clave que el feed (`SOUND_KEY` en taps-feed.component.ts; 'off' = apagado, otra cosa o
 * nada = encendido). El altavoz del creador de personajes (PR-D1) la lee y la escribe para que no haya dos interruptores.
 */
export const CLAVE_SONIDO_TAPS = 'gems-taps-sound';
/** Estado del sonido general a partir de lo guardado: solo 'off' apaga. */
export const sonidoActivo = (guardado: string | null): boolean => guardado !== 'off';

/** Copy de la cinta de transparencia (§A.3.1): se lee antes de invertir esfuerzo, no es un modal. */
export const CINTA_TRANSPARENCIA = 'Crea y prueba gratis, sin cuenta. Publicar requiere cuenta de docente o institución. Tu trabajo se guarda en este navegador.';
/** Nombre del cuarto punto de progreso desde el inicio: nadie llega sorprendido. */
export const PASO_PUBLICAR = 'Publicar (con cuenta)';
/**
 * «Soy estudiante» elegido una vez en la hoja: los avisos de cuenta del creador desaparecen para siempre en ese navegador (a menores
 * no se les insiste; disenador-v2-plan.md §2). La misma clave que lee public/taps-engine/themes/epoca/hitos.js (CLAVE_ESTUDIANTE).
 */
export const CLAVE_ESTUDIANTE = 'taps.crear.es-estudiante';
/** Hitos de cuenta del creador (hitos.js); de cada uno se mide en /crear si abrió la hoja o cerró el aviso. */
export const HITOS_CUENTA = ['navegador', 'listo', 'guardado', 'probado', 'vuelve'] as const;
export type THitoCuenta = (typeof HITOS_CUENTA)[number];
/**
 * Copy de la hoja de «Publicar» sin sesión (§A.3.2): transparente, sin culpas ni urgencias, apto para menores. Nunca pide
 * edad ni datos a quien no va a registrarse; al estudiante solo se le ofrece mandar su personaje por enlace.
 */
export const COPY_GANCHO = {
  titulo: 'Para publicarlo, regístrate como docente o institución',
  intro: 'Publicar significa que tu Tap tenga enlace y código para que otras personas lo jueguen. Crear y probar sigue siendo gratis y sin cuenta.',
  ganas: ['Enlace y QR para compartirlo', 'Resultados por pregunta', 'Tu personaje con los colores de tu colegio'] as const,
  docente: 'Soy docente o institución',
  docenteDetalle: 'Se abre un formulario para pedir acceso y tu personaje viaja adjunto. Un superadmin de GEMS revisa la solicitud y te respondemos; hasta entonces no se publica nada.',
  estudiante: 'Soy estudiante',
  estudianteDetalle: 'Pídele a tu docente que lo publique: puedes enviarle tu personaje por enlace.',
  copiar: 'Copiar enlace',
  copiado: 'Enlace copiado. Pégalo donde quieras.',
  compartido: 'Enlace compartido.',
  sinCopiar: 'No se pudo copiar solo. Selecciona el enlace y cópialo.',
  volver: 'Volver y seguir creando',
  conserva: 'No pierdes nada: tu personaje se queda guardado en este navegador.',
} as const;

/** Título de la hoja con el nombre del personaje (PR-D2: «Para publicar a X…»); sin nombre, el título general. El nombre va como texto, nunca como HTML. */
export function tituloGancho(nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim();
  return n ? `Para publicar a ${n}, regístrate como docente o institución` : COPY_GANCHO.titulo;
}

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
 * Tampoco viajan el `lema` (PR-D6) ni la `hora` del día (PR-D8): el API (ms-education InstitutionRequestDraft) solo acepta v,
 * borradorId, b, l, i, w y descarta el borrador entero ante una clave extra; cuando el API los acepte, se añaden aquí y en IAdjuntoBorrador.
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
  biblioteca: 'Biblioteca', observatorio: 'Observatorio', aula: 'Aula',
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

/** Catálogo cerrado del tema época (rig.js CATALOGO y COLORES; el mismo que valida el API en InstitutionRequestDraft). */
const PIEZAS_LOOK: Readonly<Record<string, readonly string[]>> = Object.freeze({
  hairStyle: ['corto', 'recogido', 'ondas', 'largo', 'bob', 'rizos', 'calvo'],
  beard: ['none', 'patillas', 'bigote', 'perilla', 'barba'],
  outfit: ['levita', 'safari', 'bata', 'toga', 'tunica', 'medieval', 'traje'],
  sleeve: ['larga', 'corta'],
  hat: ['none', 'copa', 'safari', 'bicornio', 'laurel', 'gorra', 'boina'],
});
const COLORES_LOOK = new Set(['skin', 'skinShade', 'lips', 'blush', 'hair', 'brow', 'coat', 'coatShade', 'shirt', 'vest', 'cravat', 'trousers', 'shoes', 'belt', 'accent', 'hatColor', 'hatBand', 'glow']);

/** Errores de un look leído del API: piezas de su lista, colores #rrggbb (o null), `glasses` booleano; nada más. Como validarLook de rig.js. */
export function validarLookCatalogo(look: Record<string, unknown>): string[] {
  const e: string[] = [];
  for (const [k, v] of Object.entries(look)) {
    if (k in PIEZAS_LOOK) { if (typeof v !== 'string' || !PIEZAS_LOOK[k].includes(v)) e.push(`${k} fuera del catálogo`); }
    else if (COLORES_LOOK.has(k)) { if (v !== null && (typeof v !== 'string' || !HEX.test(v))) e.push(`${k} no es un color`); }
    else if (k === 'glasses') { if (typeof v !== 'boolean') e.push('glasses no es booleano'); }
    else e.push(`campo desconocido «${k}»`);
  }
  return e;
}

/**
 * Lee el `draft` tal como lo devuelve el API (string con el JSON canónico, null si no hubo o no validó). Es un dato de una
 * solicitud pública: solo se acepta la forma cerrada, con valores de tipos simples, y nunca se confía en él más que para mostrarlo.
 * Null con nulo, vacío, JSON roto o forma distinta: el panel enseña la solicitud sin personaje.
 */
export function leerDraft(raw: unknown): IResumenAdjunto | null {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_ADJUNTO) return null;
  let obj: unknown; try { obj = JSON.parse(raw); } catch { return null; }
  const adjunto = validarAdjunto(obj, validarLookCatalogo);
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

/**
 * «Volver» de la cabecera de /crear (marco de marca): a donde se vino según `?desde=`; sin origen conocido, a la portada.
 * El borrador no se pierde: el diseñador lo guarda al desmontarse (disenador.js `destruir()`).
 */
export function destinoVolver(desde: string | null | undefined): { ruta: string; texto: string } {
  switch (desde) {
    case 'feed': return { ruta: '/taps', texto: 'Volver a Taps' };
    case 'instituciones': return { ruta: '/instituciones', texto: 'Volver a instituciones' };
    case 'instructor': return { ruta: '/instructor', texto: 'Volver al panel' };
    default: return { ruta: '/', texto: 'Volver al inicio' };
  }
}

/** Primer gesto creativo: tocar un punto de partida, cambiar una pieza, «Sorpréndeme» o aplicar una sugerencia. */
const CREO = /^(preset|cambio|sorprendeme)\//;
/** `hito-cuenta/<abrir|entendido>/<hito>` del diseñador (lo «visto» ya viaja en `taps/disenador/*`). */
const CUENTA = new RegExp(`^hito-cuenta/(abrir|entendido)/(${HITOS_CUENTA.join('|')})$`);

/**
 * Traduce un evento corto del diseñador (`preset/grabador`, `paso/listo`, `listo`…) a los hitos del embudo de /crear que
 * aún no se habían contado (`ya` guarda los emitidos: cada hito cuenta una vez por visita). `abrir/*` se resuelve aparte
 * con `origenCrear`. Devuelve [] si no hay hito nuevo.
 */
export function hitosCrear(nombreCorto: string, ya: Set<string>): TEventPath[] {
  const hitos: TEventPath[] = [];
  const marcar = (h: string): void => { if (!ya.has(h)) { ya.add(h); hitos.push(`taps/crear/${h}`); } };
  if (CREO.test(nombreCorto)) marcar('creo');
  // Llegar al paso «Listo» o guardar el look: el personaje está terminado (guardar sin pasar por el paso no ocurre, pero por si acaso).
  if (nombreCorto === 'paso/listo' || nombreCorto === 'listo') { marcar('creo'); marcar('personaje-listo'); }
  // Avisos de cuenta por hito (PR-D2, §6): `taps/crear/cuenta/<hito>/<abrir|entendido>`, una vez por visita cada par, para ver qué hito convence.
  const m = CUENTA.exec(nombreCorto);
  if (m) marcar(`cuenta/${m[2]}/${m[1]}`);
  return hitos;
}
