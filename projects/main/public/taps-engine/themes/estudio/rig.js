// Tema «estudio» · rig 2D del personaje (lo comparten renderer2d.js y light.js).
//
// El personaje es un robot flotante de cabeza-pantalla dibujado SOLO con trazos de Canvas 2D: sin imágenes, sin
// librerías y sin WebGL. Un «rig» simple de huesos (cuerpo, cabeza, dos brazos de dos segmentos, antena con muelle)
// más una cara en la pantalla (ojos, boca, rubor). Cada animación es una función pura del tiempo que devuelve una
// pose; el renderizador mezcla la pose actual hacia la nueva y la dibuja. Así cada personaje nuevo es solo datos
// (colores y accesorios en theme.json) y cada animación nueva es una función de unas líneas.
//
// Unidades: el personaje mide ~350 unidades de alto con escala 1 (lienzo de 540 de ancho). Origen = centro del cuerpo.

const TAU = Math.PI * 2;
const DEFAULT_LOOK = {
  body: '#7B6FF0', bodyDark: '#5B4EC1', belly: '#9B8FF8', shell: '#F1EEFF', shellShade: '#D6D0FF',
  screen: '#1E1B4B', glow: '#4DE1FF', antenna: '#C471ED', blush: '#FF8AD0', antennaStyle: 'ball',
};
/** Colores y accesorios de un personaje del tema (`characters[id].look`) con valores por defecto. */
export const lookOf = character => ({ ...DEFAULT_LOOK, ...(character?.look || {}) });

// ───────────────────────── poses ─────────────────────────
// Campos numéricos (se mezclan suave) y discretos (cambian al instante).
const NUM = ['x', 'y', 'tilt', 'squash', 'headTilt', 'headY', 'mouthOpen', 'blush', 'glow', 'tint', 'think', 'lookX', 'lookY'];
const ARMS = ['armL', 'armR'];
const base = (T) => ({
  x: 0, y: -10 + Math.sin(T * 2.1) * 6, tilt: Math.sin(T * 1.05) * 0.02, squash: 1 + Math.sin(T * 2.1 + 1) * 0.015,
  headTilt: Math.sin(T * 0.9) * 0.03, headY: 0, armL: [0.28 + Math.sin(T * 2.1) * 0.05, 0.25], armR: [0.28 + Math.sin(T * 2.1 + .6) * 0.05, 0.25],
  eyes: 'open', mouth: 'smile', mouthOpen: 0, blush: 0, glow: 0.7, tint: 0, think: 0, lookX: Math.sin(T * 0.7) * 4, lookY: 0,
});

