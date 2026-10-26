// Reacciones por pieza del diseñador (PR-D4, producto/taps/disenador-v2-plan.md §4) y la cámara por pestaña.
//
// Siete reacciones que van más allá de `talk`: cada una es una función pura (t en segundos, T reloj del idle) que devuelve una
// pose completa componiendo la pose base del rig (`POSES.idle(0, T)` = base(T)), igual que hacen las animaciones de rig.js.
// NO toca rig.js: el feed sigue con sus poses; estas solo las usa el creador. Duran 0,6-0,9 s, son interrumpibles (el bucle
// mezcla con `blendPose` como siempre) y, con movimiento reducido, el diseñador las sustituye por la pose quieta `QUIETA`.
//
// Un campo extra en la pose, `parpadeo` (true/false), le pide al dibujo que cierre los ojos ese instante: blendPose lo ignora
// (no está en sus listas) y drawHost lo recibe por `o.blink`, así que no hace falta cambiar el rig.
import { POSES, armPoints } from './rig.js';

/** Suavizados (u en 0..1). */
const clamp01 = u => (!(u > 0) ? 0 : u > 1 ? 1 : u);                       // NaN y negativos → 0
const fuera = u => 1 - (1 - u) * (1 - u);                                   // ease-out cuadrático
const dentroFuera = u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
/** Campana 0→1→0 entre `a` y `b` (sube y baja con media onda de seno). */
const campana = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));
/** Rampa 0→1 entre `a` y `b`, luego 1→0 entre `c` y `d` (subir, sostener, volver). */
const meseta = (u, a, b, c, d) => (u < a ? 0 : u < b ? fuera((u - a) / (b - a)) : u < c ? 1 : u < d ? 1 - dentroFuera((u - c) / (d - c)) : 0);
const mezcla = (a, b, k) => a + (b - a) * k;
const mezclaBrazo = (a, b, k) => [mezcla(a[0], b[0], k), mezcla(a[1], b[1], k)];

// Geometría del brazo tomada del rig en tiempo de ejecución (armPoints con ángulos 0 da hombro, codo y mano en vertical).
const G = (() => { const p = armPoints(1, [0, 0]); return { sx: p.sx, sy: p.sy, l1: p.ey - p.sy, l2: p.hy - p.ey }; })();
/**
 * Ángulos [hombro, codo] del brazo derecho para que la mano llegue a (x, y) en unidades del rig (origen: centro del cuerpo;
 * la cabeza está en y ≈ -150, la barbilla en -112, el ala de un sombrero en -180). Si el punto no se alcanza, estira el brazo
 * hacia él. `codo`: 'fuera' (por defecto) lo levanta hacia el lado, como al tocarse el sombrero o sostener algo en alto;
 * 'dentro' lo deja caído delante del pecho, como al acariciarse la barba.
 */
export function brazoHacia(x, y, codo = 'fuera') {
  const dx = x - G.sx, dy = y - G.sy, d = Math.min(Math.hypot(dx, dy) || 1e-6, G.l1 + G.l2 - 1e-3);
  const objetivo = Math.atan2(dx, dy);                                        // ángulo desde «abajo» hacia +x, como en armPoints
  const cosCodo = (G.l1 ** 2 + G.l2 ** 2 - d * d) / (2 * G.l1 * G.l2);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosCodo)));
  const cosHombro = (G.l1 ** 2 + d * d - G.l2 ** 2) / (2 * G.l1 * d);
  const alfa = Math.acos(Math.max(-1, Math.min(1, cosHombro)));
  const lado = codo === 'dentro' ? 1 : -1;
  return [objetivo + lado * alfa, -lado * (Math.PI - interior)];
}
/** Punto de la mano derecha (unidades del rig, sin pose global) para una pose: ancla de la cámara «objeto». */
export function manoDerecha(P) { const m = armPoints(1, P.armR); return [m.hx, m.hy]; }

