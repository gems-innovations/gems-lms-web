// Taps Engine · motor de escenarios en tiempo real, sin framework y sin saber nada de quizzes ni del LMS.
//
//   import { create } from './taps-engine.js';
//   const stage = create(contenedor, { theme: '/taps-engine/themes/minecraft/theme.json' });
//   await stage.ready;                                   // el tema cargó y se pintó la versión ligera
//   await stage.setScene({ world: 'cueva', host: 'sofi', item: 'pick', shot: 'izquierda', enter: 'camina', props: 'circuito' });
//   stage.react('ask');  stage.say('¿Listo?');  stage.react('celebrate');
//   await stage.visual({ objeto: 'piston', accion: 'bloquea' }, hueco, { side: 'der' });   // objeto para explicar (tocar / arrastrar)
//
// Dos capas, siempre en el mismo contenedor:
//   · LIGERA (DOM + CSS): fondo, personaje 2D y animaciones CSS. Se pinta casi al instante y es lo que ve quien tiene un
//     dispositivo flojo, WebGL caído o ahorro de datos. Nunca hay pantalla en blanco ni error.
//   · 3D (canvas): la carga el tema en segundo plano (render de otro archivo) y aparece con un fundido encima de la ligera.
// El «tema» (themes/<id>/theme.json + un renderizador opcional) es lo único que cambia entre videojuegos.
// Documentación de la interfaz del tema: README.md.

const BASE = new URL('.', import.meta.url);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const pick = list => list[(Math.random() * list.length) | 0];
/** Cede el hilo principal para que un toque del usuario no espere a una tarea larga del arranque del 3D. */
const yieldMain = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(r => setTimeout(r, 0)));

// ───────────────────────── capacidades del dispositivo ─────────────────────────
/** Decide el nivel de calidad: 'light' (sin 3D), 'low', 'normal' o 'high'. Puro: recibe el entorno para poder probarlo. */
export function pickTier(env = {}) {
  const nav = env.navigator ?? (typeof navigator !== 'undefined' ? navigator : {});
  const conn = nav.connection ?? {};
  const mem = nav.deviceMemory;                       // undefined en iPhone y Firefox
  const cores = nav.hardwareConcurrency || 4;
  const coarse = env.coarse ?? (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
  if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return 'light';
  if ((mem !== undefined && mem <= 1) || cores <= 2) return 'light';
  if ((mem !== undefined && mem <= 3) || (coarse && cores <= 4 && mem !== undefined)) return 'low';
  return coarse ? 'normal' : 'high';
}
export const TIERS = {
  low:    { w: 360, h: 640,  fps: 24 },
  normal: { w: 540, h: 960,  fps: 30 },
  high:   { w: 720, h: 1280, fps: 30 },
};
function webglWorks() {
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); const ok = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); return ok; }
  catch { return false; }
}

// ───────────────────────── sonido (tema = archivos; el motor = sintetizados) ─────────────────────────
const SYNTH = {
  jingle: (s) => [523, 659, 784, 1047].forEach((f, k) => s.tone('triangle', f, f, .14, .12, k * .09)),
  wrong:  (s) => { s.tone('square', 220, 110, .28, .08); s.tone('sawtooth', 165, 82, .32, .05, .05); },
  blip:   (s) => s.tone('square', 520 * (1 + Math.random() * .08), 520, .05, .05),
  crit:   (s) => { s.tone('sine', 1500, 1900, .12, .09); s.tone('sine', 2300, 2500, .1, .06, .03); },
  pop:    (s) => s.tone('sine', 380, 760, .09, .12),
  whoosh: (s) => s.whoosh(.25, .2, 500, 2400),
  result: (s) => { [392, 523, 659, 784].forEach((f, k) => s.tone('triangle', f, f, .22, .12, k * .12)); },
};
export const SYNTH_NAMES = Object.freeze(Object.keys(SYNTH));
/**
 * Decide cómo suena `name` en un tema (puro, para poder probarlo):
 *   · `files`  → archivo del tema (con `synth` de respaldo si el navegador no lo decodifica)
 *   · `tones`  → tonos sintetizados definidos en el propio tema: [[onda, f0, f1, dur, vol, retraso], …]  (sin archivos)
 *   · `noise`  → ráfaga de ruido filtrado [dur, vol, f0, f1] (un «fiu» o un chispazo); se puede sumar a `tones`
 *   · `synth`  → uno de los sintetizados del motor (SYNTH_NAMES)
 * Sin definición en el tema se usa el sintetizado del motor con ese nombre, si existe.
 */