/** Todas las animaciones que entiende el tema. `t` = segundos desde que empezó, `T` = reloj global (respirar, flotar). */
export const POSES = {
  idle: (t, T) => base(T),
  talk: (t, T) => ({ ...base(T), mouth: 'open', mouthOpen: Math.abs(Math.sin(t * 13)) * (0.45 + 0.55 * Math.abs(Math.sin(t * 3.1))),
    armR: [0.75 + Math.sin(t * 4) * 0.25, 0.95], headTilt: Math.sin(t * 2.4) * 0.06, headY: -Math.abs(Math.sin(t * 6.5)) * 3, glow: 0.85 }),
  think: (t, T) => ({ ...base(T), armR: [0.55, -2.55], armL: [0.3, 0.2], headTilt: 0.13, lookX: 9, lookY: -9, eyes: 'think', mouth: 'flat', think: 1 }),
  celebrate: (t, T) => {
    const p = (t * 2.2) % 1, jump = Math.sin(p * Math.PI);
    return { ...base(T), y: -10 - jump * 74, squash: 1 + 0.09 * jump - (p > 0.92 || p < 0.06 ? 0.08 : 0), tilt: Math.sin(t * 4.4) * 0.08,
      armL: [2.55 + Math.sin(t * 16) * 0.2, 0.35], armR: [2.55 + Math.sin(t * 16 + 1.4) * 0.2, 0.35], eyes: 'happy', mouth: 'grin', blush: 1, glow: 1, lookX: 0, lookY: 0 };
  },
  hurt: (t, T) => {
    const d = Math.exp(-t * 3.2);
    return { ...base(T), x: -22 * d * Math.cos(t * 9), y: -2 + 10 * d, tilt: -0.3 * d * Math.cos(t * 13), headTilt: 0.12 * d * Math.sin(t * 17),
      armL: [1.0 + Math.sin(t * 22) * 0.35 * d, 0.7], armR: [1.0 + Math.cos(t * 22) * 0.35 * d, 0.7],
      eyes: t < 0.85 ? 'x' : 'sad', mouth: 'wave', glow: 0.45, tint: Math.max(0, 1 - t * 2.2), lookX: 0, lookY: 0 };
  },
  dance: (t, T) => ({ ...base(T), x: Math.sin(t * 4.4) * 26, tilt: Math.sin(t * 4.4) * 0.12, y: -10 - Math.abs(Math.sin(t * 8.8)) * 16,
    armL: [1.6 + Math.sin(t * 4.4) * 1.0, 0.45], armR: [1.6 - Math.sin(t * 4.4) * 1.0, 0.45], headTilt: -Math.sin(t * 4.4) * 0.08,
    eyes: 'happy', mouth: 'grin', blush: 1, glow: 1, lookX: 0, lookY: 0 }),
  sad: (t, T) => ({ ...base(T), y: 8 + Math.sin(T * 1.2) * 3, headTilt: -0.1, headY: 7, tilt: 0, armL: [0.08, 0.05], armR: [0.08, 0.05],
    eyes: 'sad', mouth: 'frown', glow: 0.35, lookX: 0, lookY: 6 }),
  // poses QUIETAS para movimiento reducido (theme.reactions[].reducedAnim): feliz o triste sin moverse
  happy: () => ({ ...base(0), y: -16, armL: [2.3, 0.4], armR: [2.3, 0.4], eyes: 'happy', mouth: 'grin', blush: 1, glow: 1, lookX: 0 }),
  oops: () => ({ ...base(0), y: 0, armL: [0.9, 0.7], armR: [0.9, 0.7], eyes: 'sad', mouth: 'wave', glow: 0.45, lookX: 0 }),
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

/** Puntos de un brazo: s = -1 izquierda del espectador, +1 derecha. a = ángulo del hombro desde «abajo» (positivo = hacia afuera), b = codo. */
export function armPoints(s, [a, b], sx = 62, sy = -22, l1 = 44, l2 = 40) {
  const ex = sx * s + Math.sin(a) * l1 * s, ey = sy + Math.cos(a) * l1;
  const hx = ex + Math.sin(a + b) * l2 * s, hy = ey + Math.cos(a + b) * l2;
  return { sx: sx * s, sy, ex, ey, hx, hy };
}

function drawArm(c, s, ang, L) {
  const p = armPoints(s, ang);
  c.strokeStyle = L.shell; c.lineWidth = 20; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(p.sx, p.sy); c.lineTo(p.ex, p.ey); c.lineTo(p.hx, p.hy); c.stroke();
  c.fillStyle = L.body; circle(c, p.hx, p.hy, 14); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; circle(c, p.hx - 4, p.hy - 4, 5); c.fill();
  return p;
}

/** Objetos que el personaje sostiene (`scene.item`). Se dibujan derechos en la mano. */
export const ITEMS = {
  matraz(c, L) {
    c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, -7, -58, 14, 22, 3); c.fill();
    c.beginPath(); c.moveTo(-7, -38); c.lineTo(-24, -6); c.quadraticCurveTo(-27, 2, -18, 2); c.lineTo(18, 2); c.quadraticCurveTo(27, 2, 24, -6); c.lineTo(7, -38); c.closePath(); c.fill();
    c.fillStyle = L.antenna; c.beginPath(); c.moveTo(-16, -18); c.lineTo(-23, -5); c.quadraticCurveTo(-25, 0, -18, 0); c.lineTo(18, 0); c.quadraticCurveTo(25, 0, 23, -5); c.lineTo(16, -18); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)'; circle(c, -5, -9, 3); c.fill(); circle(c, 6, -13, 2); c.fill();
    c.strokeStyle = L.screen; c.lineWidth = 3; rr(c, -9, -60, 18, 5, 2); c.stroke();
  },
  lupa(c, L) {
    c.strokeStyle = L.screen; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -24); c.stroke();
    c.fillStyle = 'rgba(77,225,255,.28)'; circle(c, 0, -44, 20); c.fill();
    c.strokeStyle = '#FFD166'; c.lineWidth = 7; circle(c, 0, -44, 20); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(0, -44, 12, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
  },
  libro(c, L) {
    c.save(); c.rotate(-0.15);
    c.fillStyle = L.antenna; rr(c, -24, -40, 48, 36, 5); c.fill();
    c.fillStyle = '#FFFFFF'; rr(c, -20, -36, 40, 4, 2); c.fill();
    c.fillStyle = L.screen; rr(c, -24, -40, 8, 36, 3); c.fill();
    c.fillStyle = '#FFD166'; circle(c, 5, -22, 6); c.fill();
    c.restore();
  },
};