const base = T => POSES.idle(0, T);
/** Qué mira el personaje al cambiar un color, según la pieza (lookX/lookY del rig: positivo = derecha/abajo). */
export const MIRADA_COLOR = Object.freeze({
  skin: [6, 2], hair: [0, -7], coat: [0, 8], shirt: [0, 7], vest: [0, 8], trousers: [0, 10], shoes: [0, 10], accent: [0, 8], hatColor: [0, -8],
});

/**
 * Reacciones: `{ dur, pose(t, T, o) }`. `t` en segundos (0..dur), `T` reloj del idle, `o` detalle opcional del cambio.
 * Todas devuelven una pose válida para blendPose/drawHost en cualquier t (también fuera de 0..dur: se recorta).
 */
export const REACCIONES = Object.freeze({
  /** Sombrero: se lo acomoda con la mano derecha en el ala y asoma los ojos por debajo. */
  sombrero: { dur: 0.9, pose(t, T) {
    const u = clamp01(t / 0.9), k = meseta(u, 0, 0.3, 0.6, 1), b = base(T);
    const ala = brazoHacia(30, -182 + Math.sin(u * Math.PI * 4) * 3 * k);
    return { ...b, armR: mezclaBrazo(b.armR, ala, k), headTilt: b.headTilt - 0.09 * k, headY: b.headY + 4 * campana(u, 0.25, 0.65),
      lookX: 0, lookY: -6 * k, eyes: u > 0.55 && u < 0.95 ? 'happy' : 'open', mouth: u > 0.55 ? 'grin' : 'smile', blush: 0.3 * k };
  } },
  /** Peinado: sacude la cabeza y el pelo rebota (headTilt amortiguado), termina contento. */
  peinado: { dur: 0.8, pose(t, T) {
    const u = clamp01(t / 0.8), b = base(T), s = Math.sin(u * Math.PI * 5) * (1 - u) * (1 - u);
    return { ...b, headTilt: b.headTilt + 0.16 * s, headY: b.headY - 5 * Math.abs(s), tilt: b.tilt + 0.02 * s, lookX: 8 * s, lookY: -2,
      eyes: u > 0.6 ? 'happy' : 'open', mouth: u > 0.6 ? 'grin' : 'smile', blush: 0.4 * fuera(u) };
  } },
  /** Prenda: giro de medio cuerpo (tilt 0,25 → 0) con rebote de squash 0,94 → 1,04 → 1 y los brazos un poco abiertos. */
  prenda: { dur: 0.8, pose(t, T) {
    const u = clamp01(t / 0.8), b = base(T), giro = 0.25 * (1 - fuera(u)) * Math.cos(u * Math.PI * 1.5);
    const squash = u < 0.3 ? mezcla(0.94, 1.04, fuera(u / 0.3)) : u < 0.7 ? mezcla(1.04, 1, dentroFuera((u - 0.3) / 0.4)) : 1;
    const abre = campana(u, 0.1, 0.9);
    return { ...b, tilt: b.tilt + giro, squash: b.squash * squash, armL: mezclaBrazo(b.armL, [0.75, 0.25], abre), armR: mezclaBrazo(b.armR, [0.75, 0.25], abre),
      headTilt: b.headTilt - giro * 0.4, lookX: 0, lookY: 6 * abre, eyes: 'open', mouth: u > 0.5 ? 'grin' : 'smile', blush: 0.3 * abre };
  } },
  /** Color: parpadeo doble y mira la pieza que cambió (`o.mirada` = [lookX, lookY], por defecto hacia la ropa). */
  color: { dur: 0.7, pose(t, T, o = {}) {
    const u = clamp01(t / 0.7), b = base(T), [mx, my] = o.mirada ?? MIRADA_COLOR.coat, k = meseta(u, 0, 0.25, 0.7, 1);
    const parpadeo = (u > 0.05 && u < 0.14) || (u > 0.2 && u < 0.29);
    return { ...b, lookX: mezcla(b.lookX, mx, k), lookY: my * k, headTilt: b.headTilt + 0.05 * k * Math.sign(mx || 1), headY: b.headY + (my > 0 ? 3 : -2) * k,
      eyes: 'open', mouth: u > 0.6 ? 'grin' : 'smile', blush: 0.25 * k, parpadeo };
  } },
  /** Objeto: lo levanta hasta la barbilla y lo mira (mano alta, como «think» pero curioso; el objeto queda a la vista, no tapa la cara). */
  objeto: { dur: 0.9, pose(t, T) {
    const u = clamp01(t / 0.9), b = base(T), k = meseta(u, 0, 0.35, 0.7, 1);
    return { ...b, armR: mezclaBrazo(b.armR, brazoHacia(88, -96), k), headTilt: b.headTilt + 0.1 * k, lookX: 9 * k, lookY: 1 * k,
      eyes: u > 0.3 && u < 0.75 ? 'think' : 'open', mouth: u > 0.75 ? 'grin' : 'smile', think: 0, blush: 0.3 * (u > 0.75 ? 1 : 0) };
  } },
  /** Gafas: se las sube con un dedo en el puente y vuelve a mirar al frente. */
  gafas: { dur: 0.7, pose(t, T) {
    const u = clamp01(t / 0.7), b = base(T), k = meseta(u, 0, 0.3, 0.5, 0.9), empuje = campana(u, 0.3, 0.5);
    return { ...b, armR: mezclaBrazo(b.armR, brazoHacia(10, -150 - 4 * empuje), k), headY: b.headY - 3 * empuje, headTilt: b.headTilt + 0.03 * k,
      lookX: 0, lookY: -4 * k + 2 * empuje, eyes: u > 0.6 ? 'happy' : 'open', mouth: u > 0.6 ? 'grin' : 'flat' };
  } },
  /** Barba: se la acaricia pensativo (la mano va y viene por la barbilla). */
  barba: { dur: 0.9, pose(t, T) {
    const u = clamp01(t / 0.9), b = base(T), k = meseta(u, 0, 0.3, 0.75, 1), caricia = Math.sin(u * Math.PI * 3) * 6 * k;
    return { ...b, armR: mezclaBrazo(b.armR, brazoHacia(8, -108 + caricia, 'dentro'), k), headTilt: b.headTilt + 0.07 * k, lookX: -6 * k, lookY: -5 * k,
      eyes: u < 0.75 ? 'think' : 'happy', mouth: u < 0.75 ? 'flat' : 'grin', think: 0 };
  } },
});
export const NOMBRES_REACCION = Object.freeze(Object.keys(REACCIONES));

