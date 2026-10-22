// Tema «época» · rig 2D de un presentador adulto (lo comparten renderer2d.js y light.js).
//
// Mismo concepto que el rig del tema «estudio»: un personaje de recortes dibujado SOLO con trazos de Canvas 2D (sin imágenes,
// sin librerías, sin WebGL), con huesos simples (cuerpo, cabeza, dos brazos de dos segmentos) y una cara expresiva. Cada
// animación es una función pura del tiempo que devuelve una pose; el renderizador mezcla hacia la nueva y la dibuja.
// Un personaje nuevo es solo DATOS (`look` en theme.json: piel, pelo, ropa, sombrero, barba...), y cada pieza nueva (un
// sombrero, un peinado, una prenda) es una función corta de este archivo. Es la base del diseñador de personajes 2D.
//
// Unidades: el personaje mide ~350 unidades de alto con escala 1 (lienzo de 540 de ancho). Origen = centro del cuerpo;
// los pies quedan en y = +112.

const TAU = Math.PI * 2;

/** Valores por defecto del `look` (un personaje de theme.json solo escribe lo que cambia). */
const DEFAULT_LOOK = {
  skin: '#c99a76', skinShade: '#b4825f', lips: '#a0624c', blush: '#e08a78',
  hair: '#3a2a20', hairStyle: 'corto',                      // corto | recogido | ondas | calvo
  beard: 'none', brow: '#2b2019',                           // none | patillas | barba
  outfit: 'levita',                                         // levita (época) | safari (explorador)
  coat: '#1d1d27', coatShade: '#14141c', shirt: '#e8e1cf', vest: null, cravat: '#e8e1cf', trousers: '#2a2a33', shoes: '#15151a', belt: '#5a4128',
  hat: 'none', hatColor: '#15151a', hatBand: '#8c6a3a',    // none | copa | safari
  glow: '#ffd48a',
};
/** Colores y piezas de un personaje del tema (`characters[id].look`) con valores por defecto. */
export const lookOf = character => ({ ...DEFAULT_LOOK, ...(character?.look || {}) });

// ───────────────────────── poses ─────────────────────────
// Campos numéricos (se mezclan suave) y discretos (cambian al instante).
const NUM = ['x', 'y', 'tilt', 'squash', 'headTilt', 'headY', 'mouthOpen', 'blush', 'glow', 'tint', 'think', 'lookX', 'lookY'];
const ARMS = ['armL', 'armR'];
const base = (T) => ({
  x: 0, y: -4 + Math.sin(T * 1.6) * 2.2, tilt: Math.sin(T * 0.8) * 0.008, squash: 1 + Math.sin(T * 1.6 + 1) * 0.008,
  headTilt: Math.sin(T * 0.7) * 0.025, headY: Math.sin(T * 1.6 + 0.6) * 1.2, armL: [0.14 + Math.sin(T * 1.6) * 0.02, 0.1], armR: [0.14 + Math.sin(T * 1.6 + .6) * 0.02, 0.1],
  eyes: 'open', mouth: 'smile', mouthOpen: 0, blush: 0, glow: 0.7, tint: 0, think: 0, lookX: Math.sin(T * 0.6) * 3, lookY: 0,
});

