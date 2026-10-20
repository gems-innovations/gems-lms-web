// Tema «aventura» · renderizador 3D genérico para personajes glTF/GLB del registro (personajes/<id>/personaje.json).
//
// No sabe de ningún personaje en concreto: carga el .glb que diga el manifiesto (GLTFLoader de three.js,
// en vendor/three-gltf.js, que el motor carga solo cuando hace falta el 3D), lo normaliza a la misma altura, y traduce las
// animaciones del motor (idle, think, talk, celebrate, hurt, dance, sad…) a los clips que el manifiesto mapea
// (idle, pensar, hablar, acierto, fallo, celebrar, triste). Encima de cada clip pone un poco de movimiento propio (salto al
// acertar, sacudida al fallar, giro al celebrar) para que todos los personajes reaccionen con la misma energía.
// Fondos (fondos/<id>/fondo.json): «imagen» = ilustración plana detrás, la pinta el CSS del tema (--te-bg-img, también en
// 3D); «color» = degradado del cielo (CSS) con un suelo de color y niebla en 3D.
// Dibujo: el 3D va a SU PROPIO lienzo WebGL transparente, puesto en el DOM justo debajo del lienzo 2D del motor (que queda
// solo para las partículas). Nada se copia de WebGL a 2D en cada fotograma: eso obliga a la GPU a esperar y cuesta fps.
//
// Interfaz (la misma que renderer3d.js / renderer2d.js, ver ../../README.md): setScene, preload, play, fx, frame, anchor,
// nudge, setSize, dispose.
import { ANIM_A_REACCION } from '../../registro.js';

/**
 * Las texturas de un .glb van dentro del archivo y GLTFLoader las abre con un `blob:`. En Chrome lo hace con fetch()
 * (ImageBitmapLoader), y la CSP del sitio (connect-src sin blob:) lo bloquea: el personaje saldría sin textura. Con este
 * complemento el cargador usa un <img> (img-src sí permite blob:), igual que en Safari/Firefox. No hace falta tocar la CSP.
 */
export function sinFetchDeBlobs(loader, T) {
  return loader.register(parser => {
    parser.textureLoader = new T.TextureLoader(parser.options.manager);
    parser.textureLoader.setCrossOrigin(parser.options.crossOrigin);
    return { name: 'taps_texturas_con_img' };
  });
}