/**
 * Qué reacción toca a cada cambio del diseñador: `tipo` es el de `cambiar()` (hat, hair, outfit, color, item, face…) y `detalle`
 * puede traer `campo` (glasses, beard, skin…) para afinar. Devuelve `[nombre, duracion, opciones]` o null si no hay reacción
 * propia (el diseñador usa entonces su tabla de siempre).
 */
export function reaccionDe(tipo, detalle = {}) {
  const campo = detalle.campo;
  if (tipo === 'hat') return ['sombrero', REACCIONES.sombrero.dur, {}];
  if (tipo === 'hair') return campo === 'hair' ? ['color', REACCIONES.color.dur, { mirada: MIRADA_COLOR.hair }] : ['peinado', REACCIONES.peinado.dur, {}];
  if (tipo === 'outfit') return ['prenda', REACCIONES.prenda.dur, {}];
  if (tipo === 'item') return ['objeto', REACCIONES.objeto.dur, {}];
  if (tipo === 'face' && campo === 'glasses') return ['gafas', REACCIONES.gafas.dur, {}];
  if (tipo === 'face' && campo === 'beard') return ['barba', REACCIONES.barba.dur, {}];
  if (tipo === 'color' || (tipo === 'face' && campo === 'skin')) return ['color', REACCIONES.color.dur, { mirada: MIRADA_COLOR[campo] ?? MIRADA_COLOR.coat }];
  return null;
}
/** Pose quieta equivalente para movimiento reducido. */
export const QUIETA_REACCION = Object.freeze({ sombrero: 'happy', peinado: 'happy', prenda: 'still', color: 'still', objeto: 'think', gafas: 'still', barba: 'think' });

