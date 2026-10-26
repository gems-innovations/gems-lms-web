// Reacciones por pieza y cámara del diseñador (PR-D4, disenador-v2-plan.md §4): cada reacción devuelve una pose válida en todo
// t ∈ [0, 1] (y fuera), compone la base del rig, dura 0,6-0,9 s, la mano llega adonde se le pide y la cámara interpola.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMARA_MS, ENCUADRES, MIRADA_COLOR, NOMBRES_REACCION, QUIETA_REACCION, REACCIONES, brazoHacia, encuadreDe, erroresDePose, focoDe, manoDerecha, mezclarCamara, reaccionDe,
} from '../public/taps-engine/themes/epoca/reacciones.js';
import { POSES, POSE_NAMES, armPoints, blendPose, poseFor } from '../public/taps-engine/themes/epoca/rig.js';

test('reacciones: son siete, nuevas (no pisan ninguna pose del rig) y duran entre 0,6 y 0,9 s', () => {
  assert.deepEqual([...NOMBRES_REACCION].sort(), ['barba', 'color', 'gafas', 'objeto', 'peinado', 'prenda', 'sombrero']);
  for (const n of NOMBRES_REACCION) {
    assert.ok(!POSE_NAMES.includes(n), n + ' no existe en rig.js');
    assert.ok(REACCIONES[n].dur >= 0.6 && REACCIONES[n].dur <= 0.9, n + ' dura ' + REACCIONES[n].dur);
    assert.ok(QUIETA_REACCION[n] in POSES, n + ' tiene pose quieta del rig para movimiento reducido');
  }
});

test('reacciones: pose válida en t ∈ [0, 1] (101 puntos), antes de 0 y después de la duración, con cualquier reloj', () => {
  for (const n of NOMBRES_REACCION) {
    const r = REACCIONES[n];
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * r.dur;
      for (const T of [0, 1.37, 1000]) assert.deepEqual(erroresDePose(r.pose(t, T)), [], `${n} t=${t.toFixed(3)} T=${T}`);
    }
    for (const t of [-1, r.dur + 1, 1e6, NaN]) assert.deepEqual(erroresDePose(r.pose(t, 2)), [], `${n} t=${t}`);
    // Se mezcla con blendPose como las del rig, en los dos sentidos.
    const mezclada = blendPose(blendPose(null, poseFor('idle', 0, 0), 1), r.pose(r.dur / 2, 0), 0.5);
    assert.deepEqual(erroresDePose(mezclada), [], n + ' mezclada');
    assert.deepEqual(erroresDePose(blendPose(mezclada, poseFor('celebrate', 0.3, 1), 0.3)), [], n + ' vuelta al rig');
  }
});

test('reacciones: componen base(T) (empiezan y terminan cerca del idle) y se mueven en medio', () => {
  for (const n of NOMBRES_REACCION) {
    const r = REACCIONES[n], T = 4.2, idle = POSES.idle(0, T), fin = r.pose(r.dur, T), medio = r.pose(r.dur / 2, T);
    assert.ok(Math.abs(fin.armR[0] - idle.armR[0]) < 1e-6 && Math.abs(fin.armR[1] - idle.armR[1]) < 1e-6, n + ': el brazo vuelve a la base al terminar');
    assert.ok(Math.abs(fin.tilt - idle.tilt) < 0.03 && Math.abs(fin.squash - idle.squash) < 1e-6, n + ': cuerpo en la base al terminar');
    assert.equal(fin.y, idle.y, n + ': la respiración del idle (y) se conserva');
    const distinta = ['armR', 'headTilt', 'tilt', 'lookX', 'lookY', 'squash'].some(k => JSON.stringify(medio[k]) !== JSON.stringify(idle[k]));
    assert.ok(distinta, n + ': a mitad de camino hay movimiento');
  }
  assert.equal(REACCIONES.color.pose(0.07, 0).parpadeo, true, 'color: primer parpadeo');
  assert.equal(REACCIONES.color.pose(0.17, 0).parpadeo, true, 'color: segundo parpadeo');
  assert.equal(REACCIONES.color.pose(0.5, 0).parpadeo, false);
  const pr = REACCIONES.prenda.pose(0, 0); assert.ok(pr.squash < 0.96, 'prenda: arranca encogido (0,94)');
  assert.ok(REACCIONES.prenda.pose(0.3 * 0.8, 0).squash > 1.02, 'prenda: rebota (1,04)');
});

test('brazoHacia: la mano llega al punto pedido (o lo más cerca posible) y el codo sale por el lado pedido', () => {
  for (const [x, y] of [[30, -182], [84, -128], [10, -150], [8, -108], [60, -60]]) {
    for (const codo of ['fuera', 'dentro']) {
      const m = armPoints(1, brazoHacia(x, y, codo));
      assert.ok(Math.hypot(m.hx - x, m.hy - y) < 0.01, `mano en (${x}, ${y}) con codo ${codo}`);
    }
    if (y > -88) continue;                                                   // bajo el hombro las dos ramas se cruzan: solo cuenta arriba (cara, sombrero)
    const fuera = armPoints(1, brazoHacia(x, y, 'fuera')), dentro = armPoints(1, brazoHacia(x, y, 'dentro'));
    assert.ok(fuera.ex >= dentro.ex - 1e-6, `codo fuera más al lado que dentro en (${x}, ${y})`);
  }
  const lejos = armPoints(1, brazoHacia(400, -400));                        // inalcanzable: brazo estirado hacia allá
  assert.ok(Math.hypot(lejos.hx - lejos.sx, lejos.hy - lejos.sy) > 97.9);
  assert.ok(lejos.hx > lejos.sx && lejos.hy < lejos.sy);
  // La mano del sombrero toca el ala (y ≈ -182) y la de las gafas el puente (x ≈ 10, y ≈ -150).
  const sombrero = armPoints(1, REACCIONES.sombrero.pose(0.45, 0).armR); assert.ok(sombrero.hy < -170 && Math.abs(sombrero.hx - 30) < 4, 'sombrero: mano en el ala');
  const gafas = armPoints(1, REACCIONES.gafas.pose(0.28, 0).armR); assert.ok(Math.abs(gafas.hx - 10) < 4 && gafas.hy < -145, 'gafas: dedo en el puente');
});