/** Todas las animaciones que entiende el tema (los mismos nombres que «estudio», para que los Taps sean intercambiables). */
export const POSES = {
  idle: (t, T) => base(T),
  talk: (t, T) => ({ ...base(T), mouth: 'open', mouthOpen: Math.abs(Math.sin(t * 11)) * (0.45 + 0.55 * Math.abs(Math.sin(t * 2.7))),
    armR: [0.62 + Math.sin(t * 3.4) * 0.2, 0.9], headTilt: Math.sin(t * 2.2) * 0.05, headY: -Math.abs(Math.sin(t * 5.5)) * 2.2 }),
  think: (t, T) => ({ ...base(T), armR: [0.5, -2.4], armL: [0.2, 0.1], headTilt: 0.1, lookX: 7, lookY: -6, eyes: 'think', mouth: 'flat', think: 1 }),
  celebrate: (t, T) => {
    const p = (t * 2.2) % 1, jump = Math.sin(p * Math.PI);
    return { ...base(T), y: -4 - jump * 52, squash: 1 + 0.06 * jump - (p > 0.92 || p < 0.06 ? 0.06 : 0), tilt: Math.sin(t * 4.4) * 0.05,
      armL: [2.5 + Math.sin(t * 14) * 0.16, 0.3], armR: [2.5 + Math.sin(t * 14 + 1.4) * 0.16, 0.3], eyes: 'happy', mouth: 'grin', blush: 0.8, lookX: 0, lookY: 0 };
  },
  hurt: (t, T) => {
    const d = Math.exp(-t * 3.2);
    return { ...base(T), x: -14 * d * Math.cos(t * 9), y: -2 + 6 * d, tilt: -0.14 * d * Math.cos(t * 13), headTilt: 0.1 * d * Math.sin(t * 17),
      armL: [0.9 + Math.sin(t * 22) * 0.25 * d, 0.6], armR: [0.9 + Math.cos(t * 22) * 0.25 * d, 0.6],
      eyes: t < 0.85 ? 'wince' : 'sad', mouth: 'wave', tint: Math.max(0, 1 - t * 2.2), lookX: 0, lookY: 0 };
  },
  dance: (t, T) => ({ ...base(T), x: Math.sin(t * 4.4) * 18, tilt: Math.sin(t * 4.4) * 0.07, y: -4 - Math.abs(Math.sin(t * 8.8)) * 10,
    armL: [1.5 + Math.sin(t * 4.4) * 0.9, 0.4], armR: [1.5 - Math.sin(t * 4.4) * 0.9, 0.4], headTilt: -Math.sin(t * 4.4) * 0.06,
    eyes: 'happy', mouth: 'grin', blush: 0.8, lookX: 0, lookY: 0 }),
  sad: (t, T) => ({ ...base(T), y: 4 + Math.sin(T * 1.2) * 2, headTilt: -0.08, headY: 5, tilt: 0, armL: [0.05, 0.04], armR: [0.05, 0.04],
    eyes: 'sad', mouth: 'frown', lookX: 0, lookY: 5 }),
  // poses QUIETAS para movimiento reducido: feliz o triste sin moverse
  happy: () => ({ ...base(0), y: -10, armL: [2.2, 0.35], armR: [2.2, 0.35], eyes: 'happy', mouth: 'grin', blush: 0.8, lookX: 0 }),
  oops: () => ({ ...base(0), y: 0, armL: [0.8, 0.6], armR: [0.8, 0.6], eyes: 'sad', mouth: 'wave', lookX: 0 }),
  still: () => ({ ...base(0), lookX: 0 }),
};
export const POSE_NAMES = Object.freeze(Object.keys(POSES));
export const poseFor = (anim, t = 0, T = 0) => (POSES[anim] || POSES.idle)(t, T);

/** Mezcla `cur` hacia `target` (a = 0..1). Muta y devuelve `cur`. */
export function blendPose(cur, target, a) {
  if (!cur) return { ...target, armL: [...target.armL], armR: [...target.armR] };
  for (const k of NUM) cur[k] += (target[k] - cur[k]) * a;
  for (const k of ARMS) { cur[k][0] += (target[k][0] - cur[k][0]) * a; cur[k][1] += (target[k][1] - cur[k][1]) * a; }
  cur.eyes = target.eyes; cur.mouth = target.mouth;
  return cur;
}