// ───────────────────────── cámara por pestaña (§4) ─────────────────────────
/** Encuadres: zoom y punto del rig que va al centro de la vista (null = plano general, el encuadre de siempre). */
export const ENCUADRES = Object.freeze({
  general: { zoom: 1, ancla: null },
  cara: { zoom: 1.9, ancla: 'head' }, pelo: { zoom: 1.9, ancla: 'head' },
  ropa: { zoom: 1.25, ancla: 'chest' },
  // El plan decía ×1,6; en una vista de 380 px eso deja fuera la cabeza y el objeto cuando el personaje lo levanta: ×1,45.
  objeto: { zoom: 1.45, ancla: 'handR' },
});
/** Duración de la transición de cámara (ms); con movimiento reducido se corta directo. */
export const CAMARA_MS = 350;
/** Encuadre según pantalla (0-3) y pestaña del paso 1. */
export function encuadreDe(pantalla, pestana) { return pantalla === 1 ? (ENCUADRES[pestana] ?? ENCUADRES.general) : ENCUADRES.general; }
/**
 * Punto de foco (en unidades del rig, relativo al centro del cuerpo con pose quieta) para un ancla. El objeto se dibuja hacia
 * arriba desde la mano y la reacción «objeto» lo levanta hasta la barbilla, por eso el foco de `handR` sube 50 unidades: la mano
 * en reposo, el objeto levantado y la cara caben en el encuadre.
 */
export function focoDe(ancla, P) {
  if (ancla === 'head') return [0, -150 + (P?.headY ?? 0)];
  if (ancla === 'chest') return [0, -30];
  if (ancla === 'handR') { const [hx, hy] = manoDerecha(P); return [hx, hy - 50]; }
  return [0, 0];
}
/** Interpola dos cámaras `{ zoom, fx, fy }` con ease-out (u en 0..1). */
export function mezclarCamara(a, b, u) { const k = fuera(clamp01(u)); return { zoom: mezcla(a.zoom, b.zoom, k), fx: mezcla(a.fx, b.fx, k), fy: mezcla(a.fy, b.fy, k) }; }

/** Comprobación de pose (para pruebas y para no pintar NaN): números finitos, brazos [a, b] y ojos/boca conocidos. */
const NUMERICOS = ['x', 'y', 'tilt', 'squash', 'headTilt', 'headY', 'mouthOpen', 'blush', 'glow', 'tint', 'think', 'lookX', 'lookY'];
const OJOS = new Set(['open', 'happy', 'think', 'wince', 'sad']), BOCAS = new Set(['smile', 'open', 'grin', 'flat', 'wave', 'frown']);
export function erroresDePose(P) {
  const e = [];
  if (!P || typeof P !== 'object') return ['no es una pose'];
  for (const k of NUMERICOS) if (!Number.isFinite(P[k])) e.push(k + ' no es un número finito');
  for (const k of ['armL', 'armR']) if (!Array.isArray(P[k]) || P[k].length !== 2 || !P[k].every(Number.isFinite)) e.push(k + ' debe ser [hombro, codo]');
  if (!OJOS.has(P.eyes)) e.push('eyes «' + P.eyes + '» no existe'); if (!BOCAS.has(P.mouth)) e.push('mouth «' + P.mouth + '» no existe');
  if (Number.isFinite(P.squash) && (P.squash < 0.7 || P.squash > 1.3)) e.push('squash fuera de 0,7-1,3');
  if (P.parpadeo !== undefined && typeof P.parpadeo !== 'boolean') e.push('parpadeo debe ser true o false');
  return e;
}
