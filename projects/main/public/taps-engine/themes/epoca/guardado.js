// Guardado en el dispositivo del diseñador «época» (PR-3 del plan): borrador autoguardado y «Mis looks».
// Módulo puro: no toca window ni localStorage por su cuenta; recibe un «almacén» (getItem/setItem/removeItem) y
// la función de validación, para poder probarlo con node. Todo acceso al almacén va con try/catch: si falla,
// la página sigue funcionando sin guardar y lo dice con una línea amable.

export const CLAVE_BORRADOR = 'taps.disenador.borrador';
export const CLAVE_LOOKS = 'taps.disenador.looks';
export const MAX_LOOKS = 12;
export const MAX_NOMBRE = 20;
/** Lema del personaje (PR-D6, disenador-v2-plan.md §5): lo dice al aparecer en un Tap. Opcional; viaja en el enlace (`m`), en Mis looks y en el borrador. */
export const MAX_LEMA = 40;

/** Identificador estable y legible (se usa como `borradorId` al importar el borrador a una cuenta, PR-8/PR-9). */
export function nuevoId(aleatorio = Math.random, ahora = Date.now()) {
  return ahora.toString(36) + '-' + Math.floor(aleatorio() * 0xffffffff).toString(36).padStart(7, '0');
}

/** Recorta un texto a `max` puntos de código (no bytes), sin espacios sobrantes ni saltos; vacío → `porDefecto`. */
function recortar(texto, max, porDefecto) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  const puntos = Array.from(limpio);
  return (puntos.length > max ? puntos.slice(0, max).join('').trim() : limpio) || porDefecto;
}
/** Recorta el nombre a MAX_NOMBRE caracteres (por puntos de código, no por bytes), sin espacios sobrantes ni saltos. */
export function recortarNombre(nombre, porDefecto = '') { return recortar(nombre, MAX_NOMBRE, porDefecto); }
/** Recorta el lema a MAX_LEMA caracteres; si no es texto o está vacío, queda ''. */
export function recortarLema(lema) { return typeof lema === 'string' ? recortar(lema, MAX_LEMA, '') : ''; }

/**
 * Envuelve un almacén tipo Storage. `leer`/`escribir`/`quitar` nunca lanzan; `disponible` dice si el almacén
 * responde (se comprueba con una escritura de prueba, como hacen los navegadores con el modo privado).
 */
export function crearAlmacen(storage) {
  let disponible = false;
  try { const k = CLAVE_LOOKS + '.prueba'; storage.setItem(k, '1'); storage.removeItem(k); disponible = true; } catch { disponible = false; }
  return {
    disponible,
    leer(clave) { try { return storage.getItem(clave); } catch { return null; } },
    escribir(clave, valor) { try { storage.setItem(clave, valor); return true; } catch { return false; } },
    quitar(clave) { try { storage.removeItem(clave); return true; } catch { return false; } },
  };
}

/** Un estado del diseñador es válido si tiene look sin errores, item string|null, world string y hora (PR-D8) string o ausente. */
function estadoValido(e, validar) {
  if (!e || typeof e !== 'object' || !e.look || typeof e.look !== 'object' || Array.isArray(e.look)) return false;
  if (validar(e.look).length) return false;
  if (e.item !== null && e.item !== undefined && typeof e.item !== 'string') return false;
  if (e.hora !== undefined && e.hora !== null && typeof e.hora !== 'string') return false;
  return typeof e.world === 'string' && typeof e.base === 'string';
}
/** La hora solo se copia si viene (los guardados de antes no la tienen y el diseñador los abre de día). */
function copiarEstado(e) { const c = { base: e.base, look: { ...e.look }, item: e.item ?? null, world: e.world }; if (typeof e.hora === 'string' && e.hora) c.hora = e.hora; return c; }

// ───────────────────────── borrador ─────────────────────────
/**
 * Devuelve el borrador listo para serializar; conserva el `borradorId` si ya había uno. `extras.lema` (PR-D6) se guarda recortado;
 * el adjunto de la solicitud de /instituciones (taps.crear.ts armarAdjunto) NO lo copia: el API solo acepta v, borradorId, b, l, i, w.
 */
