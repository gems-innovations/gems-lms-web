// Pruebas del contrato de temas (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
// Cargan cada theme.json, revisan que sus reacciones/sonidos/escenas apunten a cosas que existen y hacen funcionar el
// renderizador 2D del tema «estudio» y su capa ligera contra un lienzo falso que solo registra llamadas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const { resolveSound, SYNTH_NAMES } = await import(new URL('taps-engine.js', ENGINE).href);
const readJson = url => JSON.parse(readFileSync(url, 'utf8'));
const themeUrl = id => new URL(`themes/${id}/theme.json`, ENGINE);
const THEMES = readdirSync(new URL('themes/', ENGINE)).filter(id => existsSync(themeUrl(id)));
const BASE_REACTIONS = ['idle', 'think', 'ask', 'celebrate', 'hurt', 'win', 'lose'];

/** Contexto 2D falso: acepta cualquier método o propiedad y cuenta las figuras pintadas. */
function fakeCanvas(w = 540, h = 960) {
  const calls = { fill: 0, stroke: 0, drawImage: 0, fillRect: 0, fillText: 0 };
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      return (...args) => { if (k in calls) calls[k]++; for (const a of args) if (typeof a === 'number') assert.ok(Number.isFinite(a), `${String(k)} recibió ${a}`); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => ctx, calls };
}
globalThis.OffscreenCanvas ??= class { constructor(w, h) { return fakeCanvas(w, h); } };

for (const id of THEMES) {
  test(`tema «${id}»: theme.json cumple el contrato`, () => {
    const t = readJson(themeUrl(id));
    assert.equal(t.id, id, 'el id coincide con la carpeta');
    assert.ok(Object.keys(t.characters || {}).length > 0, 'tiene personajes');
    assert.ok(t.scenes?.[t.defaultWorld], 'defaultWorld es una escena');
    for (const [w, sc] of Object.entries(t.scenes)) assert.equal(sc.sky?.length, 2, `escena ${w} con sky [arriba, abajo]`);
    for (const r of BASE_REACTIONS) assert.ok(t.reactions?.[r], `falta la reacción ${r}`);
    for (const [name, r] of Object.entries(t.reactions)) {
      if (r.then) assert.ok(t.reactions[r.then], `${name}.then apunta a ${r.then}`);
      for (const s of r.sfx || []) assert.notEqual(resolveSound(t, s).kind, 'none', `${name} usa el sonido ${s}, que no existe`);
      if (r.particles) assert.ok(Array.isArray(t.palette?.[r.particles]), `${name} usa partículas ${r.particles} sin colores`);
    }
    for (const rel of [t.renderer, t.light, t.css, ...Object.values(t.vendor || {})].filter(Boolean)) assert.ok(existsSync(new URL(rel, themeUrl(id))), `existe ${rel}`);
    for (const c of Object.values(t.characters)) if (c.skin) assert.ok(existsSync(new URL(c.skin, themeUrl(id))), `existe ${c.skin}`);
  });
}

test('sonidos: archivos, tonos del tema y sintetizados del motor', () => {
  const mc = readJson(themeUrl('minecraft')), es = readJson(themeUrl('estudio'));
  assert.deepEqual(resolveSound(mc, 'damage'), { kind: 'file', files: ['sounds/player_damage.ogg'], vol: 0.8, synth: 'wrong' });
  assert.deepEqual(resolveSound(mc, 'jingle'), { kind: 'synth', synth: 'jingle' });     // sin definición: el del motor
  assert.equal(resolveSound(es, 'ding').kind, 'tones');
  assert.equal(resolveSound(es, 'whoosh').noise.length, 4);
  assert.deepEqual(resolveSound({ sounds: { x: { synth: 'pop' } } }, 'x'), { kind: 'synth', synth: 'pop' });
  assert.deepEqual(resolveSound(es, 'no-existe'), { kind: 'none' });
  assert.ok(SYNTH_NAMES.includes('result'));
  for (const def of Object.values(es.sounds)) for (const tone of def.tones || []) {
    assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(tone[0]), 'onda válida');
    assert.ok(tone[3] > 0 && tone[3] <= 0.5, 'cada tono dura menos de medio segundo');
  }
});

