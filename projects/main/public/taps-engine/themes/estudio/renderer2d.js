// Tema «estudio» · renderizador animado con Canvas 2D (theme.json → "canvas": "2d").
//
// Por qué Canvas 2D y no 3D: el personaje y los fondos son ilustración plana, así que no hace falta WebGL ni una
// librería 3D (three.js pesa ~150 KB comprimido). Este archivo + rig.js + scenery.js pesan unos 14 KB comprimidos,
// no crean contexto WebGL (no compiten con el límite de contextos de iOS/Android), el fondo se pinta una sola vez por
// mundo, decorado y hora, y cada fotograma son dos drawImage + unas 60-90 figuras: entra holgado en 30 fps en celulares modestos.
//
// Cumple la interfaz de renderizador del motor (README): setScene, preload, play, fx, frame, anchor, setSize, dispose
// y, opcionales, nudge (correr al personaje para hacerle espacio a un objeto) y plano (pequeño cambio de plano entre preguntas).
//
// Modo cine en 2D (theme.cine.planos): no hay cámara 3D, así que cada plano es una transformación barata del cuadro entero:
//   s      acercamiento del cuadro (≥ 1: nunca se ven los bordes del fondo), alrededor del pecho del personaje
//   floor  dónde queda la línea del piso (1 = normal; < 1 la pared se encoge y se ve más piso: «desde arriba»;
//          > 1 la pared se estira y el piso casi desaparece: «contrapicado»)
//   host   tamaño extra del personaje (en un plano desde arriba se ve más chico; desde abajo, más grande)
//   rot    inclinación «holandesa» (rad), pan = travelling lateral lento (fracción del ancho), breathe = órbita: respira
//          despacio (acercar/alejar) con un leve vaivén
// Todo se interpola (~1,5 s) para que los cambios de plano entre preguntas sean un movimiento de cámara y no un salto.

import { POSES, poseFor, blendPose, drawHost, anchorOf, lookOf } from './rig.js';
import { paintWorld, paintAmbient, paintClima, paintFauna, GROUND_Y } from './scenery.js';

const makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};
const easeOut = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
/** Entradas del personaje al llegar a un lugar nuevo: duración (s) y desplazamiento/escala según el avance p (0..1). */
const ENTERS = {
  vuela: { dur: 0.75, at: (p, side) => ({ dx: (1 - easeOut(p)) * 360 * side, dy: -Math.sin(p * Math.PI) * 40, sc: 1 }) },
  cae: { dur: 0.6, at: p => ({ dx: 0, dy: -(1 - easeOut(p)) * 420, sc: 1 + (p > 0.7 ? Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.06 : 0) }) },
  aparece: { dur: 0.45, at: p => ({ dx: 0, dy: 0, sc: 0.2 + 0.8 * easeOut(p) + Math.sin(p * Math.PI) * 0.12 }) },
  saluda: { dur: 1.1, at: () => ({ dx: 0, dy: 0, sc: 1 }) },
};
const CAM0 = { s: 1, floor: 1, host: 1, rot: 0, pan: 0, breathe: 0, foco: 0, dx: 0 };
/** Variantes entre preguntas (la 0 es el plano base del Tap; la 4, el plano detalle del objeto en la mano). */
const VARIANTES = [{}, { s: 1.08 }, { dx: 0.04, s: 1.06 }, { floor: 0.94, s: 1.04, dx: -0.03 }, { foco: 1 }];

