// Taps Engine · registro de personajes y fondos (desacoplado del motor y de los temas).
//
// Cambiar o añadir un personaje = una carpeta con un manifiesto, sin tocar código:
//   personajes/<id>/personaje.json   { nombre, tipo: 'glb' | 'skin-blocky' | 'sprite2d', archivo, miniatura?, escala?, giro?,
//                                      animaciones: { idle, pensar, acierto, fallo, hablar, celebrar, triste? }, licencia }
//   fondos/<id>/fondo.json           { nombre, tipo: 'imagen' | 'color', archivo?, cielo:[arriba, abajo], suelo,
//                                      sueloOscuro?, sol?, horizonte?, luz?, licencia }
// Un tema los usa listando ids en su theme.json: "personajes": ["zorro", …], "fondos": ["castillo", …]. Al cargar el tema,
// el motor llama expandirTema(): cada manifiesto pasa a `characters[id]` / `scenes[id]` con las rutas ya absolutas, en el
// mismo formato que los personajes y escenas escritos a mano (así minecraft/estudio no cambian). Un manifiesto roto se
// salta con un aviso: nunca tumba el tema. Guía corta: personajes/LEEME.md.
//
// Sin DOM: también lo usan las pruebas (node --test) y el generador de Taps (con un lector de archivos en vez de fetch).

const BASE = new URL('.', import.meta.url);

/** Reacciones del motor que un personaje mapea a sus clips. Opcionales: `triste` (si falta, usa `fallo`) y `caminar` (entrada «camina»). */
export const REACCIONES = Object.freeze(['idle', 'pensar', 'acierto', 'fallo', 'hablar', 'celebrar', 'triste', 'caminar']);
export const REACCIONES_OBLIGATORIAS = Object.freeze(['idle', 'pensar', 'acierto', 'fallo', 'hablar', 'celebrar']);
/** Animación que pide el motor (theme.reactions[x].anim) → reacción del manifiesto. */
export const ANIM_A_REACCION = Object.freeze({
  idle: 'idle', think: 'pensar', talk: 'hablar', celebrate: 'acierto', hurt: 'fallo', dance: 'celebrar', sad: 'triste',
  wave: 'hablar', jump: 'celebrar', scared: 'fallo',
});
export const TIPOS_PERSONAJE = Object.freeze(['glb', 'skin-blocky', 'sprite2d']);
export const TIPOS_FONDO = Object.freeze(['imagen', 'color']);

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR = /^#[0-9a-f]{6}$/i;
export const urlPersonaje = (id, base = BASE) => new URL(`personajes/${id}/personaje.json`, base);
export const urlFondo = (id, base = BASE) => new URL(`fondos/${id}/fondo.json`, base);
/**
 * Índice agregado (lo escribe `npm run taps:generar`): { personajes: { id: manifiesto }, fondos: { id: manifiesto } }.
 * Con él, abrir un tema cuesta UNA petición en vez de una por manifiesto. Un id que no esté en el índice (p. ej. recién
 * creado sin regenerar) se pide suelto, así que en desarrollo basta con crear la carpeta.
 */
export const urlIndice = (base = BASE) => new URL('registro.json', base);

function validarLicencia(l, e) {
  if (!l || typeof l !== 'object') return e.push('falta «licencia» { nombre, url, autor, fuente }');
  for (const k of ['nombre', 'url', 'autor', 'fuente']) if (typeof l[k] !== 'string' || !l[k].trim()) e.push(`licencia.${k} vacío`);
  // Solo licencias que permiten uso comercial y redistribución dentro de la app (ver producto/taps/personajes-libres.md).
  if (typeof l.nombre === 'string' && !/^(CC0|CC-BY|CC BY|MIT|OFL)/i.test(l.nombre)) e.push(`licencia «${l.nombre}» no admitida (CC0, CC-BY, MIT u OFL)`);
  if (typeof l.nombre === 'string' && (/\b(NC|ND)\b/.test(l.nombre) || /no comercial|non-?commercial|personal/i.test(l.nombre))) e.push(`licencia «${l.nombre}» no permite uso comercial o derivados`);
}