test('tema «estudio»: el renderizador 2D anima todas las reacciones sin WebGL', async () => {
  const theme = readJson(themeUrl('estudio'));
  assert.equal(theme.canvas, '2d');
  const { createRenderer } = await import(new URL('themes/estudio/renderer2d.js', ENGINE).href);
  const canvas = fakeCanvas();
  const r = await createRenderer({ canvas, width: 540, height: 960, theme, resolve: x => x, reducedMotion: false });
  for (const m of ['setScene', 'preload', 'play', 'fx', 'frame', 'anchor', 'setSize', 'dispose']) assert.equal(typeof r[m], 'function', m);
  for (const world of Object.keys(theme.scenes)) for (const host of Object.keys(theme.characters)) {
    await r.setScene({ world, host, item: 'matraz' });
    const anims = new Set(Object.values(theme.reactions).flatMap(x => [x.anim, x.reducedAnim]).filter(Boolean));
    for (const a of anims) { r.play(a); for (const f of ['ring', 'shake', 'flash']) r.fx(f); for (let i = 0; i < 20; i++) r.frame(1 / 30); }
  }
  assert.ok(canvas.calls.drawImage > 0 && canvas.calls.fill > 100, 'dibujó fondo y personaje');
  for (const a of ['top', 'head', 'chest', 'feet']) {
    const [x, y] = r.anchor(a);
    assert.ok(x > 0 && x < 540 && y > 0 && y < 960, `ancla ${a} dentro del lienzo`);
  }
  assert.ok(r.anchor('top')[1] < r.anchor('chest')[1] && r.anchor('chest')[1] < r.anchor('feet')[1], 'anclas en orden vertical');
  r.setSize(360, 640); r.frame(1 / 24); assert.equal(canvas.width, 360);
  r.dispose();
});

test('tema «estudio»: movimiento reducido = poses quietas', async () => {
  const { poseFor } = await import(new URL('themes/estudio/rig.js', ENGINE).href);
  const theme = readJson(themeUrl('estudio'));
  for (const r of Object.values(theme.reactions)) {
    const name = r.reducedAnim || 'idle';
    assert.deepEqual(poseFor(name, 0, 0), poseFor(name, 0, 0));
    if (['happy', 'oops', 'still'].includes(name)) assert.deepEqual(poseFor(name, 3, 7), poseFor(name, 0, 0), `${name} no depende del tiempo`);
  }
});

test('tema «estudio»: la capa ligera dibuja el personaje y cambia de pose', async () => {
  const light = await import(new URL('themes/estudio/light.js', ENGINE).href);
  const theme = readJson(themeUrl('estudio'));
  const canvas = fakeCanvas(16, 32);
  light.paintCharacter(canvas, null, { character: theme.characters.nube, item: 'lupa' });
  assert.equal(canvas.width, 480); assert.equal(canvas.height, 600);
  const before = canvas.calls.fill;
  for (const a of ['talk', 'think', 'celebrate', 'hurt', 'sad', 'happy', 'oops', 'desconocida']) light.paintReaction(canvas, a, { character: theme.characters.chispa });
  assert.ok(canvas.calls.fill > before);
});

