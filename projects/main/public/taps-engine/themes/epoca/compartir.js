// Compartir looks del diseñador «época» (PR-4 del plan): enlace `disenador.html#look=<base64url(JSON compacto)>` y
// exportar/importar JSON. Módulo puro: no toca window ni la red; recibe la función de validación (validarLook) y las
// listas de objetos y escenarios conocidos para poder probarlo con node. El look viaja en el *hash* de la URL: nunca
// llega al servidor ni al prerender. Todo lo que entra se valida; los campos desconocidos se descartan y lo que no
// cuadra se rechaza con un motivo para personas (nunca una pantalla en blanco).

import { MAX_LEMA, MAX_NOMBRE, recortarLema, recortarNombre } from './guardado.js';

export const PARAM_LOOK = 'look';
/** Tamaño máximo del hash completo (`#look=...`), en caracteres: un look real ocupa ~650; esto frena enlaces raros. */
export const MAX_HASH = 2048;
/**
 * Versión del formato que se ESCRIBE. Historia: v1 (PR-4): v, b, l, i, w, n. v2 (PR-D6): gana `m` (lema de 40 caracteres).
 * La lectura acepta todas las de VERSIONES_LEIDAS (los enlaces ya compartidos siguen abriendo) y, si `v` falta o es rara, lee
 * igual los campos conocidos: la validación del look manda, no el número.
 */
export const VERSION = 2;
export const VERSIONES_LEIDAS = Object.freeze([1, 2]);

// JSON compacto: claves de una letra para que el enlace sea corto. v: versión, b: base, l: look, i: item, w: world, n: nombre, m: lema.
const CORTA = { base: 'b', look: 'l', item: 'i', world: 'w', nombre: 'n', lema: 'm' };

// ───────────────────────── base64url (UTF-8), sin depender de Buffer ─────────────────────────
export function aBase64url(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deBase64url(b64) {
  if (typeof b64 !== 'string' || !/^[A-Za-z0-9_-]*$/.test(b64)) throw new Error('base64url roto');
  const std = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64.length % 4) % 4);
  const bin = atob(std); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// ───────────────────────── codificar ─────────────────────────