/** Problemas de un personaje.json (lista vacía = válido). `id` = nombre de su carpeta. */
export function validarPersonaje(m, id) {
  const e = [];
  if (!m || typeof m !== 'object') return ['no es un objeto JSON'];
  if (!ID.test(id ?? '')) e.push(`el id «${id}» no está en kebab-case`);
  if (m.id !== undefined && m.id !== id) e.push(`«id» (${m.id}) no coincide con la carpeta (${id})`);
  if (typeof m.nombre !== 'string' || !m.nombre.trim()) e.push('falta «nombre»');
  if (!TIPOS_PERSONAJE.includes(m.tipo)) e.push(`«tipo» debe ser ${TIPOS_PERSONAJE.join(' | ')}`);
  if (typeof m.archivo !== 'string' || !m.archivo) e.push('falta «archivo»');
  if (m.tipo === 'glb') {
    const a = m.animaciones;
    if (!a || typeof a !== 'object') e.push('un personaje glb necesita «animaciones»');
    else for (const r of REACCIONES_OBLIGATORIAS) if (typeof a[r] !== 'string' || !a[r]) e.push(`animaciones.${r} vacío (nombre del clip del .glb)`);
    if (typeof m.miniatura !== 'string') e.push('un personaje glb necesita «miniatura» (PNG para la capa ligera)');
  }
  if (m.escala !== undefined && !(m.escala > 0 && m.escala < 5)) e.push('«escala» debe estar entre 0 y 5');
  validarLicencia(m.licencia, e);
  return e;
}

/** Problemas de un fondo.json (lista vacía = válido). */
export function validarFondo(m, id) {
  const e = [];
  if (!m || typeof m !== 'object') return ['no es un objeto JSON'];
  if (!ID.test(id ?? '')) e.push(`el id «${id}» no está en kebab-case`);
  if (m.id !== undefined && m.id !== id) e.push(`«id» (${m.id}) no coincide con la carpeta (${id})`);
  if (typeof m.nombre !== 'string' || !m.nombre.trim()) e.push('falta «nombre»');
  if (!TIPOS_FONDO.includes(m.tipo)) e.push(`«tipo» debe ser ${TIPOS_FONDO.join(' | ')}`);
  if (m.tipo !== 'color' && (typeof m.archivo !== 'string' || !m.archivo)) e.push('falta «archivo» (imagen del fondo)');
  if (!Array.isArray(m.cielo) || m.cielo.length !== 2 || !m.cielo.every(c => COLOR.test(c))) e.push('«cielo» debe ser ["#arriba", "#abajo"]');
  if (!COLOR.test(m.suelo ?? '')) e.push('«suelo» debe ser un color #rrggbb');
  if (m.horizonte !== undefined && !(m.horizonte > 0 && m.horizonte < 1)) e.push('«horizonte» es la altura del suelo en la imagen (0..1)');
  validarLicencia(m.licencia, e);
  return e;
}

const abs = (rel, url) => (rel ? new URL(rel, url).href : null);

/** personaje.json → entrada de theme.characters (rutas absolutas; `skin` solo para skin-blocky, que lee el tema minecraft). */
export function personajeComoTema(m, url) {
  const c = {
    name: m.nombre, tipo: m.tipo, registro: true, escala: m.escala ?? 1, giro: m.giro ?? 0,
    miniatura: abs(m.miniatura, url), licencia: m.licencia,
  };
  if (m.tipo === 'skin-blocky') { c.skin = abs(m.archivo, url); if (typeof m.slim === 'boolean') c.slim = m.slim; }
  else if (m.tipo === 'glb') { c.modelo = abs(m.archivo, url); c.animaciones = { ...m.animaciones }; }
  else c.imagen = abs(m.archivo, url);
  if (m.voz) c.voz = m.voz;
  return c;
}