export function resolveSound(theme, name) {
  const def = theme?.sounds?.[name];
  if (def?.files?.length) return { kind: 'file', files: def.files, vol: def.vol ?? 1, synth: SYNTH[def.synth] ? def.synth : null };
  if (Array.isArray(def?.tones) || Array.isArray(def?.noise)) return { kind: 'tones', tones: def.tones || [], noise: def.noise || null, vol: def.vol ?? 1 };
  const synth = def?.synth ?? name;
  return SYNTH[synth] ? { kind: 'synth', synth } : { kind: 'none' };
}
class Sound {
  constructor(theme, resolve) { this.theme = theme; this.resolve = resolve; this.ac = null; this.muted = false; this.bufs = new Map(); this.pending = new Map(); this.master = null; }
  /** El navegador solo deja crear el AudioContext tras un gesto del usuario. */
  unlock() {
    if (!this.ac) {
      const C = globalThis.AudioContext || globalThis.webkitAudioContext; if (!C) return false;
      this.ac = new C(); this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : .75;
      const comp = this.ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; this.master.connect(comp); comp.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    return true;
  }
  setMuted(m) { this.muted = !!m; if (this.master) this.master.gain.value = m ? 0 : .75; }
  tone(type, f0, f1, dur, vol = .15, delay = 0) {
    if (!this.ac || this.muted) return; const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  whoosh(dur = .22, vol = .25, f0 = 600, f1 = 2600) {
    if (!this.ac || this.muted) return; const ctx = this.ac, t = ctx.currentTime;
    if (!this.noise) { const b = ctx.createBuffer(1, ctx.sampleRate * .6, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b; }
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = this.noise; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(.0008, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0008, t + dur); src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur + .05);
  }
  async load(file) {
    if (this.bufs.has(file)) return this.bufs.get(file); if (this.pending.has(file)) return this.pending.get(file);
    const p = fetch(this.resolve(file)).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((ok, no) => { const d = this.ac.decodeAudioData(ab, ok, no); d?.catch?.(() => {}); })).then(b => (this.bufs.set(file, b), b)).catch(() => (this.bufs.set(file, null), null));
    this.pending.set(file, p); return p;
  }
  /** Reproduce un sonido del tema (archivos) o uno sintetizado del motor. Si el navegador no decodifica el archivo (p. ej. .ogg en Safari) usa la versión sintetizada. */
  play(name, o = {}) {
    if (!this.ac || this.muted) return;
    const plan = resolveSound(this.theme, name);
    if (plan.kind === 'file') {
      const file = pick(plan.files), buf = this.bufs.get(file);
      if (buf) { const s = this.ac.createBufferSource(), g = this.ac.createGain(); s.buffer = buf; s.playbackRate.value = (o.rate || 1) * (.94 + Math.random() * .12); g.gain.value = plan.vol * (o.vol ?? 1); s.connect(g); g.connect(this.master); s.start(); return; }
      if (buf === undefined) this.load(file);
      if (plan.synth) SYNTH[plan.synth](this);
    } else if (plan.kind === 'tones') {
      for (const [type = 'sine', f0 = 440, f1 = f0, dur = .1, vol = .12, delay = 0] of plan.tones) this.tone(type, f0, f1, dur, vol * plan.vol, delay);
      if (plan.noise) this.whoosh(...plan.noise);
    } else if (plan.kind === 'synth') SYNTH[plan.synth](this);
  }
  /** Descarga y decodifica por adelantado los archivos de estos sonidos (tras el primer gesto, sin bloquear nada). */
  warm(names) { if (!this.ac) return; for (const n of names) (this.theme.sounds?.[n]?.files || []).forEach(f => this.load(f)); }
}
/**
 * Sonido de la app (`opts.audio = { play(name, { theme }) }`, p. ej. audio/sonido.js → paraMotor()): el motor no crea su
 * propio AudioContext y cada sonido de theme.json se le pasa por nombre. Silencio, desbloqueo y pausa son de la app.
 */
function externalSound(audio, theme) {
  return { ac: null, unlock: () => false, warm() {}, setMuted() {}, play(name, o = {}) { try { audio.play?.(name, { ...o, theme: theme.id }); } catch { /* el sonido nunca tumba el motor */ } } };
}

// ───────────────────────── partículas (capa 2D sobre el 3D) ─────────────────────────
function burst(list, x, y, kind, colors) {
  const make = (n, fn) => { for (let i = 0; i < n; i++) list.push(fn(i)); };
  if (kind === 'confetti') make(46, i => { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 260 + Math.random() * 420; return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, life: 1.5, max: 1.5, c: colors[i % colors.length], s: 8 + Math.random() * 9 }; });
  else if (kind === 'hit') make(16, i => { const a = Math.random() * Math.PI * 2, v = 220 + Math.random() * 300; return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 900, life: .5, max: .5, c: colors[i % colors.length], s: 7 + Math.random() * 8 }; });
  else if (kind === 'poof') make(14, i => { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 120; return { x, y, vx: Math.cos(a) * v, vy: -60 - Math.random() * 160, g: -40, life: .9, max: .9, c: colors[i % colors.length], s: 20 + Math.random() * 16 }; });
}
function drawParticles(ctx, list, dt, scale, shape = 'square') {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i]; q.life -= dt; if (q.life <= 0) { list.splice(i, 1); continue; }
    q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    ctx.globalAlpha = Math.min(1, q.life / q.max * 1.4); ctx.fillStyle = q.c; const s = q.s * scale;
    if (shape === 'round' || (shape === 'mixed' && i % 2)) { ctx.beginPath(); ctx.arc(q.x, q.y, s / 2, 0, Math.PI * 2); ctx.fill(); }
    else if (shape === 'mixed') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.life * 6 + i); ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore(); }
    else ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── el escenario ─────────────────────────