test('Taps de ejemplo: formato válido y escenas que existen en su tema', () => {
  const dir = new URL('taps/', ENGINE);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const tap = readJson(new URL(f, dir)), theme = readJson(themeUrl(tap.theme));
    assert.equal(`${tap.id}.json`, f, 'el archivo se llama como el id (la demo lo abre con ?tap=<id>)');
    assert.ok(theme.scenes[tap.scene.world], `${f}: mundo ${tap.scene.world}`);
    assert.ok(theme.characters[tap.scene.host], `${f}: personaje ${tap.scene.host}`);
    assert.equal(tap.questions.length, 5);
    for (const q of tap.questions) assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${f}: ${q.id}`);
    assert.ok(tap.results.some(r => r.min === 0));
  }
});

test('escenas: encuadres, entradas, decorados y objetos para explicar declarados en cada tema', async () => {
  for (const id of THEMES) {
    const t = readJson(themeUrl(id));
    for (const [k, s] of Object.entries(t.shots || {})) {
      assert.ok(Math.abs(s.x ?? 0) <= 0.3, `${id}: el encuadre ${k} no saca al personaje de la pantalla`);
      assert.ok((s.zoom ?? 1) >= 0.6 && (s.zoom ?? 1) <= 1.3, `${id}: zoom razonable en ${k}`);
    }
    for (const k of ['centro', 'izquierda', 'derecha']) assert.ok(t.shots?.[k], `${id}: falta el encuadre ${k}`);
    assert.ok((t.enters || []).length >= 3, `${id}: pocas entradas`);
    if (t.visuals) {
      assert.ok(existsSync(new URL(t.visuals.module, themeUrl(id))), `${id}: existe ${t.visuals.module}`);
      const mod = await import(new URL(t.visuals.module, themeUrl(id)).href);
      for (const [objeto, acciones] of Object.entries(t.visuals.objects)) {
        assert.equal(typeof mod.OBJECTS[objeto], 'function', `${id}: el módulo dibuja ${objeto}`);
        assert.ok(acciones.length > 0);
      }
      assert.equal(mod.createVisual({ objeto: 'no-existe', accion: 'x' }), null, 'un objeto desconocido no rompe nada');
    }
  }
});

test('objetos para explicar: cada pregunta del banco que trae uno se dibuja, se toca y se arrastra', async () => {
  const src = readFileSync(new URL('../src/app/taps/taps.banco.generated.ts', import.meta.url), 'utf8');
  const taps = src.split('\n').filter(l => l.startsWith('  {')).map(l => JSON.parse(l.trim().replace(/,$/, '')));
  let n = 0;
  for (const tap of taps) for (const q of tap.questions.filter(x => x.visual)) {
    const t = readJson(themeUrl(tap.theme));
    const mod = await import(new URL(t.visuals.module, themeUrl(tap.theme)).href);
    for (const reducedMotion of [false, true]) {
      const v = mod.createVisual(q.visual, { reducedMotion });
      assert.ok(v, `${tap.id}/${q.id}: ${q.visual.objeto} ${q.visual.accion} ${q.visual.valor ?? ''} se crea`);
      assert.ok(typeof v.label === 'string' && v.label.length > 10 && v.duration > 0, `${q.id}: descripción para lector de pantalla y duración`);
      const canvas = fakeCanvas(200, 200), ctx = canvas.getContext();
      for (const time of [0, v.duration / 2, v.duration]) v.draw(ctx, 200, 180, time);
      v.drag?.(0.7, 0.5); v.draw(ctx, 200, 180, v.duration); v.tap?.(0.5, 0.5); v.draw(ctx, 200, 180, v.duration);
      assert.ok(canvas.calls.fill + canvas.calls.fillRect > 20, `${q.id}: dibujó el objeto`);
    }
    n++;
  }
  assert.ok(n >= 25, `hay ${n} preguntas con objeto`);
});

test('recetas: cada cantidad que dice la explicación del banco coincide con la mesa de crafteo', async () => {
  const src = readFileSync(new URL('../src/app/taps/taps.banco.generated.ts', import.meta.url), 'utf8');
  const qs = src.split('\n').filter(l => l.startsWith('  {')).flatMap(l => JSON.parse(l.trim().replace(/,$/, '')).questions)
    .filter(q => q.visual?.objeto === 'receta');
  const mod = await import(new URL('themes/minecraft/visuals.js', ENGINE).href);
  assert.ok(qs.length >= 17);
  for (const q of qs) {
    const label = mod.createVisual(q.visual).label;
    // «4 palos, poniendo…», «3 papeles y 1 cuero», «8 lingotes»: toda cifra de la explicación aparece con su palabra en la receta
    for (const [, n, word] of q.why.matchAll(/(\d+) (?:de )?([a-záéíóúñ]+)/gi)) {
      assert.ok(label.includes(`${n} ${word.slice(0, 4).toLowerCase()}`), `${q.id}: la explicación dice «${n} ${word}» y la receta dice «${label}»`);
    }
  }
  const palos = mod.createVisual({ objeto: 'receta', accion: 'crafteo', valor: 'palos' }).label;
  assert.match(palos, /2 tablones dan 4 palos/);
});

test('tema «estudio»: encuadre, entrada, decorado y nudge no sacan al personaje del lienzo', async () => {
  const theme = readJson(themeUrl('estudio'));
  const { createRenderer } = await import(new URL('themes/estudio/renderer2d.js', ENGINE).href);
  const canvas = fakeCanvas();
  const r = await createRenderer({ canvas, width: 540, height: 960, theme, resolve: x => x, reducedMotion: false });
  for (const world of Object.keys(theme.scenes)) for (const [key, shot] of Object.entries(theme.shots)) for (const enter of theme.enters) {
    await r.setScene({ world, host: 'chispa', item: 'lupa', props: Object.keys(theme.props)[0], shot, enter });
    r.nudge(((shot.x ?? 0) < 0 ? -0.2 : 0.2) - (shot.x ?? 0));        // como lo pide el motor al mostrar un objeto
    for (let i = 0; i < 40; i++) r.frame(1 / 30);
    const [x, y] = r.anchor('chest');
    assert.ok(x > 40 && x < 500 && y > 0 && y < 960, `${world}/${key}/${enter}: el personaje queda dentro (${x | 0}, ${y | 0})`);
  }
  r.dispose();
});

test('los Taps de «estudio» de la app (taps-estudio.data.ts) coinciden con los de la demo', () => {
  const ts = readFileSync(new URL('../src/app/taps/taps-estudio.data.ts', import.meta.url), 'utf8').replace(/\\'/g, "'");
  for (const id of ['logica-trampas', 'ciencia-curiosa']) {
    const tap = readJson(new URL(`taps/${id}.json`, ENGINE));
    for (const s of [tap.id, tap.title, tap.kicker, tap.scene.world, tap.scene.host, ...tap.questions.flatMap(q => [q.q, q.why, ...q.options]), ...tap.results.map(r => r.title)])
      assert.ok(ts.includes(`'${s}'`), `${id}: falta «${s}» en taps-estudio.data.ts`);
  }
});