export async function createRenderer(opts) {
  const { canvas: out, theme, vendor, reducedMotion } = opts;
  const T = vendor?.TapsThree;
  if (!T) throw new Error('falta vendor TapsThree');
  let W = opts.width, H = opts.height;
  const clamp = x => (x < 0 ? 0 : x > 1 ? 1 : x), easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const oc = out.getContext('2d');
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  glc.className = 'te-gl te-gl3d'; glc.setAttribute('aria-hidden', 'true');
  out.parentNode?.insertBefore(glc, out);                 // mismo CSS que el lienzo del motor (encaje cover, fundido «on»)
  let disposed = false;
  const gl = new T.WebGLRenderer({ canvas: glc, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  gl.setPixelRatio(1); gl.setSize(W, H, false); gl.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const FOV = 32, cam = new T.PerspectiveCamera(FOV, W / H, 0.05, 200);
  const hemi = new T.HemisphereLight(0xffffff, 0x8a7a66, 1.6), sun = new T.DirectionalLight(0xffffff, 1.9);
  sun.position.set(2.5, 4, 3); scene.add(hemi, sun);

  // sombra de contacto: un disco con degradado radial (sin mapas de sombra: barato en móviles)
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  { const x = sc.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.scale.set(0.9, 0.55, 1); scene.add(shadow);

  // suelo para los fondos de tipo «color» (las imágenes ya traen su suelo dibujado)
  const ground = new T.Mesh(new T.CircleGeometry(60, 48), new T.MeshLambertMaterial({ color: 0x5da83a }));
  ground.rotation.x = -Math.PI / 2; ground.visible = false; scene.add(ground);

  const loader = sinFetchDeBlobs(new T.GLTFLoader(), T);
  const texLoader = new T.TextureLoader();

  // ── personajes: un .glb por id, cargado una vez (se reutiliza la misma escena: solo hay uno en pantalla) ──
  const chars = theme.characters || {};
  const charKey = k => (chars[k] ? k : Object.keys(chars)[0]);
  const models = new Map();          // id → Promise<{ root, mixer, clips, height }>
  function loadModel(id) {
    const ch = chars[id];
    if (!ch || disposed) return Promise.resolve(null);
    if (!models.has(id)) {
      const p = (ch.tipo === 'sprite2d' ? loadSprite(ch) : loadGlb(ch)).catch(e => { models.delete(id); throw e; });
      models.set(id, p);
    }
    return models.get(id);
  }
  async function loadGlb(ch) {
    const g = await loader.loadAsync(ch.modelo);
    if (disposed) { liberar(g.scene); return null; }      // llegó después de destruir el escenario: no se usa
    const model = g.scene, holder = new T.Group(), body = new T.Group();
    model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.metalness = 0; o.material.roughness = 1; } } });
    // altura normalizada = 1 unidad (× escala del manifiesto); pies en y = 0, centrado en x/z. Se mide YA en la pose idle:
    // los .glb cuantizados (KHR_mesh_quantization) guardan una escala en los nodos que la animación reemplaza.
    const mixer = new T.AnimationMixer(model), clips = new Map(g.animations.map(a => [a.name, a]));
    const idle = clips.get(ch.animaciones?.idle);
    if (idle) { const a = mixer.clipAction(idle); a.play(); mixer.update(0); model.updateMatrixWorld(true); a.stop(); }
    const box = new T.Box3().setFromObject(model, true), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
    const k = (ch.escala || 1) / (size.y || 1);
    model.position.set(-c.x, -box.min.y, -c.z); body.add(model); body.scale.setScalar(k); body.rotation.y = ch.giro || 0;
    holder.add(body);
    return { root: holder, body, mixer, clips, anims: ch.animaciones || {}, width: Math.max(size.x, size.z) * k, actions: new Map(), current: null };
  }
  async function loadSprite(ch) {
    const t = await texLoader.loadAsync(ch.imagen || ch.miniatura);
    if (disposed) { t.dispose(); return null; }
    t.colorSpace = T.SRGBColorSpace;
    const a = t.image.width / t.image.height, h = ch.escala || 1;
    const m = new T.Mesh(new T.PlaneGeometry(h * a, h), new T.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.05 }));
    m.position.y = h / 2; const holder = new T.Group(), body = new T.Group(); body.add(m); holder.add(body);
    return { root: holder, body, mixer: null, clips: new Map(), anims: {}, width: h * a, actions: new Map(), current: null };
  }
  let host = null, hostId = null, wantHost = null;
  function clipFor(m, anim) {
    if (!m) return null;
    const r = ANIM_A_REACCION[anim] || 'idle';
    const name = m.anims[r] || (r === 'triste' ? m.anims.fallo : null) || m.anims.idle;
    return m.clips.get(name) || m.clips.get(m.anims.idle) || [...m.clips.values()][0] || null;
  }
  let animKey = 'idle', animT = 0;
  function play(name) {
    animKey = name || 'idle'; animT = 0;
    playClip(clipFor(host, animKey));
  }
  function playClip(clip) {
    if (!host?.mixer || !clip) return;
    let a = host.actions.get(clip.name);
    if (!a) { a = host.mixer.clipAction(clip); host.actions.set(clip.name, a); }
    if (host.current === a) return;
    a.reset(); a.setLoop(T.LoopRepeat, Infinity); a.enabled = true; a.setEffectiveWeight(1);
    if (host.current && !reducedMotion) { a.play(); host.current.crossFadeTo(a, 0.22, false); }
    else { host.current?.stop(); a.play(); }
    host.current = a;
  }
  async function useHost(id) {
    const key = charKey(id); wantHost = key; if (hostId === key && host) return;
    const m = await loadModel(key); if (!m || disposed || wantHost !== key) return;      // llegó otro Tap mientras cargaba
    if (host) scene.remove(host.root);
    host = m; hostId = key; scene.add(host.root);
    host.current?.stop(); host.current = null; host.actions.forEach(a => a.stop());
    const keep = animKey; animKey = ''; play(keep);
    host.mixer?.update(0);
  }

  // ── fondos ──
  const scenes = theme.scenes || {};
  const worldKey = k => (scenes[k] ? k : theme.defaultWorld);
  // La imagen del fondo la pinta el CSS (el motor pone --te-bg-img); aquí solo se precarga para que el cambio no parpadee.
  const images = new Map();
  const loadImg = src => {
    if (!images.has(src)) images.set(src, new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => { images.delete(src); no(new Error('No cargó ' + src)); }; i.src = src; }));
    return images.get(src);
  };
  async function useWorld(key) {
    const def = scenes[worldKey(key)] || {};
    const img = def.tipo === 'imagen' && def.imagen ? await loadImg(def.imagen).catch(() => null) : null;   // sin imagen: suelo 3D
    // sin imagen (tipo «color» o si la imagen no cargó): degradado del cielo y un suelo de color que se funde en el horizonte
    ground.visible = !img;
    ground.material.color.set(def.ground || '#5da83a');
    scene.fog = img ? null : new T.Fog(def.sky?.[1] || '#cfeaff', 9, 45);
    const luz = def.luz || {};
    sun.color.set(luz.color || '#ffffff'); sun.intensity = 1.9 * (luz.intensidad ?? 1);
    hemi.color.set(luz.color || '#ffffff'); hemi.intensity = 1.6 * (luz.intensidad ?? 1); hemi.groundColor.set(def.groundDark || def.ground || '#8a7a66');
  }

  // ── cámara: pies a ~68 % del alto y 36 % de alto de personaje (como el tema minecraft: deja sitio a la tarjeta de abajo);
  //    el encuadre corre la cámara de lado (no al personaje) ──
  let shot = { x: 0, zoom: 1, yaw: 0, height: 0 }, nudgeX = 0, nudgeTo = 0, push = 0, shake = 0, hurt = 0, simT = 0;
  // modo cine: plano del Tap y variante de la pregunta (0 = plano base; 1-3 cambios suaves). Sin movimiento con movimiento reducido.
  const VARIANTES = [{}, { zoom: 1.1, az: 0.1 }, { az: -0.14, el: 4 }, { zoom: 0.92, el: -3, az: 0.06 }];
  let plano = null, variante = 0, cine = null;
  function cineGoal() {
    if (!plano) return null;
    const g = { el: 0, az: 0, zoom: 1, ty: 0, roll: 0, orbit: 0, travel: 0, ...plano }, v = reducedMotion ? {} : VARIANTES[variante] || {};
    return { el: g.el + (v.el || 0), az: g.az + (v.az || 0), zoom: g.zoom * (v.zoom || 1), ty: g.ty, roll: g.roll, orbit: reducedMotion ? 0 : g.orbit, travel: reducedMotion ? 0 : g.travel };
  }
  const TAN = Math.tan((FOV * Math.PI) / 360), FRAME = 1 / (2 * 0.36);
  function placeCamera(dt) {
    push = Math.max(0, push - dt * 1.4); nudgeX += (nudgeTo - nudgeX) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 8));
    const zoom = (shot.zoom || 1) * (1 + 0.08 * easeOut(push));
    const d = FRAME / TAN / zoom;                           // a zoom 1 el personaje (1 u) ocupa el 36 % del alto
    const ty = 0.36 * d * TAN;                              // pies (y = 0) en el 68 % de la pantalla
    const hw = d * TAN * cam.aspect, off = -((shot.x || 0) + nudgeX) * 2 * hw;   // la cámara se corre de lado
    const sway = reducedMotion ? 0 : Math.sin(simT * 0.5) * 0.05;
    const goal = cineGoal();
    if (!goal) {
      cam.position.set(off + sway * d * 0.1, ty + (shot.height || 0) * 0.02, d);
      cam.lookAt(off, ty + (shot.height || 0) * 0.01, 0);
    } else {
      // modo cine (theme.cine.planos): elevación, giro, acercamiento, inclinación, órbita y travelling lentos; viaja ~1,5 s
      if (!cine || reducedMotion) cine = { ...goal }; else { const k = 1 - Math.exp(-dt * 1.6); for (const p in goal) cine[p] += (goal[p] - cine[p]) * k; }
      const q = cine, dz = d / q.zoom, tyz = 0.36 * dz * TAN + q.ty, hwz = dz * TAN * cam.aspect;
      const az = q.az + q.orbit * Math.sin(simT * 0.11), el = (q.el * Math.PI) / 180;
      const tx = -((shot.x || 0) + nudgeX) * 2 * hwz + q.travel * Math.sin(simT * 0.09) * 2 * hwz;
      cam.position.set(tx + Math.sin(az) * Math.cos(el) * dz, tyz + Math.sin(el) * dz, Math.cos(az) * Math.cos(el) * dz);
      cam.lookAt(tx, tyz, 0); if (q.roll) cam.rotateZ(q.roll);
    }
    if (shake > 0) { shake = Math.max(0, shake - dt); cam.position.x += (Math.random() - 0.5) * shake * 0.25; cam.position.y += (Math.random() - 0.5) * shake * 0.25; }
    cam.updateMatrixWorld();
  }

  // ── entradas y movimiento propio encima del clip ──
  let enter = null;
  const ENTER_DUR = { camina: 0.9, salta: 0.65, gira: 0.7, saluda: 1.1 };
  function motion(dt) {
    if (!host) return;
    animT += dt;
    const r = host.root, b = host.body, side = (shot.x || 0) < 0 ? -1 : 1;
    r.position.set(0, 0, 0); r.rotation.set(0, (shot.yaw || 0) * 0.85 + (cine ? cine.az * 0.5 : 0) - ((shot.x || 0) + nudgeX) * 0.6, 0); b.position.y = 0; b.rotation.z = 0;
    if (!reducedMotion) {
      if (animKey === 'celebrate' || animKey === 'jump') b.position.y = Math.abs(Math.sin(animT * Math.PI * 2.4)) * 0.18 * Math.max(0, 1 - animT / 2.2);
      else if (animKey === 'dance') { b.position.y = Math.abs(Math.sin(animT * Math.PI * 2.2)) * 0.12; r.rotation.y += Math.sin(animT * 2.6) * 0.5; }
      else if (animKey === 'hurt') { const k = Math.max(0, 1 - animT / 0.75); r.position.x = Math.sin(animT * 34) * 0.05 * k; b.rotation.z = Math.sin(animT * 30) * 0.08 * k; r.position.z = -0.15 * k; }
      else if (animKey === 'think') b.rotation.z = Math.sin(animT * 0.9) * 0.05;
      else if (animKey === 'sad') b.position.y = -0.01 + Math.sin(animT * 1.3) * 0.01;
      else if (animKey === 'talk') b.position.y = Math.abs(Math.sin(animT * 9)) * 0.012;
    }
    if (enter) {
      enter.t += dt; const p = Math.min(1, enter.t / ENTER_DUR[enter.kind]), k = easeOut(p);
      if (enter.kind === 'camina') r.position.x = (1 - k) * 1.6 * side;
      else if (enter.kind === 'salta') b.position.y += (1 - k) * 2.2 - Math.sin(clamp((p - 0.7) / 0.3) * Math.PI) * 0.05;
      else if (enter.kind === 'gira') r.rotation.y += (1 - k) * Math.PI * 2;
      else if (enter.kind === 'saluda') b.position.y += Math.sin(Math.min(1, p * 2) * Math.PI) * 0.12;
      if (p >= 1) { if (enter.kind === 'camina') playClip(clipFor(host, animKey)); enter = null; }
    }
    shadow.position.x = r.position.x; shadow.position.z = r.position.z;
    const air = clamp(b.position.y / 0.6); shadow.scale.set((0.55 + (host.width || 0.6) * 0.5) * (1 - air * 0.4), (0.35 + (host.width || 0.6) * 0.3) * (1 - air * 0.4), 1);
  }

  // ── dibujo: el 3D directo a su lienzo; el lienzo 2D del motor se limpia para sus partículas (y el destello al fallar) ──
  function frame(dt) {
    if (disposed) return;
    simT += dt; hurt = Math.max(0, hurt - dt);
    host?.mixer?.update(reducedMotion ? 0 : dt);
    motion(reducedMotion ? 0 : dt);
    placeCamera(dt);
    gl.render(scene, cam);
    const on = out.classList.contains('on'); if (glc.classList.contains('on') !== on) glc.classList.toggle('on', on);   // sigue el fundido del motor
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, W, H);
    if (hurt > 0) { oc.fillStyle = `rgba(255,40,40,${(hurt / 0.4) * 0.18})`; oc.fillRect(0, 0, W, H); }
  }
  /** Libera geometrías, materiales y texturas de un objeto de three (también los modelos que nunca se añadieron). */
  function liberar(obj) {
    obj?.traverse?.(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { for (const v of Object.values(x)) if (v?.isTexture) v.dispose(); x.dispose?.(); }); });
  }
  const v3 = new T.Vector3();
  function anchor(name) {
    const y = { head: 1.02, top: 1.18, chest: 0.55, feet: 0 }[name] ?? 1.02, r = host?.root;
    v3.set(r ? r.position.x : 0, y * (chars[hostId]?.escala || 1) + (host?.body.position.y || 0), r ? r.position.z : 0).project(cam);
    return [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H];
  }

  play('idle');
  let tok = 0;
  return {
    async setScene({ world: w, host: who, shot: sh, enter: en, plano: pl } = {}) {
      if (disposed) return;
      const my = ++tok; shot = { x: 0, zoom: 1, yaw: 0, height: 0, ...(sh || {}) };
      plano = pl || null; variante = 0; cine = null;
      await Promise.all([useHost(who), useWorld(w || theme.defaultWorld)]);
      if (my !== tok || disposed) return;
      enter = en && ENTER_DUR[en] && !reducedMotion ? { kind: en, t: 0 } : null;
      if (enter?.kind === 'camina' && host?.anims.caminar) playClip(host.clips.get(host.anims.caminar));
    },
    play,
    /** Pequeño cambio de plano entre preguntas (n = pregunta, seed = número del Tap; determinista). */
    plano(n, seed = 0) { variante = n ? 1 + ((seed + n) % 3) : 0; },
    async preload({ world: w, host: who } = {}) {
      const def = scenes[worldKey(w)];
      await Promise.all([loadModel(charKey(who)).catch(() => null), def?.tipo === 'imagen' && def.imagen ? loadImg(def.imagen).catch(() => null) : null]);
    },
    fx(name) { if (name === 'hurt') { hurt = 0.4; shake = Math.max(shake, 0.22); } else if (name === 'push') push = 1; else if (name === 'shake') shake = Math.max(shake, 0.2); },
    frame,
    anchor,
    nudge(dx, now) { nudgeTo = dx || 0; if (now || reducedMotion) nudgeX = nudgeTo; },
    setSize(w, h) { W = Math.round(w); H = Math.round(h); out.width = W; out.height = H; glc.width = W; glc.height = H; gl.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); },
    dispose() {
      if (disposed) return;
      disposed = true; tok++;
      try { liberar(scene); } catch { /* ya liberado */ }
      // los modelos ya cargados que no estaban en escena (precargados o de Taps anteriores) también ocupan GPU
      for (const p of models.values()) p.then(m => { if (m && m !== host) { m.mixer?.stopAllAction(); liberar(m.root); } }, () => undefined);
      models.clear(); images.clear(); host = null;
      try { gl.dispose(); gl.forceContextLoss(); } catch { /* sin contexto */ }
      glc.remove();
    },
    /** Solo para pruebas y capturas: qué clip suena para cada animación del motor. */
    debugClip: name => (host ? clipFor(host, name)?.name ?? null : null),
  };
}