let cssLoaded = false, cssReady = Promise.resolve();   // cssReady: la hoja del motor ya aplicó (el escenario no se ve antes: evita un salto de layout)
const FONTS = new Set();                       // fuentes de tema ya pedidas (document.fonts.check miente si la fuente aún no se registró)
function ensureCss() {
  if (cssLoaded || typeof document === 'undefined') return; cssLoaded = true;
  const href = new URL('taps-engine.css', BASE).href;
  if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; cssReady = new Promise(ok => { l.onload = l.onerror = () => ok(); }); document.head.appendChild(l); }
}
/** Hoja de estilos propia del tema (opcional, `css` en theme.json): se pide una sola vez y nunca bloquea el pintado. */
function ensureThemeCss(href) {
  if (typeof document === 'undefined' || document.querySelector(`link[data-te-theme="${href}"]`)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.teTheme = href; document.head.appendChild(l);
}
function loadScript(src) {
  return new Promise((ok, no) => {
    const existing = document.querySelector(`script[data-te="${src}"]`); if (existing) { existing.addEventListener('load', ok); existing.addEventListener('error', no); if (existing.dataset.done) ok(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true; s.dataset.te = src; s.onload = () => { s.dataset.done = '1'; ok(); }; s.onerror = () => no(new Error('No cargó ' + src)); document.head.appendChild(s);
  });
}
const loadImage = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

/**
 * Crea un escenario dentro de `container` (que debe tener tamaño: la capa se estira a todo el contenedor).
 * @param {HTMLElement} container
 * @param {{theme: string|object, mode?: 'auto'|'3d'|'light', degrade?: boolean, reducedMotion?: boolean, onEvent?: (name:string, data?:any)=>void}} opts
 */
export function create(container, opts = {}) {
  ensureCss();
  const root = document.createElement('div'); root.className = 'te-stage'; root.dataset.mode = 'light'; root.setAttribute('aria-hidden', 'false');
  root.style.position = 'absolute'; root.style.inset = '0'; root.style.visibility = 'hidden'; cssReady.then(() => root.style.removeProperty('visibility'));
  root.innerHTML = '<div class="te-bg"></div><div class="te-light"><canvas class="te-char" width="16" height="32"></canvas></div><canvas class="te-gl"></canvas><div class="te-fx"></div><div class="te-bubble" role="status" aria-live="polite"></div>';
  container.appendChild(root);
  const q = s => root.querySelector(s), bgEl = q('.te-bg'), lightEl = q('.te-light'), charEl = q('.te-char'), glEl = q('.te-gl'), fxEl = q('.te-fx'), bubbleEl = q('.te-bubble');
  const reduced = opts.reducedMotion ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduced) root.dataset.reduced = '1';      // la opción `reducedMotion` apaga también las animaciones CSS, no solo la media query
  const listeners = new Map();
  const emit = (n, d) => { opts.onEvent?.(n, d); (listeners.get(n) || []).forEach(f => { try { f(d); } catch { /* un oyente roto no tumba el motor */ } }); };

  const S = {
    root, mode: 'light', theme: null, tier: 'light', reducedMotion: reduced, scene: null, destroyed: false, paused: false,
    on(name, fn) { (listeners.get(name) || listeners.set(name, []).get(name)).push(fn); return () => S.off(name, fn); },
    off(name, fn) { listeners.set(name, (listeners.get(name) || []).filter(f => f !== fn)); },
  };
  let themeUrl = null, renderer = null, sound = null, particles = [], ctx2d = null, size = { w: 540, h: 960 }, fpsCap = 30;
  let raf = 0, last = 0, runUntil = 0, bubbleTimer = 0, bubbleAnchor = null, typeTimer = 0, reactTimer = 0, loopReact = null;
  let winT = 0, fpsN = 0, fpsT = 0, fpsNow = 0, slowFrames = 0, frames = 0, degraded = 0, hostImg = null, lastSkinKey = null, lightMod = null, lightOpts = {};
  const resolveTheme = rel => new URL(rel, themeUrl).href;

  // ── tema ──
  const readyTheme = (async () => {
    let t = opts.theme;
    if (typeof t === 'string') {
      themeUrl = new URL(t, location.href);
      const r = await fetch(themeUrl.href, { signal: AbortSignal.timeout?.(6000) });   // sin respuesta en 6 s: el Tap se juega sobre su degradado
      if (!r.ok) throw new Error('No cargó el tema (' + r.status + ')');
      t = await r.json();
    }
    else { themeUrl = new URL(t.__url || location.href); }
    // personajes/fondos del registro (registro.js): solo si el tema los lista; un manifiesto roto se salta
    if (Array.isArray(t.personajes) || Array.isArray(t.fondos)) {
      try { await (await import(new URL('registro.js', BASE).href)).expandirTema(t); } catch (e) { console.warn('[taps-engine] registro:', e?.message || e); }
    }
    S.theme = t;
    if (t.id) root.dataset.theme = t.id;
    if (t.css) ensureThemeCss(resolveTheme(t.css));
    if (t.font?.family) root.style.setProperty('--te-font', `'${t.font.family}'`);
    if (t.font?.src && !FONTS.has(t.font.family)) {
      FONTS.add(t.font.family);
      try { const f = new FontFace(t.font.family, `url(${resolveTheme(t.font.src)})`, { display: 'swap' }); f.load().then(ff => document.fonts.add(ff)).catch(() => {}); } catch { /* sin fuente propia se usa la del sistema */ }
    }
    if (t.palette) for (const [k, v] of Object.entries(t.palette)) if (typeof v === 'string') root.style.setProperty('--te-' + k, v);
    sound = opts.audio ? externalSound(opts.audio, t) : new Sound(t, resolveTheme);
    paintBackdrop(t.defaultWorld);
    return t;
  })();

  // ── capa ligera ──
  function paintBackdrop(world) {
    const sc = S.theme?.scenes?.[world] || S.theme?.scenes?.[S.theme?.defaultWorld]; if (!sc) return;
    root.style.setProperty('--te-sky-top', sc.sky[0]); root.style.setProperty('--te-sky-bottom', sc.sky[1]);
    root.style.setProperty('--te-ground', sc.ground || '#4a8f2a'); root.style.setProperty('--te-ground-dark', sc.groundDark || '#6b4a2b');
    root.style.setProperty('--te-sun', sc.sun === false ? '0' : '.9'); root.dataset.world = world;
    // fondos del registro con imagen: la capa ligera la usa vía CSS del tema (--te-bg-img, --te-bg-pos)
    if (sc.imagen) { root.style.setProperty('--te-bg-img', `url("${sc.imagen}")`); root.style.setProperty('--te-bg-pos', sc.posicionLigera || '50% 100%'); }
    else root.style.removeProperty('--te-bg-img');
  }
  /** Encuadre en la capa ligera: el personaje se corre de lado y cambia de tamaño (variables que lee el CSS del motor). */
  function paintShot(shot) {
    root.style.setProperty('--te-x', (50 + shot.x * 100).toFixed(1) + '%');
    root.style.setProperty('--te-s', String(shot.zoom));
  }
  function paintNudge(dx) {
    root.style.setProperty('--te-nudge', (dx * 100).toFixed(1) + '%');                       // el globo (sin animar)
    root.style.setProperty('--te-dx', Math.round(dx * (root.clientWidth || 0)) + 'px');         // el personaje (translate animado)
  }
  async function paintCharacter(spec = {}) {
    const t = S.theme, chars = t.characters || {}, id = chars[spec.host] ? spec.host : Object.keys(chars)[0]; if (!id) return;
    const key = id + '|' + (spec.item || ''); if (lastSkinKey === key) return; lastSkinKey = key;
    try {
      // `skin` es opcional: un tema dibujado por código (sin imágenes) recibe `null` y la definición del personaje en las opciones
      const [img, mod] = await Promise.all([chars[id].skin ? loadImage(resolveTheme(chars[id].skin)) : null, t.light ? import(resolveTheme(t.light)) : null]);
      hostImg = img; lightMod = mod; lightOpts = { slim: chars[id].slim, id, character: chars[id], item: spec.item, world: spec.world, theme: t };
      mod?.paintCharacter?.(charEl, img, lightOpts);
    } catch { /* sin personaje 2D se queda el fondo */ }
  }
  /** Opcional en light.js: `paintReaction(canvas, anim, opciones)` cambia la pose/cara 2D en cada reacción (también con movimiento reducido). */
  function lightPose(anim) { try { lightMod?.paintReaction?.(charEl, anim, lightOpts); } catch { /* la pose es un extra */ } }
  function lightAnim(cls, ms) {
    lightEl.classList.remove('te-celebrate', 'te-hurt', 'te-think', 'te-talk'); void lightEl.offsetWidth; if (cls && !reduced) lightEl.classList.add(cls);
    if (!cls || cls === 'te-think' || cls === 'te-talk') return; if (ms) setTimeout(() => lightEl.classList.remove(cls), ms);
  }
  function lightConfetti(colors) {
    if (reduced) return;
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('i'); p.style.setProperty('--x', (Math.random() * 100 - 50).toFixed(0) + 'vmin'); p.style.setProperty('--y', (-(25 + Math.random() * 45)).toFixed(0) + 'vmin');
      p.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg'); p.style.background = colors[i % colors.length]; p.style.animationDelay = (Math.random() * .12).toFixed(2) + 's';
      fxEl.appendChild(p); setTimeout(() => p.remove(), 1600);
    }
  }

  // ── posición del globo según el ancla del personaje (object-fit: cover) ──
  function toCss(x, y) {
    const cw = root.clientWidth || 1, ch = root.clientHeight || 1, k = Math.max(cw / size.w, ch / size.h);
    return [(cw - size.w * k) / 2 + x * k, (ch - size.h * k) / 2 + y * k];
  }
  function placeBubble() {
    if (!bubbleEl.classList.contains('on')) return;
    if (S.mode === '3d' && renderer) {
      const [ax, ay] = renderer.anchor(bubbleAnchor || 'top'), [x0, y] = toCss(ax, ay), cw = root.clientWidth || 1;
      const half = Math.min(cw / 2, (bubbleEl.offsetWidth || 120) / 2 + 8), x = Math.max(half, Math.min(cw - half, x0));   // con el personaje de lado, el globo no se sale
      bubbleEl.style.left = x + 'px'; bubbleEl.style.top = y + 'px'; bubbleEl.style.bottom = 'auto';
    }
    else { bubbleEl.style.left = ''; bubbleEl.style.top = ''; bubbleEl.style.bottom = ''; }
  }

  // ── 3D ──
  let slow = false;
  const slowMs = opts.slowMs ?? 4000;
  const slowTimer = slowMs > 0 ? setTimeout(() => { if (S.mode !== '3d' && !S.destroyed && !slow) { slow = true; fallback('el 3D tardó más de ' + slowMs + ' ms'); } }, slowMs) : 0;
  async function start3d() {
    if (S.destroyed) return;
    const t = await readyTheme; performance.mark?.('te-theme'); 
    if (opts.mode === 'light') return fallback('modo ligero pedido');
    const tier = opts.mode === '3d' ? (pickTier() === 'light' ? 'low' : pickTier()) : pickTier();
    S.tier = tier;
    if (tier === 'light') return fallback('dispositivo ligero');
    // `canvas: '2d'` = el renderizador dibuja con Canvas 2D (sin WebGL ni librerías). Sin el campo se asume WebGL, como siempre.
    const kind = t.canvas === '2d' ? '2d' : 'webgl'; S.canvas = kind;
    if (!t.renderer || (kind === 'webgl' && !t.vendor)) return fallback('el tema no trae renderizador animado');
    if (kind === 'webgl' && !webglWorks()) return fallback('WebGL no disponible');
    try {
      const cfg = TIERS[tier]; size = { w: cfg.w, h: cfg.h }; fpsCap = cfg.fps;
      const [, mod] = await Promise.all([Promise.all(Object.values(t.vendor || {}).map(v => loadScript(resolveTheme(v)))), import(resolveTheme(t.renderer))]);
      if (S.destroyed) return; performance.mark?.('te-libs'); await yieldMain();
      
      glEl.width = size.w; glEl.height = size.h; ctx2d = glEl.getContext('2d');
      const vendor = Object.fromEntries(Object.keys(t.vendor || {}).map(k => [k, globalThis[k]]));
      renderer = await mod.createRenderer({ canvas: glEl, width: size.w, height: size.h, theme: t, resolve: resolveTheme, skinview3d: globalThis.skinview3d, vendor, reducedMotion: reduced });
      if (S.destroyed) { renderer.dispose(); return; } performance.mark?.('te-renderer'); await yieldMain();
      
      if (sceneSpec) await renderer.setScene(sceneSpec);
      if (nudge) renderer.nudge?.(nudge, true);
      performance.mark?.('te-scene'); await yieldMain(); 
      renderer.play(loopReact || 'idle');
      renderer.frame(.016);
      if (slow) { renderer.dispose(); renderer = null; return; }       // llegó tarde: se queda la capa ligera
      clearTimeout(slowTimer);
      performance.mark?.('te-visible'); root.dataset.mode = '3d'; S.mode = '3d'; glEl.classList.add('on'); emit('mode', { mode: '3d', tier });
      wake(1500); loop();
    } catch (e) { renderer?.dispose?.(); renderer = null; fallback('error 3D: ' + (e?.message || e)); }
  }
  function fallback(reason) {
    console.debug('[taps-engine] modo ligero:', reason); S.mode = 'light'; root.dataset.mode = 'light'; glEl.classList.remove('on'); cancelAnimationFrame(raf); raf = 0; emit('mode', { mode: 'light', reason, tier: S.tier });
  }

  // ── bucle: tope de fps, pausa fuera de pantalla, degradación automática ──
  function wake(ms) { runUntil = Math.max(runUntil, nowMs() + ms); if (!raf && renderer && !S.paused) loop(); }
  function loop() { if (raf || S.destroyed || S.paused || !renderer) return; last = nowMs(); winT = 0; frames = 0; slowFrames = 0; raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0; if (S.destroyed || S.paused || !renderer) return;
    if (reduced && now > runUntil) return;                       // movimiento reducido: solo se dibuja un instante tras cada cambio
    raf = requestAnimationFrame(tick);
    const el = now - last, min = 1000 / fpsCap; if (el < min - 2) return;
    last = now - (el % min); const dt = Math.min(.1, el / 1000), t0 = nowMs();
    renderer.frame(dt);
    if (particles.length) drawParticles(ctx2d, particles, dt, size.w / 540, S.theme.particles?.shape);
    placeBubble();
    fpsN++; if (now - fpsT >= 1000) { fpsNow = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; root.dataset.fps = String(fpsNow); }
    // medición: si en la ventana de 90 fotogramas el promedio queda muy por debajo del tope, se baja la resolución y luego se pasa a ligero
    if (!winT) winT = now; frames++; if (el > min * 2.1 || nowMs() - t0 > min * 1.6) slowFrames++;
    const span = now - winT;
    if (opts.degrade !== false && (frames >= 90 || (span >= 3000 && frames >= 6))) { const bad = slowFrames / frames > .55 || span / frames > min * 2; frames = 0; slowFrames = 0; winT = 0; if (bad) degrade(); }
  }
  function degrade() {
    degraded++; console.debug('[taps-engine] rendimiento bajo, paso', degraded);
    if (degraded === 1 && size.w > 360) { size = { w: 360, h: 640 }; renderer.setSize(size.w, size.h); fpsCap = Math.min(fpsCap, 24); emit('degrade', { step: 'resolucion' }); }
    else { renderer.dispose(); renderer = null; fallback('rendimiento bajo'); emit('degrade', { step: 'ligero' }); }
  }
  const onVis = () => { if (document.hidden) S.pause('tab'); else S.resume('tab'); };
  document.addEventListener('visibilitychange', onVis);
  const unlock = () => { if (sound?.unlock()) sound.warm(['damage', 'hit', 'pop']); };
  window.addEventListener('pointerdown', unlock, { passive: true }); window.addEventListener('keydown', unlock, { passive: true });

  // ── API pública ──
  S.ready = readyTheme.then(() => undefined);
  /** Se cumple cuando el 3D ya se ve o se decidió quedarse en modo ligero. */
  S.ready3d = readyTheme.then(() => start3d()).then(() => S.mode);

  /**
   * Resuelve las claves de la escena contra el tema: el encuadre (`shot`) pasa a ser un objeto {x, zoom, yaw, height, flip}
   * y los campos que el tema no conoce se ignoran (así un Tap viejo o un tema sin encuadres sigue igual que antes).
   */
  function resolveScene(spec = {}) {
    const t = S.theme || {}, shots = t.shots || {}, props = t.props || {};
    const shotKey = shots[spec.shot] ? spec.shot : null;
    return {
      world: spec.world || t.defaultWorld, host: spec.host, item: spec.item || null,
      props: props[spec.props] ? spec.props : null, shotKey,
      shot: { x: 0, zoom: 1, yaw: 0, height: 0, flip: false, ...(shotKey ? shots[shotKey] : {}) },
      enter: (t.enters || []).includes(spec.enter) ? spec.enter : null,
    };
  }
  let sceneSpec = null, sceneTok = 0, nudge = 0, enterTimer = 0;

  /**
   * Cambia mundo / personaje / objeto / encuadre / decorado. En modo ligero cambia fondo, posición y personaje 2D.
   * Si el lugar cambia, el escenario se oculta al instante (se ve el fondo plano del nuevo mundo) y aparece con un fundido
   * corto cuando el nuevo mundo ya está dibujado; con movimiento reducido el cambio es directo.
   */
  S.setScene = async function setScene(spec = {}) {
    await readyTheme;
    const tok = ++sceneTok, prev = sceneSpec, next = resolveScene(spec);
    const moved = !prev || prev.world !== next.world || prev.host !== next.host || prev.shotKey !== next.shotKey || prev.props !== next.props;
    S.scene = { ...spec }; sceneSpec = next;
    if (moved && prev && !reduced) root.dataset.cambio = '1';
    paintBackdrop(next.world); paintShot(next.shot);
    if (moved && next.enter && !reduced) {
      clearTimeout(enterTimer); root.dataset.entra = next.enter; enterTimer = setTimeout(() => delete root.dataset.entra, 900);
    }
    const jobs = [paintCharacter(spec)];
    if (renderer) jobs.push(renderer.setScene({ ...next, enter: moved && !reduced ? next.enter : null }));
    try { await Promise.all(jobs); }
    finally {
      if (tok === sceneTok) {
        winT = 0; frames = 0; slowFrames = 0;
        if (renderer && root.dataset.cambio) try { renderer.frame(0.016); } catch { /* se dibuja en el siguiente fotograma */ }
        if (root.dataset.cambio) requestAnimationFrame(() => { if (tok === sceneTok) delete root.dataset.cambio; });
        wake(1500);
      }
    }
  };

  // ── objetos para explicar (themes/<id>/visuals.js, se pide la primera vez que hace falta) ──
  let visualsMod = null, visual = null, visualTok = null;
  const loadVisuals = () => {
    const def = S.theme?.visuals; if (!def?.module) return Promise.resolve(null);
    return (visualsMod ??= import(resolveTheme(def.module)).catch(e => { visualsMod = null; throw e; }));
  };
  function setNudge(dx) { nudge = dx; paintNudge(dx); renderer?.nudge?.(dx, reduced); wake(900); }
  /** Monta el objeto `v` (de createVisual) en un lienzo dentro de `el`: anima su acción, tocar repite, arrastrar la recorre. */
  function mountVisual(v, el) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    cv.className = 'te-visual'; cv.setAttribute('aria-hidden', 'true');   // la descripción la lleva el contenedor (S.visual la devuelve)
    el.appendChild(cv);
    let w = 1, h = 1, t = reduced ? v.duration : 0, raf = 0, last = 0, dead = false, down = null;
    const draw = () => { if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); try { v.draw(ctx, w, h, Math.min(t, v.duration)); } catch { /* un objeto roto no tumba el Tap */ } };
    const tick = now => { raf = 0; if (dead) return; t += last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; draw(); if (t < v.duration) raf = requestAnimationFrame(tick); };
    const play = () => { cancelAnimationFrame(raf); raf = 0; last = 0; if (reduced) { t = v.duration; draw(); return; } t = 0; raf = requestAnimationFrame(tick); };
    const size = () => { const r = el.getBoundingClientRect(); w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height)); cv.width = w * dpr; cv.height = h * dpr; draw(); };
    const at = e => { const r = cv.getBoundingClientRect(); return [clamp01((e.clientX - r.left) / (r.width || 1)), clamp01((e.clientY - r.top) / (r.height || 1))]; };
    const onDown = e => { down = { x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch { /* sin captura */ } emit('visual', { type: 'touch' }); };
    const onMove = e => {
      if (!down) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return;
      down.moved = true; cancelAnimationFrame(raf); raf = 0; t = v.duration;
      try { v.drag?.(...at(e)); } catch { /* arrastre opcional */ } draw(); emit('visual', { type: 'drag' });
    };
    const onUp = e => { const d = down; down = null; if (!d || d.moved) return; let again = true; try { again = v.tap ? v.tap(...at(e)) !== false : true; } catch { /* toque opcional */ } if (again) play(); else draw(); sound?.play('pop'); };
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', () => { down = null; });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null; ro?.observe(el);
    size(); play();
    return { replay: play, destroy() { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); cv.remove(); } };
  }
  /**
   * Muestra un objeto para explicar (`{objeto, accion, valor?}`, catálogo en theme.visuals.objects) dentro de `el`.
   * `side` ('izq' | 'der') = lado donde la app puso el objeto: el personaje se corre al otro lado para hacerle espacio.
   * Devuelve la descripción del objeto (texto para lectores de pantalla: la app la pone en el aria-label de su botón, porque
   * dentro de un botón el lienzo es solo presentación) o false si el tema no tiene ese objeto (la explicación queda en texto).
   */
  S.visual = async function showVisual(spec, el, o = {}) {
    S.clearVisual();
    if (!spec?.objeto || !el) return false;
    const tok = visualTok = {};
    let mod;
    try { await readyTheme; mod = await loadVisuals(); } catch { return false; }
    if (visualTok !== tok || !mod?.createVisual || !el.isConnected) return false;
    let v = null; try { v = mod.createVisual(spec, { reducedMotion: reduced, theme: S.theme }); } catch { v = null; }
    if (!v) return false;
    visual = mountVisual(v, el);
    // el personaje termina en la mitad libre (a un 20 % del centro), venga del encuadre que venga
    if (o.side) setNudge((o.side === 'izq' ? 0.2 : -0.2) - (sceneSpec?.shot.x || 0));
    return v.label || ' ';
  };
  S.replayVisual = () => visual?.replay();
  S.clearVisual = () => { visualTok = null; visual?.destroy(); visual = null; if (nudge) setNudge(0); };
  /** Pide en reposo el módulo de objetos del tema (lo llama la app cuando viene una pregunta que lo usa). */
  S.preloadVisuals = () => readyTheme.then(loadVisuals).then(() => undefined, () => undefined);
  /** Precalienta el siguiente escenario sin mostrarlo (se llama en reposo mientras el usuario responde). */
  S.preload = async function preload(spec = {}) { await readyTheme; try { await renderer?.preload?.(resolveScene(spec)); } catch { /* es solo una optimización */ } };

  /**
   * Voz de los personajes (opcional, voz/voz.js → paraMotor()): `{ hablar(texto, personaje), callar() }`. Con voz, `say()`
   * también lo dice en voz alta con el perfil del personaje en escena. `null` la quita.
   */
  let voice = null, voiceTurn = 0;
  S.setVoz = function setVoz(v) { voice?.callar?.(); voice = v && typeof v.hablar === 'function' ? v : null; };
  function speak(text) {
    const turn = ++voiceTurn, talk = !reduced && renderer;
    if (talk) { renderer.play('talk'); wake(800); }
    Promise.resolve(voice.hablar(text, S.scene?.host)).catch(() => {}).finally(() => { if (talk && turn === voiceTurn && renderer && !S.destroyed) { renderer.play(loopReact || 'idle'); wake(400); } });
  }

  /**
   * Globo de diálogo sobre la cabeza. `text` vacío lo oculta (y calla la voz).
   * `voz: false` = solo globo; `globo: false` = solo voz (p. ej. la pregunta, que ya está escrita en la tarjeta).
   */
  S.say = function say(text, o = {}) {
    clearInterval(typeTimer); clearTimeout(bubbleTimer);
    if (!text) { voiceTurn++; voice?.callar?.(); bubbleEl.classList.remove('on'); return; }
    const spoken = !!voice && o.voz !== false;
    if (spoken) speak(String(text));
    if (o.globo === false) return;
    bubbleAnchor = o.anchor || 'top'; bubbleEl.classList.add('on'); bubbleEl.dataset.tone = o.tone || '';
    const full = String(text); let n = 0;
    if (reduced || full.length < 4) bubbleEl.textContent = full;
    else { bubbleEl.textContent = ''; typeTimer = setInterval(() => { n += 2; bubbleEl.textContent = full.slice(0, n); if (!spoken) sound?.play('blip'); if (n >= full.length) clearInterval(typeTimer); }, 28); }
    placeBubble();
    if (o.hold !== true) bubbleTimer = setTimeout(() => bubbleEl.classList.remove('on'), o.ms ?? 1400 + full.length * 45);
  };

  /** Dispara una reacción definida en theme.reactions: animación + efecto + sonido + partículas + frase. */
  S.react = function react(name, o = {}) {
    const t = S.theme; const def = t?.reactions?.[name]; if (!def) return;
    clearTimeout(reactTimer); voiceTurn++;                     // una reacción manda sobre la boca que habla
    const anim = reduced ? (def.reducedAnim || 'idle') : def.anim;
    if (renderer) { renderer.play(anim); (def.fx || []).forEach(f => !reduced && renderer.fx(f)); wake(Math.max(1500, (def.duration || 0) * 1000 + 300)); }
    else { lightAnim({ celebrate: 'te-celebrate', hurt: 'te-hurt', think: 'te-think', talk: 'te-talk' }[def.anim] || '', (def.duration || 1.2) * 1000); lightPose(anim); }
    (def.sfx || []).forEach(n => sound?.play(n));
    if (def.particles && !reduced) {
      const colors = t.palette?.[def.particles] || t.palette?.confetti || ['#fff'];
      if (renderer) { const [ax, ay] = renderer.anchor(def.particles === 'confetti' ? 'top' : 'chest'); burst(particles, ax, ay, def.particles, Array.isArray(colors) ? colors : [colors]); }
      else if (def.particles === 'confetti') lightConfetti(Array.isArray(colors) ? colors : [colors]);
    }
    if (o.say !== false && def.say?.length) S.say(typeof o.say === 'string' ? o.say : pick(def.say), { tone: def.tone || name });
    loopReact = def.duration ? null : name;
    if (def.then && def.duration) reactTimer = setTimeout(() => S.react(def.then, { say: false }), def.duration * 1000);
  };

  S.pause = function pause(why) { S.paused = true; cancelAnimationFrame(raf); raf = 0; root.dataset.paused = why || '1'; if (sound?.ac?.state === 'running') sound.ac.suspend().catch(() => {}); };
  S.resume = function resume() { if (!S.paused && raf) return; S.paused = false; delete root.dataset.paused; if (sound?.ac?.state === 'suspended' && !document.hidden) sound.ac.resume().catch(() => {}); if (renderer) { wake(300); loop(); } };
  S.setMuted = function setMuted(m) { sound?.setMuted(m); readyTheme.then(() => sound?.setMuted(m)); S.muted = !!m; };
  /** Mueve el escenario entero a otro contenedor (el feed usa UN escenario para todos los Taps). */
  S.attachTo = function attachTo(el) { if (root.parentElement !== el) { S.clearVisual(); el.appendChild(root); } if (renderer) wake(500); };
  S.sfx = name => sound?.play(name);
  S.destroy = function destroy() {
    S.clearVisual(); clearTimeout(enterTimer);
    S.destroyed = true; voice?.callar?.(); voice = null; clearTimeout(slowTimer); cancelAnimationFrame(raf); clearInterval(typeTimer); clearTimeout(bubbleTimer); clearTimeout(reactTimer);
    document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    try { renderer?.dispose(); } catch { /* ya liberado */ } renderer = null; try { sound?.ac?.close(); } catch { /* sin audio */ } root.remove();
  };
  S.snapshot = () => (S.mode === '3d' ? glEl.toDataURL('image/png') : null);
  S.stats = () => ({ mode: S.mode, tier: S.tier, size, fpsCap, fps: fpsNow, degraded, canvas: S.canvas || null });
  return S;
}

export default { create, pickTier, TIERS, resolveSound, SYNTH_NAMES };
