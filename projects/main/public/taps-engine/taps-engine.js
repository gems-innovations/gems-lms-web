// Taps Engine · motor de escenarios en tiempo real, sin framework y sin saber nada de quizzes ni del LMS.
//
//   import { create } from './taps-engine.js';
//   const stage = create(contenedor, { theme: '/taps-engine/themes/minecraft/theme.json' });
//   await stage.ready;                                   // el tema cargó y se pintó la versión ligera
//   await stage.setScene({ world: 'cueva', host: 'sofi', item: 'pick', shot: 'izquierda', enter: 'camina', props: 'circuito' });
//   stage.react('ask');  stage.say('¿Listo?');  stage.react('celebrate');
//   await stage.visual({ objeto: 'piston', accion: 'bloquea' }, hueco, { side: 'der' });   // objeto para explicar (tocar / arrastrar)
//   modo cine (v10): setScene({ …, camara: 'contrapicado', hora: 'tarde', clima: 'lluvia', fauna: 'ovejas', transicion: 'barrido' })
//   stage.plano(2, semilla);  await stage.escena({ tipo: 'codigo', lineas: ['si llueve:'] }, hueco, { side: 'izq' });
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
// ───────────────────────── encaje en la zona visible (v11) ─────────────────────────
/** Banda vertical del personaje (fracciones del alto del lienzo 9:16) si el renderizador aún no dio sus anclas. */
export const BANDA_DEFECTO = Object.freeze({ arriba: 0.15, abajo: 0.68 });
/**
 * Alto máximo de la banda (fracción del lienzo). Solo cuenta en los planos cerrados (primer plano, plano detalle de una
 * variante): ahí el personaje mide más que esto a propósito y basta que se vean la cabeza, el pecho y parte del torso. En los
 * demás planos la banda (cabeza → pies) mide entre 0,1 y 0,56 del lienzo y este tope no la toca.
 */
const ALTO_MAX = 0.58;
const r4 = x => +x.toFixed(4) || 0;
/**
 * Encaje del personaje en la zona que se ve (puro, para poder probarlo). `banda` = {arriba, abajo}: lo que ocupa el personaje
 * tal como se diseñó; `zona` = {arriba, abajo}: lo que queda a la vista entre la barra y la tarjeta de la pregunta (las dos en
 * fracciones del mismo alto). Devuelve {s, ty}: y' = s·y + ty (y en x, la misma escala s alrededor del personaje).
 * Continuo: si la banda ya cabe, identidad (escritorio, tablet con sitio); si se sale, primero se achica lo justo (nunca por
 * debajo de `sMin`) y luego se desplaza lo mínimo para quedar dentro. Un desborde pequeño = un movimiento pequeño. Si ni
 * achicada cabe, manda la cabeza (arriba de la zona) y lo que sobra queda bajo la tarjeta.
 */