export function armarBorrador(estado, paso, anterior, ahora = Date.now(), { lema = '' } = {}) {
  return { v: 1, borradorId: anterior?.borradorId || nuevoId(Math.random, ahora), paso: Math.max(0, Math.min(3, paso | 0)), fecha: ahora, lema: recortarLema(lema), ...copiarEstado(estado) };
}

/** Lee el borrador guardado; null si no hay, si el JSON está roto o si el look ya no es válido. Conserva la miniatura PNG si trae una (PR-8) y el lema (PR-D6). */
export function parsearBorrador(raw, validar) {
  if (!raw) return null;
  let b; try { b = JSON.parse(raw); } catch { return null; }
  if (!estadoValido(b, validar) || typeof b.borradorId !== 'string') return null;
  const miniatura = typeof b.miniatura === 'string' && b.miniatura.startsWith('data:image/') ? b.miniatura : '';
  return { borradorId: b.borradorId, paso: Math.max(0, Math.min(3, b.paso | 0)), fecha: +b.fecha || 0, miniatura, lema: recortarLema(b.lema), ...copiarEstado(b) };
}

// ───────────────────────── mis looks ─────────────────────────
/** Lee la lista guardada: descarta entradas sin id, con look inválido o con forma rara; JSON roto → lista vacía. */
export function parsearLooks(raw, validar) {
  if (!raw) return [];
  let lista; try { lista = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(lista)) return [];
  const vistos = new Set(), buenos = [];
  for (const l of lista) {
    if (!estadoValido(l, validar) || typeof l.id !== 'string' || vistos.has(l.id)) continue;
    vistos.add(l.id);
    buenos.push({ id: l.id, nombre: recortarNombre(l.nombre, 'Sin nombre'), lema: recortarLema(l.lema), fecha: +l.fecha || 0, miniatura: typeof l.miniatura === 'string' && l.miniatura.startsWith('data:image/') ? l.miniatura : '', ...copiarEstado(l) });
    if (buenos.length >= MAX_LOOKS) break;
  }
  return buenos;
}

export function serializarLooks(lista) { return JSON.stringify(lista); }
export function serializarBorrador(b) { return JSON.stringify(b); }

/**
 * Añade un look al principio. Si la lista ya tiene MAX_LOOKS, no guarda y devuelve `lleno: true`
 * (la interfaz pide borrar uno; nada de bloqueos como anzuelo). Devuelve también el look guardado.
 */
export function guardarLook(lista, estado, { nombre, lema = '', miniatura = '', ahora = Date.now(), id = nuevoId(Math.random, ahora) } = {}) {
  if (lista.length >= MAX_LOOKS) return { lista, lleno: true, look: null };
  const look = { id, nombre: recortarNombre(nombre, 'Sin nombre'), lema: recortarLema(lema), fecha: ahora, miniatura: String(miniatura || ''), ...copiarEstado(estado) };
  return { lista: [look, ...lista], lleno: false, look };
}

export function renombrarLook(lista, id, nombre) {
  return lista.map(l => l.id === id ? { ...l, nombre: recortarNombre(nombre, l.nombre) } : l);
}

/** Duplica junto al original con nombre «X copia» (recortado); si está lleno, devuelve la misma lista y `lleno: true`. */
export function duplicarLook(lista, id, ahora = Date.now(), nuevo = nuevoId(Math.random, ahora)) {
  const i = lista.findIndex(l => l.id === id);
  if (i < 0) return { lista, lleno: false, look: null };
  if (lista.length >= MAX_LOOKS) return { lista, lleno: true, look: null };
  const orig = lista[i], base = Array.from(orig.nombre).slice(0, MAX_NOMBRE - 6).join('').trim();
  const look = { ...orig, look: { ...orig.look }, id: nuevo, fecha: ahora, nombre: recortarNombre(base + ' copia') };
  const copia = lista.slice(); copia.splice(i + 1, 0, look);
  return { lista: copia, lleno: false, look };
}

export function borrarLook(lista, id) { return lista.filter(l => l.id !== id); }

/** Fecha corta para personas: «hoy», «ayer», «hace 3 días», o día y mes. */
export function fechaCorta(fecha, ahora = Date.now()) {
  if (!fecha) return '';
  const dias = Math.floor((ahora - fecha) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  try { return new Date(fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' }); } catch { return ''; }
}