// ───────────────────────── dibujo ─────────────────────────
function rr(c, x, y, w, h, r) {                                   // rectángulo redondeado (sin depender de ctx.roundRect)
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
/** Mezcla un color #rrggbb hacia negro/blanco (t < 0 oscurece, t > 0 aclara): sombras y luces sin tablas de colores. */
function tone(hex, t) {
  const n = parseInt(hex.slice(1), 16), f = t < 0 ? 0 : 255, k = Math.abs(t);
  const m = v => Math.round(v + (f - v) * k);
  return `rgb(${m(n >> 16 & 255)},${m(n >> 8 & 255)},${m(n & 255)})`;
}

const SX = 50, SY = -88, L1 = 52, L2 = 46;                        // hombro y largo de los dos segmentos del brazo
/** Puntos de un brazo: s = -1 izquierda del espectador, +1 derecha. a = ángulo del hombro desde «abajo» (positivo = hacia afuera), b = codo. */
export function armPoints(s, [a, b]) {
  const ex = SX * s + Math.sin(a) * L1 * s, ey = SY + Math.cos(a) * L1;
  const hx = ex + Math.sin(a + b) * L2 * s, hy = ey + Math.cos(a + b) * L2;
  return { sx: SX * s, sy: SY, ex, ey, hx, hy };
}

function drawArm(c, s, ang, L) {
  const p = armPoints(s, ang), sleeve = L.coat;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = L.coatShade; c.lineWidth = 24; c.beginPath(); c.moveTo(p.sx, p.sy); c.lineTo(p.ex, p.ey); c.lineTo(p.hx, p.hy); c.stroke();
  c.strokeStyle = sleeve; c.lineWidth = 20; c.beginPath(); c.moveTo(p.sx, p.sy); c.lineTo(p.ex, p.ey); c.lineTo(p.hx, p.hy); c.stroke();
  const dx = p.hx - p.ex, dy = p.hy - p.ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (L.outfit === 'levita') {                                    // puño blanco de la camisa
    c.strokeStyle = L.shirt; c.lineWidth = 17; c.beginPath(); c.moveTo(p.hx - ux * 11, p.hy - uy * 11); c.lineTo(p.hx - ux * 6, p.hy - uy * 6); c.stroke();
  }
  c.fillStyle = L.skin; circle(c, p.hx + ux * 5, p.hy + uy * 5, 10); c.fill();
  c.fillStyle = L.skinShade; circle(c, p.hx + ux * 8, p.hy + uy * 8, 5); c.fill();
  return { ...p, hx: p.hx + ux * 5, hy: p.hy + uy * 5 };
}

/** Objetos que el personaje sostiene (`scene.item`). Se dibujan en la mano, con su origen en ella. */
export const ITEMS = {
  pluma(c) {                                                       // pliego de dibujo con pluma
    c.save(); c.rotate(-0.12);
    c.fillStyle = '#e4d9bd'; rr(c, -4, -62, 50, 62, 3); c.fill();
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(4, -22); c.quadraticCurveTo(14, -48, 22, -30); c.quadraticCurveTo(28, -44, 38, -24); c.moveTo(6, -52); c.lineTo(34, -54); c.stroke();
    c.strokeStyle = '#f4efe2'; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, -12); c.lineTo(14, -44); c.stroke();
    c.strokeStyle = '#2a2018'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -12); c.lineTo(-2, -19); c.stroke();
    c.restore();
  },
  cepillo(c) {                                                     // cepillo de arqueólogo
    c.save(); c.rotate(-0.5);
    c.fillStyle = '#7a5530'; rr(c, -4, -40, 8, 40, 4); c.fill();
    c.fillStyle = '#a5a28f'; rr(c, -9, -58, 18, 20, 3); c.fill();
    c.strokeStyle = '#d9d5bd'; c.lineWidth = 2;
    for (let i = -6; i <= 6; i += 3) { c.beginPath(); c.moveTo(i, -58); c.lineTo(i * 1.3, -66); c.stroke(); }
    c.restore();
  },
  pergamino(c) {
    c.save(); c.rotate(-0.25);
    c.fillStyle = '#e6d8b2'; rr(c, -6, -62, 22, 62, 5); c.fill();
    c.fillStyle = '#c9b78a'; ell(c, 5, -62, 11, 4); c.fill(); ell(c, 5, 0, 11, 4); c.fill();
    c.strokeStyle = '#7a5c34'; c.lineWidth = 1.5; for (let y = -50; y < -8; y += 9) { c.beginPath(); c.moveTo(-1, y); c.lineTo(12, y); c.stroke(); }
    c.restore();
  },
  mapa(c) {
    c.save(); c.rotate(-0.2);
    c.fillStyle = '#e4d6a8'; poly(c, [[-14, -52], [12, -58], [38, -52], [38, -6], [12, -12], [-14, -6]]); c.fill();
    c.strokeStyle = '#8c6a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(12, -58); c.lineTo(12, -12); c.stroke();
    c.strokeStyle = '#b5443c'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(-6, -22); c.quadraticCurveTo(10, -44, 30, -26); c.stroke(); c.setLineDash([]);
    c.restore();
  },
};