/** fondo.json → entrada de theme.scenes (lo que pinta la capa ligera + lo que usa el renderizador). */
export function fondoComoTema(m, url) {
  return {
    name: m.nombre, tipo: m.tipo, registro: true, sky: [...m.cielo], ground: m.suelo, groundDark: m.sueloOscuro ?? m.suelo,
    ...(m.sol === false ? { sun: false } : {}), imagen: abs(m.archivo, url), horizonte: m.horizonte ?? 0.66,
    luz: { color: '#ffffff', intensidad: 1, ...(m.luz || {}) },
    posicionLigera: m.posicionLigera ?? '50% 100%', licencia: m.licencia,
  };
}

async function leerJsonHttp(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout?.(6000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/**
 * Completa `theme.characters` y `theme.scenes` con los ids de `theme.personajes` y `theme.fondos` (en paralelo).
 * No pisa lo que el tema ya define a mano. `leer(url) → objeto` permite usarlo sin red (pruebas, generador).
 * Devuelve { theme, errores } con los manifiestos que se saltaron y por qué.
 */
export async function expandirTema(theme, { leer = leerJsonHttp, base = BASE } = {}) {
  const errores = [];
  theme.characters = { ...(theme.characters || {}) };
  theme.scenes = { ...(theme.scenes || {}) };
  const indice = await Promise.resolve().then(() => leer(urlIndice(base))).catch(() => null);
  const cargar = async (ids, url, validar, convertir, destino, tipo) => Promise.all((Array.isArray(ids) ? ids : []).map(async id => {
    if (destino[id]) return;
    const u = url(id, base);
    try {
      const m = indice?.[tipo === 'personaje' ? 'personajes' : 'fondos']?.[id] ?? await leer(u);
      const e = validar(m, id);
      if (e.length) { errores.push(`${tipo} «${id}»: ${e.join('; ')}`); return; }
      destino[id] = convertir(m, u);
    } catch (err) { errores.push(`${tipo} «${id}»: no se pudo leer (${err?.message || err})`); }
  }));
  await Promise.all([
    cargar(theme.personajes, urlPersonaje, validarPersonaje, personajeComoTema, theme.characters, 'personaje'),
    cargar(theme.fondos, urlFondo, validarFondo, fondoComoTema, theme.scenes, 'fondo'),
  ]);
  // el orden de la lista del tema manda (el primero es el personaje por defecto)
  if (Array.isArray(theme.personajes)) theme.characters = ordenar(theme.characters, theme.personajes);
  if (!theme.scenes[theme.defaultWorld]) theme.defaultWorld = Object.keys(theme.scenes)[0];
  if (errores.length && typeof console !== 'undefined') console.warn('[taps-engine] registro:', errores.join(' | '));
  return { theme, errores };
}
function ordenar(obj, ids) {
  const out = {};
  for (const id of ids) if (obj[id]) out[id] = obj[id];
  for (const [k, v] of Object.entries(obj)) if (!out[k]) out[k] = v;
  return out;
}

/**
 * Elección determinista y variada para el Tap número `orden` de una lista: el mismo orden da siempre el mismo personaje y
 * fondo; Taps consecutivos nunca repiten ni personaje ni fondo (si hay más de uno) y cada vuelta recorre todos. El fondo
 * avanza con un paso coprimo distinto de 1, así la pareja (personaje, fondo) no se repite en el mismo orden cada vuelta.
 */
export function elegirParaTap(orden, personajes, fondos) {
  if (!personajes.length || !fondos.length) throw new Error('elegirParaTap: listas vacías');
  const paso = n => { let s = n > 2 ? 2 : 1; while (gcd(s, n) !== 1) s++; return s; };
  return { host: personajes[orden % personajes.length], world: fondos[(orden * paso(fondos.length)) % fondos.length] };
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export default { expandirTema, validarPersonaje, validarFondo, personajeComoTema, fondoComoTema, elegirParaTap, REACCIONES, ANIM_A_REACCION };