/** Objeto compacto listo para serializar (sin `vest` nulo ni campos vacíos: sin nombre no hay `n`, sin lema no hay `m`). */
export function compactar(estado, nombre = '', lema = '') {
  const look = { ...estado.look }; if (!look.vest) delete look.vest;
  const o = { v: VERSION, [CORTA.base]: String(estado.base || 'sorpresa'), [CORTA.look]: look, [CORTA.item]: estado.item ?? null, [CORTA.world]: String(estado.world || '') };
  const n = recortarNombre(nombre); if (n) o[CORTA.nombre] = n;
  const m = recortarLema(lema); if (m) o[CORTA.lema] = m;
  return o;
}
/** Texto que va tras `#look=`. */
export function codificarLook(estado, nombre = '', lema = '') { return aBase64url(JSON.stringify(compactar(estado, nombre, lema))); }
/** Enlace completo a partir de la URL de la página (se le quita cualquier hash o búsqueda previa). */
export function enlaceDeLook(urlPagina, estado, nombre = '', lema = '') {
  const base = String(urlPagina).replace(/[#?].*$/, '');
  return `${base}#${PARAM_LOOK}=${codificarLook(estado, nombre, lema)}`;
}
/** JSON legible para «Exportar» (mismo contenido que el enlace, con claves largas). */
export function exportarJson(estado, nombre = '', lema = '') {
  const c = compactar(estado, nombre, lema);
  const o = { v: c.v, base: c.b, look: c.l, item: c.i, world: c.w }; if (c.n) o.nombre = c.n; if (c.m) o.lema = c.m;
  return JSON.stringify(o, null, 2);
}

// ───────────────────────── decodificar y validar ─────────────────────────
const MOTIVOS = {
  vacio: 'El enlace no trae ningún personaje.',
  grande: 'El enlace es demasiado largo para ser un personaje de verdad.',
  roto: 'El enlace está incompleto o se copió mal.',
  forma: 'Estos datos no tienen la forma de un personaje.',
  invalido: 'El personaje trae piezas que no existen en este diseñador.',
};

/** Quita del look los campos que `validar` reporta como desconocidos (una vez) y devuelve la copia. */
function sinDesconocidos(look, validar) {
  const copia = { ...look };
  for (const e of validar(copia)) { const m = /^campo desconocido «(.+)»$/.exec(e); if (m) delete copia[m[1]]; }
  return copia;
}

/**
 * Convierte un objeto (ya parseado, con claves cortas o largas, de v1 o v2) en `{ ok, estado, nombre, lema }` o
 * `{ ok: false, motivo }`. `opciones`: { items: [...objetos válidos], mundos: [...escenarios válidos] }. Un objeto desconocido
 * pasa a «nada»; un escenario desconocido pasa al primero de la lista (si hay lista). Campos que no son del personaje se
 * ignoran. Un enlace v1 (sin `m`) vuelve con `lema: ''`; el lema, si viene, se recorta a MAX_LEMA y si no es texto va vacío.
 */
export function normalizarLook(obj, validar, { items = null, mundos = null } = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, motivo: MOTIVOS.forma };
  const look = obj.l ?? obj.look, base = obj.b ?? obj.base, item = obj.i ?? obj.item, world = obj.w ?? obj.world, nombre = obj.n ?? obj.nombre, lema = obj.m ?? obj.lema;
  if (!look || typeof look !== 'object' || Array.isArray(look)) return { ok: false, motivo: MOTIVOS.forma };
  const limpio = sinDesconocidos(look, validar);
  if (validar(limpio).length) return { ok: false, motivo: MOTIVOS.invalido };
  let it = typeof item === 'string' && item ? item : null; if (items && it && !items.includes(it)) it = null;
  let w = typeof world === 'string' ? world : ''; if (mundos && !mundos.includes(w)) w = mundos[0] ?? ''; if (!w) return { ok: false, motivo: MOTIVOS.forma };
  return { ok: true, estado: { base: typeof base === 'string' && base ? base : 'sorpresa', look: limpio, item: it, world: w }, nombre: recortarNombre(typeof nombre === 'string' ? nombre : ''), lema: recortarLema(lema) };
}

/** Texto JSON (de un archivo o pegado) → resultado de `normalizarLook`. */
export function importarJson(texto, validar, opciones) {
  const t = String(texto ?? '').trim();
  if (!t) return { ok: false, motivo: MOTIVOS.vacio };
  if (t.length > MAX_HASH * 4) return { ok: false, motivo: MOTIVOS.grande };
  let obj; try { obj = JSON.parse(t); } catch { return { ok: false, motivo: MOTIVOS.roto }; }
  return normalizarLook(obj, validar, opciones);
}

/** Lo que va tras `#look=` → resultado de `normalizarLook`. */
export function decodificarLook(b64, validar, opciones) {
  if (!b64) return { ok: false, motivo: MOTIVOS.vacio };
  if (b64.length > MAX_HASH) return { ok: false, motivo: MOTIVOS.grande };
  let texto; try { texto = deBase64url(b64); } catch { return { ok: false, motivo: MOTIVOS.roto }; }
  let obj; try { obj = JSON.parse(texto); } catch { return { ok: false, motivo: MOTIVOS.roto }; }
  return normalizarLook(obj, validar, opciones);
}

/**
 * Lee `location.hash`. Devuelve null si no hay `#look=`; si lo hay, el resultado de `decodificarLook` (ok o motivo).
 * Acepta `#look=...` solo o entre otros pares `a=b&look=...`.
 */
export function lookDesdeHash(hash, validar, opciones) {
  const h = String(hash ?? '').replace(/^#/, '');
  if (!h) return null;
  if (h.length > MAX_HASH) return new RegExp(`(^|&)${PARAM_LOOK}=`).test(h.slice(0, 64)) ? { ok: false, motivo: MOTIVOS.grande } : null;
  const par = h.split('&').find(p => p.startsWith(PARAM_LOOK + '='));
  if (!par) return null;
  return decodificarLook(par.slice(PARAM_LOOK.length + 1), validar, opciones);
}

export { MAX_LEMA, MAX_NOMBRE };