function drawEye(c, x, y, P, L, blink, side) {
  const e = P.eyes, lx = P.lookX * 0.12, ly = P.lookY * 0.12;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = L.brow; c.fillStyle = L.brow;
  if (e === 'happy') { c.lineWidth = 3.4; c.beginPath(); c.arc(x, y + 3, 8, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); return; }
  if (e === 'wince') { c.lineWidth = 3.4; c.beginPath(); c.moveTo(x - 7, y - 3); c.lineTo(x + 5, y + 1); c.lineTo(x - 7, y + 5); c.stroke(); return; }
  if (blink) { c.lineWidth = 3; c.beginPath(); c.moveTo(x - 7, y + 1); c.quadraticCurveTo(x, y + 4, x + 7, y + 1); c.stroke(); return; }
  c.fillStyle = '#f6f1e6'; ell(c, x, y, 7.4, e === 'think' && side < 0 ? 4.4 : 5.8); c.fill();
  c.fillStyle = tone(L.brow, 0.1); circle(c, x + lx, y + ly, 3.5); c.fill();
  c.fillStyle = '#ffffff'; circle(c, x + lx - 1.3, y + ly - 1.4, 1.3); c.fill();
  c.strokeStyle = L.skinShade; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 8.8, Math.PI * 1.05, Math.PI * 1.95); c.stroke();   // pliegue del párpado
}
function drawBrow(c, x, y, P, L, side) {
  c.strokeStyle = L.brow; c.lineWidth = 4.4; c.lineCap = 'round';
  let lift = 0, tilt = 0;
  if (P.eyes === 'think') { lift = side > 0 ? -5 : 1; tilt = side > 0 ? -0.15 : 0.1; }
  else if (P.eyes === 'sad' || P.eyes === 'wince') { lift = -2; tilt = side > 0 ? -0.3 : 0.3; }
  else if (P.eyes === 'happy') lift = -3;
  c.beginPath(); c.moveTo(x - 9, y + lift + (tilt > 0 ? 2 : 0)); c.quadraticCurveTo(x, y + lift - 3 + tilt * 8, x + 9, y + lift + (tilt < 0 ? 2 : 0)); c.stroke();
}

function drawMouth(c, y, P, L) {
  c.strokeStyle = tone(L.lips, -0.25); c.fillStyle = tone(L.lips, -0.35); c.lineWidth = 2.8; c.lineCap = 'round'; c.lineJoin = 'round';
  switch (P.mouth) {
    case 'open': { const h = 3 + 13 * P.mouthOpen; ell(c, 0, y + h / 2 - 1, 9, h / 2 + 1); c.fill(); c.fillStyle = L.lips; ell(c, 0, y + h - 1, 6, Math.min(3, h / 3)); c.fill(); break; }
    case 'grin': c.beginPath(); c.moveTo(-14, y - 4); c.quadraticCurveTo(0, y + 18, 14, y - 4); c.closePath(); c.fill(); c.fillStyle = '#f6f1e6'; c.beginPath(); c.moveTo(-11, y - 2); c.quadraticCurveTo(0, y + 6, 11, y - 2); c.closePath(); c.fill(); break;
    case 'flat': c.beginPath(); c.moveTo(-8, y + 3); c.lineTo(8, y); c.stroke(); break;
    case 'wave': c.beginPath(); c.moveTo(-12, y + 1); for (let i = 1; i <= 6; i++) c.lineTo(-12 + i * 4, y + (i % 2 ? -3 : 3)); c.stroke(); break;
    case 'frown': c.beginPath(); c.moveTo(-10, y + 6); c.quadraticCurveTo(0, y - 4, 10, y + 6); c.stroke(); break;
    default: c.beginPath(); c.moveTo(-10, y - 1); c.quadraticCurveTo(0, y + 9, 10, y - 1); c.stroke();
  }
}