test('reaccionDe: cada cambio del diseñador tiene su reacción; lo que no, null (tabla de siempre)', () => {
  assert.equal(reaccionDe('hat')[0], 'sombrero');
  assert.equal(reaccionDe('hair', { campo: 'hairStyle' })[0], 'peinado');
  assert.deepEqual(reaccionDe('hair', { campo: 'hair' }), ['color', REACCIONES.color.dur, { mirada: MIRADA_COLOR.hair }]);
  assert.equal(reaccionDe('outfit', { campo: 'outfit' })[0], 'prenda'); assert.equal(reaccionDe('outfit', { campo: 'vest' })[0], 'prenda');
  assert.equal(reaccionDe('item')[0], 'objeto');
  assert.equal(reaccionDe('face', { campo: 'glasses' })[0], 'gafas');
  assert.equal(reaccionDe('face', { campo: 'beard' })[0], 'barba');
  assert.deepEqual(reaccionDe('face', { campo: 'skin' })[2], { mirada: MIRADA_COLOR.skin });
  assert.deepEqual(reaccionDe('color', { campo: 'shoes' })[2], { mirada: MIRADA_COLOR.shoes }, 'mira a los pies');
  assert.deepEqual(reaccionDe('color', { campo: 'inventado' })[2], { mirada: MIRADA_COLOR.coat });
  for (const t of ['preset', 'world', 'sorpresa', 'deshacer', 'sugerencia', 'guardar', 'cargar', 'face']) assert.equal(reaccionDe(t), null, t);
  for (const [n, d, o] of [reaccionDe('hat'), reaccionDe('color', { campo: 'hair' })].map(r => r)) assert.deepEqual(erroresDePose(REACCIONES[n].pose(d / 2, 1, o)), [], n);
  // La mirada se aplica: con color del sombrero mira arriba; con zapatos, abajo.
  assert.ok(REACCIONES.color.pose(0.35, 0, { mirada: MIRADA_COLOR.hatColor }).lookY < -5);
  assert.ok(REACCIONES.color.pose(0.35, 0, { mirada: MIRADA_COLOR.shoes }).lookY > 5);
});

test('cámara: encuadre por pestaña solo en el paso 1; foco en cabeza, pecho o mano; interpolación con ease-out', () => {
  assert.equal(encuadreDe(1, 'cara'), ENCUADRES.cara); assert.equal(encuadreDe(1, 'pelo'), ENCUADRES.pelo);
  assert.equal(encuadreDe(1, 'ropa'), ENCUADRES.ropa); assert.equal(encuadreDe(1, 'objeto'), ENCUADRES.objeto);
  assert.equal(encuadreDe(1, 'inventada'), ENCUADRES.general);
  for (const p of [0, 2, 3]) assert.equal(encuadreDe(p, 'cara'), ENCUADRES.general, 'paso ' + p);
  assert.equal(ENCUADRES.cara.zoom, 1.9); assert.equal(ENCUADRES.ropa.zoom, 1.25); assert.equal(ENCUADRES.objeto.zoom, 1.45); assert.equal(ENCUADRES.general.zoom, 1);
  const P = poseFor('still');
  assert.deepEqual(focoDe('head', P), [0, -150 + P.headY]);
  assert.deepEqual(focoDe('chest', P), [0, -30]);
  const [hx, hy] = manoDerecha(P), [fx, fy] = focoDe('handR', P);
  assert.equal(fx, hx); assert.ok(fy < hy, 'la mano con su objeto, un poco más arriba');
  assert.deepEqual(focoDe(null, P), [0, 0]);
  const a = { zoom: 1, fx: 100, fy: 200 }, b = { zoom: 1.9, fx: 180, fy: 90 };
  assert.deepEqual(mezclarCamara(a, b, 0), a); assert.deepEqual(mezclarCamara(a, b, 1), b); assert.deepEqual(mezclarCamara(a, b, 7), b);
  const m = mezclarCamara(a, b, 0.5);
  assert.ok(m.zoom > 1.45 && m.zoom < 1.9, 'ease-out: a mitad de tiempo ya pasó la mitad del camino');
  assert.ok(m.fx > 140 && m.fy < 145);
  assert.equal(CAMARA_MS, 350);
});

test('erroresDePose: detecta NaN, brazos rotos y ojos desconocidos', () => {
  const ok = poseFor('talk', 0.3, 1); assert.deepEqual(erroresDePose(ok), []);
  assert.ok(erroresDePose({ ...ok, lookX: NaN }).some(e => e.startsWith('lookX')));
  assert.ok(erroresDePose({ ...ok, armR: [1] }).some(e => e.startsWith('armR')));
  assert.ok(erroresDePose({ ...ok, eyes: 'laser' }).length === 1);
  assert.ok(erroresDePose({ ...ok, squash: 2 }).length === 1);
  assert.ok(erroresDePose(null).length === 1);
});
