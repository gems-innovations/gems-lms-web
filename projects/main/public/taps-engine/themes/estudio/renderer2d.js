// Tema «estudio» · renderizador animado con Canvas 2D (theme.json → "canvas": "2d").
//
// Por qué Canvas 2D y no 3D: el personaje y los fondos son ilustración plana, así que no hace falta WebGL ni una
// librería 3D (three.js pesa ~150 KB comprimido). Este archivo + rig.js + scenery.js pesan unos 10 KB comprimidos,
// no crean contexto WebGL (no compiten con el límite de contextos de iOS/Android), el fondo se pinta una sola vez por
// mundo y cada fotograma es un drawImage + unas 60 figuras: entra holgado en 30 fps en celulares modestos.
//
// Cumple la interfaz de renderizador del motor (README): setScene, preload, play, fx, frame, anchor, setSize, dispose.

import { POSES, poseFor, blendPose, drawHost, anchorOf, lookOf } from './rig.js';
import { paintWorld, paintAmbient, GROUND_Y } from './scenery.js';

const makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

export function createRenderer({ canvas, width, height, theme, reducedMotion = false }) {
  let W = width, H = height, ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const bgCache = new Map();                       // mundo → lienzo con el fondo fijo (máximo 2: el actual y el precargado)
  let scene = { world: theme.defaultWorld || 'laboratorio', host: Object.keys(theme.characters || {})[0], item: null };
  let look = lookOf(theme.characters?.[scene.host]);
  let anim = 'idle', animT = 0, T = 0, pose = null;
  let blinkIn = 2.5, blinkT = 0, aa = 0, av = 0, lastHX = 0, lastHY = 0;
  let shake = 0, ring = -1, flash = 0;

  const S = () => W / 540 * 0.82;                  // escala del personaje
  const hostXY = () => [W / 2, H * GROUND_Y - 112 * S()];

  function background(world) {
    let bg = bgCache.get(world);
    if (!bg) {
      bg = makeCanvas(W, H); paintWorld(bg.getContext('2d'), W, H, world, theme.scenes?.[world]);
      bgCache.set(world, bg);
      while (bgCache.size > 2) bgCache.delete(bgCache.keys().next().value);
    }
    return bg;
  }
  // los textos de la pizarra usan la fuente del tema: cuando llega, se repintan los fondos (una vez)
  try { globalThis.document?.fonts?.ready?.then(() => bgCache.clear()); } catch { /* sin API de fuentes */ }

  function setScene(spec = {}) {
    scene = { world: spec.world || theme.defaultWorld || 'laboratorio', host: theme.characters?.[spec.host] ? spec.host : scene.host, item: spec.item || null };
    look = lookOf(theme.characters?.[scene.host]);
    background(scene.world);
    return Promise.resolve();
  }
  function preload(spec = {}) { if (spec.world) background(spec.world); return Promise.resolve(); }
  function play(name) { if (!POSES[name]) name = 'idle'; if (name !== anim) { anim = name; animT = 0; } }
  function fx(name) {
    if (reducedMotion) return;
    if (name === 'shake') shake = 0.35;
    else if (name === 'ring') ring = 0;
    else if (name === 'flash') flash = 1;
  }

  function frame(dt) {
    if (!reducedMotion) { T += dt; animT += dt; }
    const target = poseFor(anim, reducedMotion ? 0 : animT, reducedMotion ? 0 : T);
    pose = blendPose(pose, target, reducedMotion ? 1 : 1 - Math.exp(-dt * 16));
    // parpadeo
    blinkIn -= dt; if (blinkIn <= 0) { blinkT = 0.12; blinkIn = 2.4 + Math.random() * 2.4; } if (blinkT > 0) blinkT -= dt;
    // antena con muelle: reacciona al movimiento de la cabeza
    const s = S(), [x0, y0] = hostXY(), hx = x0 + pose.x * s, hy = y0 + pose.y * s;
    if (dt > 0 && !reducedMotion) {
      const vx = (hx - lastHX) / dt / s;
      av += (-aa * 90 - av * 9 - vx * 0.012) * dt; aa += av * dt; aa = Math.max(-0.7, Math.min(0.7, aa - pose.tilt * 0.02));
    }
    lastHX = hx; lastHY = hy;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let ox = 0, oy = 0;
    if (shake > 0) { shake -= dt; const m = 14 * (W / 540) * Math.max(0, shake / 0.35); ox = (Math.random() - 0.5) * m; oy = (Math.random() - 0.5) * m; }
    ctx.drawImage(background(scene.world), ox, oy);
    if (ox || oy) { ctx.fillStyle = '#080710'; if (ox > 0) ctx.fillRect(0, 0, ox, H); if (oy > 0) ctx.fillRect(0, 0, W, oy); }
    if (!reducedMotion) paintAmbient(ctx, W, H, scene.world, T);

    // sombra en el piso (se achica cuando salta)
    const lift = Math.max(0, -pose.y - 10) / 80;
    ctx.fillStyle = 'rgba(8,7,16,.35)'; ctx.beginPath(); ctx.ellipse(hx, H * GROUND_Y + 4 * s, (70 - 26 * lift) * s, (14 - 5 * lift) * s, 0, 0, Math.PI * 2); ctx.fill();
    // aro de celebración detrás del personaje
    if (ring >= 0) {
      ring += dt; const p = ring / 0.7; if (p >= 1) ring = -1;
      else { ctx.strokeStyle = look.glow; ctx.globalAlpha = 1 - p; ctx.lineWidth = 10 * s * (1 - p) + 2; ctx.beginPath(); ctx.arc(hx, hy - 90 * s, (90 + 220 * p) * s, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    drawHost(ctx, x0 + ox, y0 + oy, s, pose, look, { item: scene.item, blink: blinkT > 0, antenna: aa, flame: reducedMotion ? 0.6 : 0.6 + 0.4 * Math.sin(T * 30), T });
    if (flash > 0) { flash = Math.max(0, flash - dt * 3); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = flash * 0.35; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function anchor(name) {
    const [x, y] = hostXY();
    return anchorOf(name, x, y, S(), pose || poseFor('idle'));
  }
  function setSize(w, h) { W = w; H = h; canvas.width = w; canvas.height = h; ctx = canvas.getContext('2d'); bgCache.clear(); }
  function dispose() { bgCache.clear(); pose = null; }

  return { setScene, preload, play, fx, frame, anchor, setSize, dispose };
}
