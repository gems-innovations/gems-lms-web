// Medición del diseñador «época» (PR-5 del plan): nombres de eventos, agregación, cola y reglas de «no contar».
// Módulo puro: no toca window, ni la red, ni localStorage por su cuenta. La página decide el canal (GoatCounter,
// el mismo contador de visitas de la web, con la misma taxonomía `taps/<area>/<accion>[/<detalle>]` de
// analytics-taxonomy.ts) y le pasa un `storage` y la `search` para respetar `?interno=1` / `skipgc`.
// Nunca viaja el look ni nada personal: solo nombres cerrados de esta lista.

export const PREFIJO = 'taps/disenador/';
/** Eventos que esperan canal (count.js aún no cargó): más de esto y se descartan los más viejos. */
export const MAX_COLA = 200;
/** Misma clave que respeta count.js de GoatCounter (`#toggle-goatcounter`) y AnalyticsService: con 't' no se cuenta nada. */
export const CLAVE_INTERNO = 'skipgc';
/** `cambio/<pestaña>` se agrega: como mucho uno por pestaña cada minuto. */
export const VENTANA_CAMBIO_MS = 60_000;
export const PESTANAS = Object.freeze(['cara', 'pelo', 'ropa', 'objeto']);
/** Nombre del paso para `abandono/<paso>`: índice = pantalla del diseñador (0 partida, 1 ajustar, 2 escenario, 3 listo). */
export const PASOS = Object.freeze(['partida', 'personaje', 'escenario', 'listo']);
/** Tope de segundos en `abandono`: más de una hora es una pestaña olvidada, no una sesión. */
export const MAX_SEGUNDOS = 3600;

const PESTANA = '(cara|pelo|ropa|objeto)';
const PATRONES = [
  /^abrir\/(enlace|continuar|directo)$/,
  /^preset\/[a-z0-9-]{1,40}$/,
  new RegExp(`^cambio/${PESTANA}$`),
  new RegExp(`^sorprendeme/(${PESTANA.slice(1, -1)}|todo|escenario)$`),
  /^deshacer$/,
  /^paso\/(escenario|listo)$/,
  /^probar$/,
  /^listo$/,
  /^compartir\/(enlace|json)$/,
  /^gusto\/(si|meh)$/,
  /^abandono\/(partida|personaje|escenario|listo)\/(0|[1-9]\d{0,2}0)$/,     // segundos ya redondeados a 10
  /^fps-bajo$/,
  /^error\/(carga|look-invalido)$/,
];

/** Quita el prefijo si viene puesto; devuelve el nombre corto (`preset/grabador`) o null si no es de la lista. */
export function nombreValido(nombre) {
  if (typeof nombre !== 'string') return null;
  const corto = nombre.startsWith(PREFIJO) ? nombre.slice(PREFIJO.length) : nombre;
  return PATRONES.some(re => re.test(corto)) ? corto : null;
}

/** Segundos redondeados a 10 (0, 10, 20…), con tope; cualquier cosa rara → 0. */
export function redondear10(segundos) {
  const s = Number(segundos);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return Math.min(MAX_SEGUNDOS, Math.round(s / 10) * 10);
}

/** `abandono/<paso>/<segundos>` para una pantalla (0-3) y los milisegundos desde que se abrió. */
export function nombreAbandono(pantalla, ms) {
  const paso = PASOS[pantalla] ?? PASOS[0];
  return `abandono/${paso}/${redondear10(ms / 1000)}`;
}

/** `?interno=1|si|true` marca el navegador del equipo; `?interno=0|no|false` lo desmarca; sin el parámetro no cambia nada. */
export function banderaInterna(search) {
  let valor = null;
  try { valor = new URLSearchParams(search || '').get('interno'); } catch { return null; }
  if (valor === '1' || valor === 'si' || valor === 'true') return true;
  if (valor === '0' || valor === 'no' || valor === 'false') return false;
  return null;
}

/**
 * Aplica la bandera al almacén (si viene) y dice si este navegador es interno. Todo con try/catch: si el almacén
 * falla, con `?interno=1` en la URL sigue siendo interno en esta visita.
 */
export function esInterno(search, storage) {
  const bandera = banderaInterna(search);
  try {
    if (bandera === true) storage?.setItem(CLAVE_INTERNO, 't');
    else if (bandera === false) storage?.removeItem(CLAVE_INTERNO);
  } catch { /* sin almacenamiento: la bandera vale solo para esta visita */ }
  if (bandera !== null) return bandera;
  try { return storage?.getItem(CLAVE_INTERNO) === 't'; } catch { return false; }
}

/** Tráfico que no es de personas: rastreadores, previsualizadores y navegadores automatizados (Playwright, prerender). */
export function esAutomatico(userAgent, webdriver = false) {
  if (webdriver) return true;
  if (!userAgent) return false;
  return /bot[\/;.)]|\bbot\b|crawl|spider|slurp|preview|headless|facebookexternalhit|facebot|whatsapp|telegram|lighthouse|pingdom/i.test(userAgent);
}

/**
 * Medidor de la sesión. `evento(nombre)` valida, agrega `cambio/*`, y encola; `vaciar()` devuelve lo pendiente para
 * enviarlo (la página lo hace cuando el contador está listo). `registro` conserva lo aceptado (tope MAX_COLA) para
 * depurar y para las pruebas. `activo: false` (navegador interno) ignora todo: ni registro ni cola.
 */
export function crearMedidor({ ahora = Date.now, activo = true } = {}) {
  const cola = [], registro = [], ultimoCambio = new Map(), unicos = new Set();
  const UNA_VEZ = new Set(['probar', 'listo', 'fps-bajo']);
  function evento(nombre) {
    if (!activo) return false;
    const n = nombreValido(nombre);
    if (!n) return false;
    const t = ahora();
    if (n.startsWith('cambio/')) {
      const antes = ultimoCambio.get(n);
      if (antes !== undefined && t - antes < VENTANA_CAMBIO_MS) return false;
      ultimoCambio.set(n, t);
    }
    if (UNA_VEZ.has(n)) { if (unicos.has(n)) return false; unicos.add(n); }
    cola.push(n); if (cola.length > MAX_COLA) cola.splice(0, cola.length - MAX_COLA);
    registro.push(n); if (registro.length > MAX_COLA) registro.splice(0, registro.length - MAX_COLA);
    return true;
  }
  function vaciar() { return cola.splice(0, cola.length); }
  return { evento, vaciar, cola, registro, get activo() { return activo; } };
}

/** Lo que recibe `goatcounter.count` por cada evento: path completo, título igual y `event: true` (misma forma que AnalyticsService). */
export function paraGoatCounter(nombreCorto) {
  const path = PREFIJO + nombreCorto;
  return { path, title: path, event: true };
}