export function encajar(banda, zona, sMin = 0.5) {
  const a = +banda?.arriba, b = +banda?.abajo, t = +zona?.arriba, u = +zona?.abajo;
  if (!(b > a) || !(u > t)) return { s: 1, ty: 0 };
  const s = Math.max(sMin, Math.min(1, (u - t) / (b - a))), alto = s * (b - a);
  const na = alto >= u - t ? t : Math.min(Math.max(s * a, t), u - alto);   // arriba nuevo: lo mínimo para quedar dentro
  return { s: r4(s), ty: r4(na - s * a) };
}
let webglOk = null;                                                  // v12: se prueba una sola vez (cada prueba crea un contexto)
function webglWorks() { return (webglOk ??= probarWebgl()); }
function probarWebgl() {
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
function ensureThemeCss(href, onLoad) {
  if (typeof document === 'undefined') return;
  const old = document.querySelector(`link[data-te-theme="${href}"]`);
  // load o error, una sola vez y quitando los dos oyentes: sin hoja del tema también se reencaja y no queda nada colgado
  const once = el => { const fin = () => { el.removeEventListener('load', fin); el.removeEventListener('error', fin); el.dataset.teListo = '1'; onLoad?.(); };
    el.addEventListener('load', fin); el.addEventListener('error', fin); };
  if (old) { if (!old.dataset.teListo) once(old); return; }
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.teTheme = href; once(l); document.head.appendChild(l);
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
  root.innerHTML = '<div class="te-bg"></div><div class="te-light"><canvas class="te-char" width="16" height="32"></canvas></div><div class="te-clima"></div><canvas class="te-gl"></canvas><div class="te-fx"></div><div class="te-bubble" role="status" aria-live="polite"></div>';
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
  let fitN = 0, raf = 0, last = 0, runUntil = 0, bubbleTimer = 0, bubbleAnchor = null, typeTimer = 0, reactTimer = 0, loopReact = null;
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
    if (t.css) ensureThemeCss(resolveTheme(t.css), () => applyFit(true));   // la hoja del tema cambia la caja de la capa ligera: se reencaja
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
  /** Fondo de la capa ligera: colores del mundo y, si el lugar la admite, los de la hora del día (theme.cine.horas). */
  function paintBackdrop(world, hora = null) {
    const sc = S.theme?.scenes?.[world] || S.theme?.scenes?.[S.theme?.defaultWorld]; if (!sc) return;
    const h = hora ? S.theme?.cine?.horas?.[hora] : null, sky = h?.sky || sc.sky;
    root.style.setProperty('--te-sky-top', sky[0]); root.style.setProperty('--te-sky-bottom', sky[1]);
    root.style.setProperty('--te-ground', sc.ground || '#4a8f2a'); root.style.setProperty('--te-ground-dark', sc.groundDark || '#6b4a2b');
    root.style.setProperty('--te-sun', sc.sun === false || h?.sun === false ? '0' : '.9'); root.dataset.world = world;
    if (hora) root.dataset.hora = hora; else delete root.dataset.hora;
    // fondos del registro con imagen: la capa ligera la usa vía CSS del tema (--te-bg-img, --te-bg-pos); la hora va como velo encima
    if (sc.imagen) { root.style.setProperty('--te-bg-img', `url("${sc.imagen}")`); root.style.setProperty('--te-bg-pos', sc.posicionLigera || '50% 100%'); }
    else root.style.removeProperty('--te-bg-img');
  }
  /**
   * Encuadre en la capa ligera: el personaje se corre de lado y cambia de tamaño (variables que lee el CSS del motor). El plano
   * de cámara (theme.cine.planos[k].ligero = { s, suelo }) también agranda o achica al personaje y sube o baja el horizonte.
   */
  function paintShot(shot, plano = null) {
    const lg = plano?.ligero || {};
    root.style.setProperty('--te-x', (50 + shot.x * 100).toFixed(1) + '%');
    root.style.setProperty('--te-s', String(+(shot.zoom * (lg.s ?? 1)).toFixed(3)));
    if (lg.suelo != null) root.style.setProperty('--te-suelo', lg.suelo + '%'); else root.style.removeProperty('--te-suelo');
  }
  /**
   * Zona segura (v11): la app dice cuánto tapan arriba (barra, progreso) y abajo (tarjeta de la pregunta) y el personaje se
   * encaja en lo que queda a la vista. Capa ligera: se mide su caja de maquetación (offsetTop/offsetHeight, sin transformaciones)
   * y se corre y achica desde los pies con variables CSS (--te-f-y, --te-f-s); el piso sube con él. 3D/2D: el renderizador
   * aplica el mismo encaje a su imagen (renderer.encuadre). La banda sale de sus anclas «crudas» (anchor(nombre, true): sin
   * encaje y sin saltos de animación), así sigue a cada plano y a cada personaje sin datos a mano y sin realimentarse.
   */
  let safe = null, fit3d = { s: 1, ty: 0 }, banda = null, gY = '';
  function fitLight() {
    const ch = root.clientHeight;
    if (!safe || !ch || !lightEl.offsetHeight) { for (const v of ['--te-f-y', '--te-f-s', '--te-globo-y']) root.style.removeProperty(v); return; }
    // la variante del plano (--te-k, data-plano) ya agranda o achica al personaje desde los pies: cuenta en su alto
    const kp = parseFloat(getComputedStyle(root).getPropertyValue('--te-k')) || 1;
    const lb = lightEl.offsetTop + lightEl.offsetHeight, lt = lb - lightEl.offsetHeight * kp;
    const f = encajar({ arriba: lt / ch, abajo: lb / ch }, { arriba: (safe.top + 4) / ch, abajo: (ch - safe.bottom - 8) / ch });
    const pies = f.s * lb + f.ty * ch, cabeza = pies - f.s * (lb - lt);
    root.style.setProperty('--te-f-y', (pies - lb).toFixed(1) + 'px');
    root.style.setProperty('--te-f-s', String(f.s));
    root.style.setProperty('--te-globo-y', Math.max(cabeza - 4, safe.top + 48).toFixed(1) + 'px');
  }
  /** Banda del personaje en el lienzo sin encaje (fracciones del alto). En un plano cerrado se recorta a ALTO_MAX (cabeza, pecho y parte del torso). */
  function medirBanda(rr) {
    try {
      const top = rr.anchor('top', true)?.[1], feet = rr.anchor('feet', true)?.[1];
      if (!Number.isFinite(top) || !Number.isFinite(feet) || feet <= top) return null;
      const a = top / size.h; return { arriba: a, abajo: Math.min(feet / size.h, a + ALTO_MAX) };
    } catch { return null; }
  }
  /** Encaje del lienzo animado: `now` = sin viaje (cambio de tamaño, primer cuadro). */
  function fit3dNow(now = false, rr = renderer || r) {
    if (!rr?.encuadre) return;
    const cw = root.clientWidth, ch = root.clientHeight, W = size.w, H = size.h;
    let f = { s: 1, ty: 0 }, k = 1, b = null, z = null;
    if (safe && cw && ch) {
      b = banda = medirBanda(rr) || banda || BANDA_DEFECTO;
      k = Math.max(cw / W, ch / H); const oy = (ch - H * k) / 2;
      z = { arriba: (safe.top + 4 - oy) / (H * k), abajo: (ch - safe.bottom - 8 - oy) / (H * k) };
      f = encajar(b, z);
    }
    // histéresis: la órbita, el travelling o la respiración del plano mueven la banda despacio. Mientras con el encaje actual
    // siga a la vista, los cambios chicos se ignoran (el cuadro no «respira»); uno grande o salirse de la zona sí reencaja.
    if (!now) {
      const igual = Math.abs(f.s - fit3d.s) < 0.004 && Math.abs(f.ty - fit3d.ty) < 0.004;
      const sigueDentro = !!b && !!z && fit3d.s * b.arriba + fit3d.ty >= z.arriba - 0.006 && fit3d.s * b.abajo + fit3d.ty <= z.abajo + 0.006;
      if (igual || (sigueDentro && Math.abs(f.s - fit3d.s) < 0.03 && Math.abs(f.ty - fit3d.ty) < 0.03)) return;
    }
    fit3d = f;
    try { rr.encuadre(f, now || reduced); } catch { /* el encaje es un extra */ }
    const g = (b ? (f.s * b.abajo + f.ty - b.abajo) * H * k : 0).toFixed(1) + 'px';   // fondo CSS que sigue al 3D (tema aventura)
    if (g !== gY) { gY = g; root.style.setProperty('--te-g-y', g); }
    if (renderer) wake(1600);
  }
  function applyFit(now = false) { if (S.destroyed) return; fitLight(); fit3dNow(now); }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => applyFit(true)) : null; ro?.observe(root);
  cssReady.then(() => applyFit(true));                              // sin la hoja del motor la capa ligera aún no tiene caja
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
  let slowTimer = 0;
  /** v12: (re)programa la espera máxima del 3D. Un escenario precargado en pausa la arranca al verse (sin 15 s a ciegas). */
  function setSlow(ms) {
    clearTimeout(slowTimer); slowTimer = 0;
    if (!(ms >= 0) || S.mode === '3d' || S.destroyed || slow) return;
    slowTimer = setTimeout(() => { if (S.mode !== '3d' && !S.destroyed && !slow) { slow = true; fallback('el 3D tardó más de ' + slowMs + ' ms'); } }, ms);
  }
  if (slowMs > 0) setSlow(slowMs);
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
      // El renderizador queda en una variable local hasta que se ve: así, si el 3D llega tarde (pasó a ligero) o falla, el
      // bucle (wake/loop/tick, que solo corre con `renderer`) nunca arranca en segundo plano gastando CPU sin verse.
      r = await mod.createRenderer({ canvas: glEl, width: size.w, height: size.h, theme: t, resolve: resolveTheme, skinview3d: globalThis.skinview3d, vendor, reducedMotion: reduced });
      if (S.destroyed || slow) { r.dispose(); r = null; return; } performance.mark?.('te-renderer'); await yieldMain();

      let shown = null;
      while (sceneSpec && shown !== sceneSpec) { shown = sceneSpec; await r.setScene(sceneSpec); if (S.destroyed || slow) { r.dispose(); r = null; return; } }   // la última escena pedida mientras cargaba
      if (planoN) r.plano?.(planoN, planoSeed);
      if (nudge) r.nudge?.(nudge, true);
      performance.mark?.('te-scene'); await yieldMain();
      if (S.destroyed || slow) { r.dispose(); r = null; return; }      // llegó tarde: se queda la capa ligera
      r.play(loopReact || 'idle');
      r.frame(.016); fit3dNow(true, r); r.frame(.016);                 // ya encajado en la zona visible desde el primer cuadro
      clearTimeout(slowTimer);
      morphLight(r);                                                   // la capa ligera se va hacia donde aparece el 3D (sin salto)
      renderer = r; r = null;
      performance.mark?.('te-visible'); root.dataset.mode = '3d'; S.mode = '3d'; glEl.classList.add('on'); emit('mode', { mode: '3d', tier });
      wake(1500); loop();
    } catch (e) { (renderer || r)?.dispose?.(); renderer = null; r = null; fallback('error 3D: ' + (e?.message || e)); }
  }
  let r = null;                                                     // renderizador en preparación (aún no visible)
  /**
   * v12: al llegar el 3D, la capa ligera viaja (transform desde los pies) a la caja que ocupa el personaje 3D mientras se
   * desvanece (CSS, 320 ms): el cambio se lee como un fundido en el mismo sitio y no como un salto. Con movimiento reducido no.
   */
  function morphLight(rr) {
    try {
      if (reduced || !lightEl.offsetHeight) return;
      const rb = root.getBoundingClientRect(), b = lightEl.getBoundingClientRect(); if (!b.height || !rb.height) return;
      const [x, top] = toCss(...rr.anchor('top')), [, pies] = toCss(...rr.anchor('feet'));
      const lt = b.top - rb.top, lp = b.bottom - rb.top, lx = (b.left + b.right) / 2 - rb.left, s = (pies - top) / (lp - lt);
      if (![x, top, pies, s].every(Number.isFinite) || s < .3 || s > 3) return;
      lightEl.style.transformOrigin = '50% 100%';
      lightEl.style.transform = `translate(${(x - lx).toFixed(1)}px, ${(pies - lp).toFixed(1)}px) scale(${s.toFixed(3)})`;
    } catch { /* el viaje es un extra */ }
  }
  function fallback(reason) {
    lightEl.style.removeProperty('transform'); lightEl.style.removeProperty('transform-origin');
    console.debug('[taps-engine] modo ligero:', reason); S.mode = 'light'; root.dataset.mode = 'light'; glEl.classList.remove('on'); cancelAnimationFrame(raf); raf = 0;
    // en modo ligero el lienzo animado no se ve: se libera (contexto WebGL incluido) y no vuelve a dibujar
    if (renderer) { try { renderer.dispose(); } catch { /* ya liberado */ } renderer = null; }
    emit('mode', { mode: 'light', reason, tier: S.tier });
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
    if ((safe || fit3d.s !== 1 || fit3d.ty) && ++fitN % 3 === 0) fit3dNow();     // el encaje sigue al plano (la cámara viaja ~1,5 s)
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
    if (degraded === 1 && size.w > 360) { size = { w: 360, h: 640 }; renderer.setSize(size.w, size.h); fit3dNow(true); fpsCap = Math.min(fpsCap, 24); emit('degrade', { step: 'resolucion' }); }
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
    const t = S.theme || {}, shots = t.shots || {}, props = t.props || {}, cine = t.cine || {};
    const shotKey = shots[spec.shot] ? spec.shot : null, world = spec.world || t.defaultWorld;
    // modo cine (opcional, theme.cine): plano de cámara, hora del día, clima, fauna de fondo y transición al llegar.
    // Lo que el tema no conoce, o que ese mundo no admite (una cueva no tiene hora), se ignora.
    const camara = cine.planos?.[spec.camara] ? spec.camara : null;
    const enMundo = (lista, k) => !!k && Array.isArray(lista?.[k]) && lista[k].includes(world);
    return {
      world, host: spec.host, item: spec.item || null,
      props: props[spec.props] ? spec.props : null, shotKey,
      shot: { x: 0, zoom: 1, yaw: 0, height: 0, flip: false, ...(shotKey ? shots[shotKey] : {}) },
      enter: (t.enters || []).includes(spec.enter) ? spec.enter : null,
      camara, plano: camara ? { ...cine.planos[camara] } : null,
      hora: cine.horas?.[spec.hora] && (cine.horasMundos || []).includes(world) ? spec.hora : null,
      clima: enMundo(cine.climas, spec.clima) ? spec.clima : null,
      fauna: enMundo(cine.fauna, spec.fauna) ? spec.fauna : null,
      transicion: (cine.transiciones || []).includes(spec.transicion) ? spec.transicion : null,
    };
  }
  /** Lo que define el «lugar»: si cambia, hay transición (corte, barrido, zoom o fundido). */
  const placeKey = s => [s.world, s.host, s.shotKey, s.props, s.camara, s.hora, s.clima, s.fauna].join('|');
  let sceneSpec = null, sceneTok = 0, nudge = 0, nudgeBy = null, enterTimer = 0, revealTimer = 0, planoN = 0, planoSeed = 0;

  /**
   * Cambia mundo / personaje / objeto / encuadre / decorado. En modo ligero cambia fondo, posición y personaje 2D.
   * Si el lugar cambia, el escenario se oculta al instante (se ve el fondo plano del nuevo mundo) y aparece con un fundido
   * corto cuando el nuevo mundo ya está dibujado; con movimiento reducido el cambio es directo.
   */
  S.setScene = async function setScene(spec = {}) {
    await readyTheme;
    const tok = ++sceneTok, prev = sceneSpec, next = resolveScene(spec);
    const moved = !prev || placeKey(prev) !== placeKey(next);
    S.scene = { ...spec }; sceneSpec = next;
    const tipo = next.transicion || 'fundido';
    if (moved) { planoN = 0; planoSeed = 0; delete root.dataset.plano; }             // lugar nuevo: vuelve al plano base del Tap
    if (moved && prev && !reduced) { clearTimeout(revealTimer); delete root.dataset.revela; root.dataset.cambio = tipo; }
    paintBackdrop(next.world, next.hora); paintShot(next.shot, next.plano); fitLight();
    for (const k of ['camara', 'clima', 'fauna']) { if (next[k]) root.dataset[k] = next[k]; else delete root.dataset[k]; }
    if (moved && next.enter && !reduced) {
      clearTimeout(enterTimer); root.dataset.entra = next.enter; enterTimer = setTimeout(() => delete root.dataset.entra, 900);
    }
    const jobs = [paintCharacter(spec)];
    if (renderer) jobs.push(renderer.setScene({ ...next, enter: moved && !reduced ? next.enter : null }));
    // red lenta: si el lugar nuevo tarda (texturas, skin), el escenario no se queda tapado; se destapa a los 2,5 s igual
    const safety = root.dataset.cambio ? setTimeout(() => { if (tok === sceneTok && root.dataset.cambio) reveal(tipo); }, 2500) : 0;
    try { await Promise.all(jobs); }
    finally {
      clearTimeout(safety);
      if (tok === sceneTok) {
        winT = 0; frames = 0; slowFrames = 0;
        if (renderer && root.dataset.cambio) try { renderer.frame(0.016); } catch { /* se dibuja en el siguiente fotograma */ }
        // lugar nuevo: el encaje se aplica sin viaje y se dibuja otro cuadro ANTES de destaparlo (no se desliza tras el fundido)
        if (renderer && (safe || fit3d.s !== 1 || fit3d.ty)) try { if (!root.dataset.cambio) renderer.frame(0); fit3dNow(!!root.dataset.cambio); if (root.dataset.cambio) renderer.frame(0); } catch { /* el encaje llega en el bucle */ }
        if (root.dataset.cambio) requestAnimationFrame(() => { if (tok === sceneTok) reveal(tipo); });
        wake(1500);
      }
    }
  };
  /**
   * Transición de cambio de escena (el escenario ya está dibujado en su lugar nuevo): `corte` aparece de golpe con un destello
   * de un instante, `fundido` vuelve en 280 ms, `zoom` entra desde un acercamiento fuerte y `barrido` destapa de lado a lado con
   * una franja del color del tema. Solo CSS sobre capas ya pintadas (compuesto en la GPU); con movimiento reducido no se llama.
   */
  function reveal(tipo) {
    delete root.dataset.cambio;
    root.dataset.revela = tipo;
    revealTimer = setTimeout(() => delete root.dataset.revela, 700);
  }
  /**
   * Pequeño cambio de plano entre preguntas (sin cambiar de lugar): `n` = número de pregunta (0 = plano base del Tap) y `seed`
   * un número estable del Tap, así cada Tap recorre sus variantes en otro orden. Determinista. Con movimiento reducido no se mueve
   * la cámara (se queda el plano base).
   */
  S.plano = function plano(n = 0, seed = 0) {
    if (reduced) return;
    planoN = n | 0; planoSeed = seed | 0;
    const v = planoN === 0 ? 0 : 1 + ((planoSeed + planoN) % 3);
    if (v) root.dataset.plano = String(v); else delete root.dataset.plano;
    fitLight();                                                       // la variante cambia el tamaño del personaje ligero (--te-k)
    try { renderer?.plano?.(planoN, planoSeed); } catch { /* el plano es un extra */ }
    wake(2200);
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
    S.clearEscena();
    visual = mountVisual(v, el);
    // el personaje termina en la mitad libre (a un 20 % del centro), venga del encuadre que venga
    if (o.side) { nudgeBy = 'visual'; setNudge((o.side === 'izq' ? 0.2 : -0.2) - (sceneSpec?.shot.x || 0)); }
    return v.label || ' ';
  };
  S.replayVisual = () => visual?.replay();
  S.clearVisual = () => { visualTok = null; visual?.destroy(); visual = null; if (nudgeBy === 'visual') { nudgeBy = null; if (nudge) setNudge(0); } };

  // ── escena de la pregunta (escena.js, se pide la primera vez): algo de lo que se pregunta, a la vista mientras se piensa ──
  let escenaMod = null, escena = null, escenaTok = null;
  const loadEscena = () => (escenaMod ??= import(new URL('escena.js', BASE).href).catch(e => { escenaMod = null; throw e; }));
  /**
   * Muestra dentro de `el` un elemento de la PREGUNTA (no de la respuesta): un fragmento de código, una operación, una serie,
   * o un objeto / diagrama del tema (theme.escenas). `side` = lado donde la app puso la tarjeta (el personaje se corre al otro).
   * Devuelve una descripción corta o false si el tema no sabe dibujarlo (la app oculta el hueco).
   */
  S.escena = async function showEscena(spec, el, o = {}) {
    S.clearEscena();
    if (!spec?.tipo || !el) return false;
    const tok = escenaTok = {};
    let mod;
    try { await readyTheme; mod = await loadEscena(); } catch { return false; }
    if (escenaTok !== tok || !el.isConnected) return false;
    let made = null;
    try { made = await mod.montarEscena(spec, el, { theme: S.theme, reducedMotion: reduced, cargarTema: loadVisuals }); } catch { made = null; }
    if (escenaTok !== tok) { made?.destroy(); return false; }
    if (!made) return false;
    escena = made;
    if (o.side && !visual) { nudgeBy = 'escena'; setNudge((o.side === 'izq' ? 0.2 : -0.2) - (sceneSpec?.shot.x || 0)); }
    return made.label || ' ';
  };
  S.clearEscena = () => { escenaTok = null; escena?.destroy(); escena = null; if (nudgeBy === 'escena') { nudgeBy = null; if (nudge) setNudge(0); } };
  /** Pide en reposo el módulo de escenas de pregunta (la app lo llama si el Tap trae alguna). */
  S.preloadEscenas = () => readyTheme.then(loadEscena).then(() => undefined, () => undefined);
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

  /**
   * v12: la pausa tiene motivos. Volver a la pestaña (`resume('tab')`) solo quita el motivo 'tab': un escenario en pausa por la
   * app (precargado, o el del Tap anterior) no vuelve a dibujar ni a sonar. `resume()` de la app quita los suyos, no el de la pestaña.
   */
  const pausas = new Set();
  S.pause = function pause(why) { pausas.add(why || 'app'); S.paused = true; cancelAnimationFrame(raf); raf = 0; root.dataset.paused = [...pausas].join(' '); if (sound?.ac?.state === 'running') sound.ac.suspend().catch(() => {}); };
  S.resume = function resume(why) {
    if (why === 'tab') pausas.delete('tab'); else for (const p of [...pausas]) if (p !== 'tab') pausas.delete(p);
    if (pausas.size) { root.dataset.paused = [...pausas].join(' '); return; }
    if (!S.paused && raf) return; S.paused = false; delete root.dataset.paused; if (sound?.ac?.state === 'suspended' && !document.hidden) sound.ac.resume().catch(() => {}); if (renderer) { wake(300); loop(); } };
  S.setMuted = function setMuted(m) { sound?.setMuted(m); readyTheme.then(() => sound?.setMuted(m)); S.muted = !!m; };
  /** Mueve el escenario entero a otro contenedor (el feed usa UN escenario para todos los Taps). */
  S.attachTo = function attachTo(el) { if (root.parentElement !== el) { S.clearVisual(); S.clearEscena(); el.appendChild(root); applyFit(true); } if (renderer) wake(500); };
  S.sfx = name => sound?.play(name);
  S.destroy = function destroy() {
    S.clearVisual(); S.clearEscena(); clearTimeout(enterTimer); clearTimeout(revealTimer);
    S.destroyed = true; voice?.callar?.(); voice = null; clearTimeout(slowTimer); cancelAnimationFrame(raf); clearInterval(typeTimer); clearTimeout(bubbleTimer); clearTimeout(reactTimer);
    ro?.disconnect(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    try { renderer?.dispose(); } catch { /* ya liberado */ } renderer = null; try { sound?.ac?.close(); } catch { /* sin audio */ } root.remove();
  };
  /**
   * Zona segura (v11): `top` y `bottom` = px del contenedor que tapan la barra y la tarjeta de la pregunta. El personaje se
   * encaja en lo que queda a la vista (todos los temas, planos y la capa ligera). `null` o ceros = todo el contenedor.
   */
  S.setSafeArea = function setSafeArea(a) {
    const top = Math.max(0, +a?.top || 0), bottom = Math.max(0, +a?.bottom || 0), next = top || bottom ? { top, bottom } : null;
    if (next?.top === safe?.top && next?.bottom === safe?.bottom) return;
    safe = next; applyFit(false);
  };
  /** Dónde está el personaje ahora (px del contenedor): cabeza, pecho, pies y centro. Para pruebas y herramientas. */
  S.caja = function caja() {
    if (S.mode === '3d' && renderer) {
      const [x, top] = toCss(...renderer.anchor('top')), [, pecho] = toCss(...renderer.anchor('chest')), [, pies] = toCss(...renderer.anchor('feet'));
      return { modo: '3d', top, pecho, pies, x };
    }
    const rr = root.getBoundingClientRect(), b = lightEl.getBoundingClientRect();
    return { modo: 'light', top: b.top - rr.top, pecho: b.top - rr.top + b.height * 0.45, pies: b.bottom - rr.top, x: (b.left + b.right) / 2 - rr.left };
  };
  S.snapshot = () => (S.mode === '3d' ? glEl.toDataURL('image/png') : null);
  S.setSlow = setSlow;
  S.stats = () => ({ mode: S.mode, tier: S.tier, size, fpsCap, fps: fpsNow, degraded, canvas: S.canvas || null });
  Object.defineProperty(root, 'tapsStage', { value: S });         // para pruebas y herramientas: el escenario desde su nodo
  return S;
}

export default { create, pickTier, TIERS, resolveSound, SYNTH_NAMES, encajar, BANDA_DEFECTO };