export function createRenderer({ canvas, width, height, theme, reducedMotion = false }) {
  let W = width, H = height, ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const bgCache = new Map();                       // mundo|decorado|lado|hora → lienzo con el fondo fijo (máximo 2: el actual y el precargado)
  let scene = { world: theme.defaultWorld || 'laboratorio', host: Object.keys(theme.characters || {})[0], item: null, props: null, hora: null, clima: null, fauna: null, shot: { x: 0, zoom: 1, flip: false } };
  let look = lookOf(theme.characters?.[scene.host]);
  let anim = 'idle', animT = 0, T = 0, pose = null;
  let blinkIn = 2.5, blinkT = 0, aa = 0, av = 0, lastHX = 0;
  let shake = 0, ring = -1, flash = 0;
  let enter = null, enterT = 0, nudge = 0, nudgeTo = 0;
  let plano = null, variante = 0, cam = { ...CAM0 };

  const goal = () => {
    if (!plano) return { ...CAM0 };
    const g = { ...CAM0, ...plano }, v = reducedMotion ? {} : VARIANTES[variante] || {};
    return { ...g, s: g.s * (v.s || 1), floor: g.floor * (v.floor || 1), dx: g.dx + (v.dx || 0), foco: v.foco || 0, pan: reducedMotion ? 0 : g.pan, breathe: reducedMotion ? 0 : g.breathe };
  };
  const floorY = () => H * GROUND_Y * Math.max(0.55, Math.min(1.35, cam.floor));
  const S = () => W / 540 * 0.82 * (scene.shot.zoom || 1) * cam.host;             // escala del personaje
  const hostXY = () => [W * (0.5 + (scene.shot.x || 0) + nudge), floorY() - 112 * S()];
  const propSide = () => ((scene.shot.x || 0) > 0.02 ? -1 : 1);                   // el decorado, del lado libre
  /** Transformación del cuadro (modo cine): escala alrededor del personaje, inclinación y travelling. */
  function view() {
    const [hx, hy] = hostXY(), q = cam;
    const pan = q.dx + q.pan * Math.sin(T * 0.09), rot = q.rot + q.breathe * 0.5 * Math.sin(T * 0.13);
    let s = Math.max(1, q.s * (1 + q.breathe * Math.sin(T * 0.11)) * (1 + 0.35 * q.foco));
    const fy = Math.min(H * 0.9, Math.max(H * 0.1, hy - 40 * S() * (1 - q.foco) - 60 * S() * q.foco));
    const fx = Math.min(W * 0.9, Math.max(W * 0.1, hx + (scene.item ? 46 * S() * q.foco * (scene.shot.flip ? -1 : 1) : 0)));
    const tx = -pan * W, co = Math.cos(rot), si = Math.sin(rot);
    // nunca se ven los bordes del fondo: si una esquina de la pantalla cae fuera del dibujo, se acerca un poco más
    for (let i = 0; i < 12; i++) {
      let ok = true;
      for (const [X, Y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
        const ux = X - fx - tx, uy = Y - fy, px = fx + (ux * co + uy * si) / s, py = fy + (-ux * si + uy * co) / s;
        if (px < 0 || px > W || py < 0 || py > H) { ok = false; break; }
      }
      if (ok) break; s *= 1.04;
    }
    return { s, rot, fx, fy, tx, cx: fx, cy: fy };
  }
  function apply(c, v) { c.translate(v.cx + v.tx, v.cy); c.rotate(v.rot); c.scale(v.s, v.s); c.translate(-v.fx, -v.fy); }
  function toScreen([x, y], v = view()) {
    const dx = (x - v.fx) * v.s, dy = (y - v.fy) * v.s, co = Math.cos(v.rot), si = Math.sin(v.rot);
    return [v.cx + v.tx + dx * co - dy * si, v.cy + dx * si + dy * co];
  }

  function background(world, props = scene.props, side = propSide(), hora = scene.hora) {
    const key = `${world}|${props || ''}|${side}|${hora || ''}`;
    let bg = bgCache.get(key);
    if (!bg) {
      bg = makeCanvas(W, H); paintWorld(bg.getContext('2d'), W, H, world, theme.scenes?.[world], props, side, hora);
      bgCache.set(key, bg);
      while (bgCache.size > 2) bgCache.delete(bgCache.keys().next().value);
    }
    return bg;
  }
  // los textos de la pizarra usan la fuente del tema: cuando llega, se repintan los fondos (una vez)
  try { globalThis.document?.fonts?.ready?.then(() => bgCache.clear()); } catch { /* sin API de fuentes */ }

  function setScene(spec = {}) {
    scene = {
      world: spec.world || theme.defaultWorld || 'laboratorio', host: theme.characters?.[spec.host] ? spec.host : scene.host, item: spec.item || null,
      props: spec.props || null, hora: spec.hora || null, clima: spec.clima || null, fauna: spec.fauna || null,
      shot: { x: 0, zoom: 1, flip: false, ...(spec.shot || {}) },
    };
    look = lookOf(theme.characters?.[scene.host]);
    plano = spec.plano || null; variante = 0; cam = goal();                     // lugar nuevo: el plano base, sin viajar
    enter = !reducedMotion && ENTERS[spec.enter] ? spec.enter : null; enterT = 0;
    if (enter === 'saluda') { anim = 'talk'; animT = 0; }
    background(scene.world);
    return Promise.resolve();
  }
  function preload(spec = {}) { if (spec.world) background(spec.world, spec.props || null, (spec.shot?.x || 0) > 0.02 ? -1 : 1, spec.hora || null); return Promise.resolve(); }
  function play(name) { if (!POSES[name]) name = 'idle'; if (name !== anim) { anim = name; animT = 0; } }
  function fx(name) {
    if (reducedMotion) return;
    if (name === 'shake') shake = 0.35;
    else if (name === 'ring') ring = 0;
    else if (name === 'flash') flash = 1;
  }
  /** Corre al personaje `dx` (fracción del ancho) para dejar sitio a un objeto; `now` = sin transición. */
  function nudgeTo_(dx, now) { nudgeTo = dx; if (now || reducedMotion) nudge = dx; }
  /** Pequeño cambio de plano entre preguntas (n = pregunta, seed = número del Tap; determinista). */
  function plano_(n, seed = 0) { variante = !n ? 0 : (n === 2 && scene.item && seed % 2 === 0) ? 4 : 1 + ((seed + n) % 3); }

  function frame(dt) {
    if (!reducedMotion) { T += dt; animT += dt; }
    nudge += (nudgeTo - nudge) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 9));
    const g = goal(), k = reducedMotion ? 1 : 1 - Math.exp(-dt * 1.6);
    for (const p in g) cam[p] += (g[p] - cam[p]) * k;
    const target = poseFor(anim, reducedMotion ? 0 : animT, reducedMotion ? 0 : T);
    if (enter === 'saluda' && enterT < ENTERS.saluda.dur) target.armR = [2.6 + Math.sin(enterT * 14) * 0.35, 0.5];   // saluda con la mano libre
    pose = blendPose(pose, target, reducedMotion ? 1 : 1 - Math.exp(-dt * 16));
    // parpadeo
    blinkIn -= dt; if (blinkIn <= 0) { blinkT = 0.12; blinkIn = 2.4 + Math.random() * 2.4; } if (blinkT > 0) blinkT -= dt;
    // entrada al lugar nuevo
    let ex = 0, ey = 0, es = 1;
    if (enter) {
      enterT += dt; const def = ENTERS[enter], p = Math.min(1, enterT / def.dur);
      const side = (scene.shot.x || 0) < 0 ? -1 : 1; ({ dx: ex, dy: ey, sc: es } = def.at(p, side));
      if (p >= 1) enter = null;
    }
    // antena con muelle: reacciona al movimiento de la cabeza
    const s = S() * es, [x0, y0] = hostXY(), hx = x0 + (pose.x + ex) * s, gy = floorY(), gy0 = H * GROUND_Y;
    if (dt > 0 && !reducedMotion) {
      const vx = (hx - lastHX) / dt / s;
      av += (-aa * 90 - av * 9 - Math.max(-400, Math.min(400, vx)) * 0.012) * dt; aa += av * dt; aa = Math.max(-0.7, Math.min(0.7, aa - pose.tilt * 0.02));
    }
    lastHX = hx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let ox = 0, oy = 0;
    if (shake > 0) { shake -= dt; const m = 14 * (W / 540) * Math.max(0, shake / 0.35); ox = (Math.random() - 0.5) * m; oy = (Math.random() - 0.5) * m; }
    const v = view(), bg = background(scene.world);
    ctx.fillStyle = theme.scenes?.[scene.world]?.sky?.[0] || '#1E1B4B'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy); apply(ctx, v);
    // pared y piso por separado: así un plano desde arriba muestra más piso y uno desde abajo, más pared (dos drawImage)
    ctx.drawImage(bg, 0, 0, W, gy0, 0, 0, W, gy);
    ctx.drawImage(bg, 0, gy0, W, H - gy0, 0, gy, W, H - gy);
    if (!reducedMotion) paintAmbient(ctx, W, H, scene.world, T);
    if (scene.fauna) paintFauna(ctx, W, H, scene.fauna, T, gy, propSide());
    if (scene.clima) paintClima(ctx, W, H, scene.clima, reducedMotion ? 2 : T);

    // sombra dura en el piso (se achica cuando salta)
    const lift = Math.max(0, -(pose.y + ey) - 10) / 80;
    ctx.fillStyle = 'rgba(8,7,16,.32)'; ctx.beginPath(); ctx.ellipse(hx + 8 * s, gy + 6 * s, Math.max(4, (70 - 26 * Math.min(1, lift)) * s), Math.max(2, (14 - 5 * Math.min(1, lift)) * s), 0, 0, Math.PI * 2); ctx.fill();
    // aro de celebración detrás del personaje
    if (ring >= 0) {
      ring += dt; const p = ring / 0.7; if (p >= 1) ring = -1;
      else { ctx.strokeStyle = look.glow; ctx.globalAlpha = 1 - p; ctx.lineWidth = 10 * s * (1 - p) + 2; ctx.beginPath(); ctx.arc(hx, y0 + (pose.y + ey) * s - 90 * s, (90 + 220 * p) * s, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    const hostX = x0 + ex * s, hostY = y0 + ey * s;
    if (scene.shot.flip) { ctx.save(); ctx.translate(hostX * 2, 0); ctx.scale(-1, 1); }
    drawHost(ctx, hostX, hostY, s, pose, look, { item: scene.item, blink: blinkT > 0, antenna: scene.shot.flip ? -aa : aa, flame: reducedMotion ? 0.6 : 0.6 + 0.4 * Math.sin(T * 30), T });
    if (scene.shot.flip) ctx.restore();
    ctx.restore();
    if (ox || oy) { ctx.fillStyle = '#080710'; if (ox > 0) ctx.fillRect(0, 0, ox, H); if (oy > 0) ctx.fillRect(0, 0, W, oy); }
    if (flash > 0) { flash = Math.max(0, flash - dt * 3); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = flash * 0.35; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function anchor(name) {
    const [x, y] = hostXY();
    return toScreen(anchorOf(name, x, y, S(), pose || poseFor('idle')));
  }
  function setSize(w, h) { W = w; H = h; canvas.width = w; canvas.height = h; ctx = canvas.getContext('2d'); bgCache.clear(); }
  function dispose() { bgCache.clear(); pose = null; }

  return { setScene, preload, play, fx, frame, anchor, setSize, dispose, nudge: nudgeTo_, plano: plano_ };
}