function drawHair(c, L, layer) {
  c.fillStyle = L.hair;
  if (layer === 'back') {
    if (L.hairStyle === 'ondas') { ell(c, 0, -136, 43, 54); c.fill(); }
    if (L.hairStyle === 'recogido') { circle(c, 0, -198, 15); c.fill(); c.fillStyle = tone(L.hair, 0.12); circle(c, -4, -201, 5); c.fill(); }
    return;
  }
  if (L.hairStyle === 'calvo') { c.fillStyle = tone(L.hair, 0); ell(c, 0, -174, 30, 6); c.fill(); return; }
  c.beginPath(); c.moveTo(-36, -148); c.quadraticCurveTo(-42, -202, 0, -198); c.quadraticCurveTo(42, -202, 36, -148);
  c.quadraticCurveTo(33, -176, 12, -176); c.quadraticCurveTo(-6, -180, -22, -168); c.quadraticCurveTo(-32, -162, -36, -148); c.closePath(); c.fill();
  c.fillStyle = tone(L.hair, 0.14); c.beginPath(); c.moveTo(-12, -192); c.quadraticCurveTo(8, -198, 24, -184); c.quadraticCurveTo(6, -190, -12, -192); c.closePath(); c.fill();
}
function drawBeard(c, L) {
  if (L.beard === 'none') return;
  c.fillStyle = L.hair;
  if (L.beard === 'patillas') { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 34, -166); c.lineTo(s * 28, -166); c.quadraticCurveTo(s * 28, -142, s * 24, -132); c.quadraticCurveTo(s * 31, -136, s * 34, -150); c.closePath(); c.fill(); } return; }
  c.beginPath(); c.moveTo(-34, -142); c.quadraticCurveTo(-34, -100, 0, -96); c.quadraticCurveTo(34, -100, 34, -142);
  c.quadraticCurveTo(26, -122, 0, -124); c.quadraticCurveTo(-26, -122, -34, -142); c.closePath(); c.fill();
}
function drawHat(c, L) {
  if (L.hat === 'copa') {
    c.fillStyle = tone(L.hatColor, 0.04); rr(c, -28, -246, 56, 62, 9); c.fill();
    c.fillStyle = tone(L.hatColor, 0.2); rr(c, -22, -240, 11, 50, 5); c.fill();
    c.fillStyle = L.hatBand; rect(c, -28, -197, 56, 10);
    c.fillStyle = tone(L.hatColor, -0.1); ell(c, 0, -183, 46, 9); c.fill();
  } else if (L.hat === 'safari') {
    c.fillStyle = tone(L.hatColor, -0.12); ell(c, 0, -182, 62, 15); c.fill();
    c.fillStyle = L.hatColor; c.beginPath(); c.moveTo(-34, -182); c.quadraticCurveTo(-36, -232, 0, -234); c.quadraticCurveTo(36, -232, 34, -182); c.quadraticCurveTo(0, -172, -34, -182); c.closePath(); c.fill();
    c.fillStyle = tone(L.hatColor, 0.16); c.beginPath(); c.moveTo(-24, -208); c.quadraticCurveTo(-8, -228, 14, -222); c.quadraticCurveTo(-6, -220, -24, -208); c.closePath(); c.fill();
    c.fillStyle = L.hatBand; c.beginPath(); c.moveTo(-34, -190); c.quadraticCurveTo(0, -180, 34, -190); c.lineTo(34, -181); c.quadraticCurveTo(0, -171, -34, -181); c.closePath(); c.fill();
  }
}
const rect = (c, x, y, w, h) => { c.fillRect(x, y, w, h); };