function drawEye(c, x, y, P, L, blink, side) {
  c.fillStyle = L.glow; c.strokeStyle = L.glow; c.lineCap = 'round'; c.lineJoin = 'round';
  const e = P.eyes, lx = P.lookX, ly = P.lookY;
  if (e === 'happy') { c.lineWidth = 9; c.beginPath(); c.arc(x, y + 8, 14, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); return; }
  if (e === 'x') { c.lineWidth = 8; c.beginPath(); c.moveTo(x - 11, y - 11); c.lineTo(x + 11, y + 11); c.moveTo(x + 11, y - 11); c.lineTo(x - 11, y + 11); c.stroke(); return; }
  if (e === 'sad') {
    rr(c, x - 11 + lx * .5, y - 2 + ly * .5, 22, 16, 8); c.fill();
    c.lineWidth = 6; c.beginPath(); c.moveTo(x - 13, y - 14 + (side > 0 ? -6 : 0)); c.lineTo(x + 13, y - 14 + (side > 0 ? 0 : -6)); c.stroke(); return;
  }
  let h = 34; if (e === 'think' && side < 0) h = 12; if (blink) h = 4;
  rr(c, x - 11 + lx, y - h / 2 + ly, 22, h, 11); c.fill();
  if (h > 20) { c.fillStyle = 'rgba(255,255,255,.75)'; circle(c, x - 3 + lx, y - 8 + ly, 4); c.fill(); }
}