function drawHead(c, L, P, o) {
  drawHair(c, L, 'back');
  c.fillStyle = L.skinShade; rr(c, -11, -128, 22, 28, 6); c.fill();                          // cuello
  c.fillStyle = L.skin; ell(c, -34, -148, 6, 9); c.fill(); ell(c, 34, -148, 6, 9); c.fill();   // orejas
  c.beginPath(); c.moveTo(-33, -158); c.quadraticCurveTo(-34, -112, 0, -108); c.quadraticCurveTo(34, -112, 33, -158); c.quadraticCurveTo(30, -192, 0, -192); c.quadraticCurveTo(-30, -192, -33, -158); c.closePath(); c.fill();
  c.fillStyle = L.skinShade; c.globalAlpha = 0.35; c.beginPath(); c.moveTo(14, -190); c.quadraticCurveTo(33, -186, 33, -158); c.quadraticCurveTo(34, -112, 0, -108); c.quadraticCurveTo(22, -118, 24, -150); c.quadraticCurveTo(24, -176, 14, -190); c.closePath(); c.fill(); c.globalAlpha = 1;
  if (P.tint > 0.01) { c.fillStyle = '#d65a4a'; c.globalAlpha = 0.28 * P.tint; ell(c, 0, -150, 33, 40); c.fill(); c.globalAlpha = 1; }
  const blink = !!o.blink && (P.eyes === 'open' || P.eyes === 'think');
  drawEye(c, -14, -152, P, L, blink, -1); drawEye(c, 14, -152, P, L, blink, 1);
  drawBrow(c, -14, -166, P, L, -1); drawBrow(c, 14, -166, P, L, 1);
  c.strokeStyle = L.skinShade; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(1, -152); c.quadraticCurveTo(7, -139, 1, -136); c.stroke();     // nariz
  if (P.blush > 0.02) { c.fillStyle = L.blush; c.globalAlpha = 0.4 * P.blush; ell(c, -22, -132, 8, 5); c.fill(); ell(c, 22, -132, 8, 5); c.fill(); c.globalAlpha = 1; }
  drawBeard(c, L);
  drawMouth(c, -121, P, L);
  drawHair(c, L, 'front');
  drawHat(c, L);
}

function drawLegs(c, L) {
  c.fillStyle = L.trousers;
  rr(c, -31, 22, 27, 90, 10); c.fill(); rr(c, 4, 22, 27, 90, 10); c.fill();
  c.fillStyle = tone(L.trousers, -0.25); rect(c, -4, 30, 8, 70);
  c.fillStyle = L.shoes; ell(c, -20, 111, 22, 8); c.fill(); ell(c, 20, 111, 22, 8); c.fill();
}

function drawTorso(c, L, T) {
  if (L.outfit === 'safari') {
    c.fillStyle = L.coat; c.beginPath(); c.moveTo(-34, -106); c.quadraticCurveTo(-58, -102, -57, -80); c.lineTo(-48, 44); c.quadraticCurveTo(0, 52, 48, 44); c.lineTo(57, -80); c.quadraticCurveTo(58, -102, 34, -106); c.closePath(); c.fill();
    c.fillStyle = L.coatShade; c.globalAlpha = 0.25; rect(c, 20, -100, 30, 140); c.globalAlpha = 1;
    if (L.vest) {
      c.fillStyle = L.vest; c.beginPath(); c.moveTo(-30, -104); c.lineTo(-8, -104); c.lineTo(-10, 44); c.quadraticCurveTo(-30, 46, -47, 42); c.lineTo(-52, -78); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(30, -104); c.lineTo(8, -104); c.lineTo(10, 44); c.quadraticCurveTo(30, 46, 47, 42); c.lineTo(52, -78); c.closePath(); c.fill();
      c.fillStyle = tone(L.vest, -0.2); rr(c, -42, -52, 22, 20, 3); c.fill(); rr(c, 20, -52, 22, 20, 3); c.fill();
    }
    c.fillStyle = L.belt; rect(c, -48, 28, 96, 11); c.fillStyle = '#c8a24a'; rr(c, -7, 28, 14, 11, 2); c.fill();
    c.fillStyle = tone(L.coat, 0.12); poly(c, [[-12, -108], [0, -86], [-2, -104]]); c.fill(); poly(c, [[12, -108], [0, -86], [2, -104]]); c.fill();   // cuello abierto
    c.fillStyle = L.skinShade; poly(c, [[-12, -108], [12, -108], [0, -84]]); c.fill();
    return;
  }
  // levita: casaca oscura con faldones, chaleco y camisa
  c.fillStyle = L.coat;
  c.beginPath(); c.moveTo(-34, -106); c.quadraticCurveTo(-58, -102, -57, -80); c.lineTo(-48, 34); c.lineTo(-56, 84); c.quadraticCurveTo(-26, 92, -6, 80); c.lineTo(0, 52); c.lineTo(6, 80); c.quadraticCurveTo(26, 92, 56, 84); c.lineTo(48, 34); c.lineTo(57, -80); c.quadraticCurveTo(58, -102, 34, -106); c.closePath(); c.fill();
  c.fillStyle = L.vest || '#7a5c3a'; c.beginPath(); c.moveTo(-18, -104); c.lineTo(18, -104); c.lineTo(22, 36); c.lineTo(0, 46); c.lineTo(-22, 36); c.closePath(); c.fill();
  c.fillStyle = L.shirt; poly(c, [[-14, -106], [14, -106], [0, -48]]); c.fill();
  c.fillStyle = L.coatShade; poly(c, [[-34, -106], [-12, -102], [-4, -56], [-24, -40], [-48, -66]]); c.fill(); poly(c, [[34, -106], [12, -102], [4, -56], [24, -40], [48, -66]]); c.fill();
  c.fillStyle = '#c8a24a'; for (let i = 0; i < 3; i++) { circle(c, 0, -30 + i * 22, 2.6); c.fill(); }
  c.fillStyle = L.cravat; c.beginPath(); c.moveTo(-12, -112); c.lineTo(12, -112); c.lineTo(8, -88); c.quadraticCurveTo(0, -76, -8, -88); c.closePath(); c.fill();
  c.fillStyle = tone(L.cravat, -0.12); c.beginPath(); c.moveTo(-3, -92); c.quadraticCurveTo(0, -76, 3, -92); c.closePath(); c.fill();
}

/**
 * Dibuja el personaje con su centro del cuerpo en (x, y) y escala `s`.
 * @param P pose (de poseFor/blendPose)  @param L look (lookOf)  @param o { item, blink, T }
 */
export function drawHost(c, x, y, s, P, L, o = {}) {
  const T = o.T || 0;
  c.save(); c.translate(x + P.x * s, y + P.y * s); c.scale(s, s);
  c.translate(0, 112); c.rotate(P.tilt); c.scale(1 / Math.sqrt(P.squash), P.squash); c.translate(0, -112);

  drawArm(c, -1, P.armL, L);
  drawLegs(c, L);
  drawTorso(c, L, T);
  c.save(); c.translate(0, -108 + P.headY); c.rotate(P.headTilt); c.translate(0, 108); drawHead(c, L, P, o); c.restore();

  const hand = drawArm(c, 1, P.armR, L);
  if (o.item && ITEMS[o.item]) { c.save(); c.translate(hand.hx, hand.hy + 4); ITEMS[o.item](c, L); c.restore(); }
  c.restore();
}

/** Puntos de anclaje (para el globo y las partículas), en coordenadas del lienzo. */
export function anchorOf(name, x, y, s, P) {
  const cx = x + P.x * s, cy = y + P.y * s;
  switch (name) {
    case 'head': return [cx, cy + (-150 + P.headY) * s];
    case 'chest': return [cx, cy + -40 * s];
    case 'feet': return [cx, cy + 112 * s];
    default: return [cx, cy + (-248 + P.headY) * s];       // 'top': encima del sombrero
  }
}