function drawMouth(c, y, P, L) {
  c.strokeStyle = L.glow; c.fillStyle = L.glow; c.lineWidth = 6; c.lineCap = 'round';
  switch (P.mouth) {
    case 'open': { const h = 4 + 16 * P.mouthOpen; rr(c, -12, y - h / 2, 24, h, Math.min(10, h / 2)); c.fill(); break; }
    case 'grin': c.beginPath(); c.moveTo(-17, y - 4); c.arc(0, y - 4, 17, 0, Math.PI); c.closePath(); c.fill(); break;
    case 'flat': c.beginPath(); c.moveTo(-9, y + 2); c.lineTo(9, y - 1); c.stroke(); break;
    case 'wave': c.beginPath(); c.moveTo(-15, y); for (let i = 1; i <= 6; i++) c.lineTo(-15 + i * 5, y + (i % 2 ? -5 : 4)); c.stroke(); break;
    case 'frown': c.beginPath(); c.arc(0, y + 12, 13, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); break;
    default: c.beginPath(); c.arc(0, y - 8, 13, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
  }
}

/**
 * Dibuja el personaje con su centro del cuerpo en (x, y) y escala `s`.
 * @param P pose (de poseFor/blendPose)  @param L look (lookOf)  @param o { item, blink, antenna (rad), flame (0..1), T }
 */
export function drawHost(c, x, y, s, P, L, o = {}) {
  const T = o.T || 0;
  c.save(); c.translate(x + P.x * s, y + P.y * s); c.scale(s, s);
  c.translate(0, 76); c.rotate(P.tilt); c.scale(1 / Math.sqrt(P.squash), P.squash); c.translate(0, -76);

  // propulsor y llama (flota: no tiene piernas)
  const fl = o.flame ?? 1;
  c.fillStyle = L.screen; c.beginPath(); c.moveTo(-24, 52); c.lineTo(24, 52); c.lineTo(15, 74); c.lineTo(-15, 74); c.closePath(); c.fill();
  c.fillStyle = L.glow; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(0, 86, 12 + 3 * fl, 12 + 10 * fl, 0, 0, TAU); c.fill();
  c.globalAlpha = 0.9; c.beginPath(); c.ellipse(0, 82, 7, 6 + 6 * fl, 0, 0, TAU); c.fill(); c.globalAlpha = 1;

  // brazo de atrás (izquierdo del espectador) y cuerpo
  drawArm(c, -1, P.armL, L);
  c.fillStyle = L.body; rr(c, -64, -58, 128, 118, 50); c.fill();
  c.fillStyle = L.bodyDark; rr(c, -64, 20, 128, 40, 30); c.fill(); c.fillStyle = L.body; rr(c, -64, -58, 128, 96, 50); c.fill();
  c.fillStyle = L.belly; rr(c, -34, -22, 68, 48, 18); c.fill();
  const leds = [L.glow, L.antenna, '#FFD166'];
  leds.forEach((col, k) => { c.fillStyle = col; c.globalAlpha = 0.55 + 0.45 * Math.max(0, Math.sin(T * 3 + k * 2.1)); circle(c, -16 + k * 16, 2, 6); c.fill(); });
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, -48, -50, 40, 18, 9); c.fill();

  // cabeza (pantalla) con su inclinación y rebote
  c.save(); c.translate(0, -70 + P.headY); c.rotate(P.headTilt); c.translate(0, 70);
  c.fillStyle = L.screen; rr(c, -15, -76, 30, 22, 6); c.fill();             // cuello
  // antena con muelle
  const aa = o.antenna || 0;
  c.strokeStyle = L.shellShade; c.lineWidth = 7; c.lineCap = 'round';
  const tips = L.antennaStyle === 'double' ? [[-40, -0.35], [40, 0.35]] : [[0, 0]];
  for (const [ox, rot] of tips) {
    const bx = ox, tx = ox + Math.sin(aa + rot) * 40, ty = -200 - Math.cos(aa + rot) * 40;
    c.beginPath(); c.moveTo(bx, -200); c.quadraticCurveTo(bx + (tx - bx) * 0.2, -222, tx, ty); c.stroke();
    c.fillStyle = L.antenna; c.globalAlpha = 0.25 + 0.3 * P.glow; circle(c, tx, ty, 22); c.fill(); c.globalAlpha = 1;
    circle(c, tx, ty, 12); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; circle(c, tx - 4, ty - 4, 4); c.fill();
  }
  // orejas
  c.fillStyle = L.shellShade; circle(c, -96, -140, 17); c.fill(); circle(c, 96, -140, 17); c.fill();
  c.fillStyle = L.glow; c.globalAlpha = 0.5 + 0.5 * P.glow; circle(c, -96, -140, 6); c.fill(); circle(c, 96, -140, 6); c.fill(); c.globalAlpha = 1;
  // carcasa y pantalla
  c.fillStyle = L.shell; rr(c, -92, -206, 184, 138, 46); c.fill();
  c.fillStyle = L.shellShade; rr(c, -92, -110, 184, 42, 30); c.fill(); c.fillStyle = L.shell; rr(c, -92, -206, 184, 118, 46); c.fill();
  c.fillStyle = L.screen; rr(c, -76, -192, 152, 108, 34); c.fill();
  if (P.tint > 0.01) { c.fillStyle = '#F87171'; c.globalAlpha = 0.55 * P.tint; rr(c, -76, -192, 152, 108, 34); c.fill(); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(255,255,255,.10)'; rr(c, -66, -186, 70, 20, 10); c.fill();
  // cara
  const blink = !!o.blink && (P.eyes === 'open' || P.eyes === 'think');
  drawEye(c, -34, -146, P, L, blink, -1); drawEye(c, 34, -146, P, L, blink, 1);
  if (P.blush > 0.02) { c.fillStyle = L.blush; c.globalAlpha = 0.55 * P.blush; circle(c, -58, -116, 10); c.fill(); circle(c, 58, -116, 10); c.fill(); c.globalAlpha = 1; }
  drawMouth(c, -108, P, L);
  c.restore();

  // brazo de adelante con el objeto
  const hand = drawArm(c, 1, P.armR, L);
  if (o.item && ITEMS[o.item]) { c.save(); c.translate(hand.hx, hand.hy + 6); ITEMS[o.item](c, L); c.restore(); }

  // globos de pensamiento
  if (P.think > 0.05) {
    c.globalAlpha = P.think; c.fillStyle = '#FFFFFF';
    for (let k = 0; k < 3; k++) { const on = ((T * 1.6 - k * 0.33) % 1 + 1) % 1; circle(c, 104 + k * 22, -220 - k * 22, (5 + k * 4) * (0.75 + 0.25 * Math.sin(on * Math.PI))); c.fill(); }
    c.globalAlpha = 1;
  }
  c.restore();
}

/** Puntos de anclaje (para el globo y las partículas), en coordenadas del lienzo. */
export function anchorOf(name, x, y, s, P) {
  const cx = x + P.x * s, cy = y + P.y * s;
  switch (name) {
    case 'head': return [cx, cy + (-140 + P.headY) * s];
    case 'chest': return [cx, cy];
    case 'feet': return [cx, cy + 100 * s];
    default: return [cx, cy + (-262 + P.headY) * s];       // 'top': encima de la antena
  }
}
