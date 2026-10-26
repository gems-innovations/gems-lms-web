// Partículas del diseñador (PR-D5, disenador-v2-plan.md §4): el pool nunca pasa de 40, con movimiento reducido nada se emite,
// cada tipo vive lo que dice VIDA, y degradar() (fps-bajo) recorta las ráfagas. Módulo puro: se prueba con un ctx de mentira.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PARTICULAS, RAFAGA, TIPOS, VIDA, crearParticulas } from '../public/taps-engine/themes/epoca/particulas.js';

/** Generador determinista (LCG) para que las pruebas no dependan de Math.random. */
function azar(semilla = 7) { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
/** Un CanvasRenderingContext2D de cartón: cuenta llamadas y comprueba que save/restore van en pareja. */
function ctxFalso() {
  const c = { profundidad: 0, maxima: 0, trazos: 0, rellenos: 0, globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, shadowBlur: 0, shadowColor: '' };
  for (const m of ['beginPath', 'translate', 'rotate', 'scale', 'arc']) c[m] = () => {};
  c.save = () => { c.profundidad++; c.maxima = Math.max(c.maxima, c.profundidad); };
  c.restore = () => { c.profundidad--; assert.ok(c.profundidad >= 0, 'restore sin save'); };
  c.fill = () => { c.rellenos++; }; c.fillRect = () => { c.rellenos++; }; c.stroke = () => { c.trazos++; };
  return c;
}
const total = (p, n) => { let s = 0; for (let i = 0; i < n; i++) s += p.confeti(100, 100, ['#aa0000', '#00aa00']); return s; };

test('particulas: el pool nunca pasa de 40 aunque se emitan miles (se recicla la más vieja)', () => {
  const p = crearParticulas({ azar: azar() });
  assert.equal(p.max, MAX_PARTICULAS); assert.equal(p.tamanoPool, 40);
  let emitidas = 0;
  for (let i = 0; i < 200; i++) {
    emitidas += p.confeti(50, 50, ['#fff']) + p.polvo(10, 10) + p.anillo(0, 0, 50, 50);
    assert.ok(p.vivas() <= MAX_PARTICULAS, `vivas ${p.vivas()} tras la ráfaga ${i}`);
    assert.equal(p.tamanoPool, 40, 'el pool no crece');
  }
  assert.ok(emitidas > 1000);
  assert.equal(p.vivas(), 40, 'lleno: recicla, no descarta');
  // Un pool más chico respeta su tope y nunca sube por encima de 40 aunque se pida más.
  assert.equal(crearParticulas({ max: 12 }).max, 12);
  assert.equal(crearParticulas({ max: 500 }).max, 40);
  assert.equal(crearParticulas({ max: 0 }).max, 40);
});

test('particulas: con movimiento reducido ningún emisor emite y no hay nada que pintar', () => {
  const p = crearParticulas({ reducido: true, azar: azar() });
  assert.equal(p.reducido, true);
  assert.equal(p.polvo(10, 10), 0); assert.equal(p.anillo(0, 0, 10, 10), 0); assert.equal(total(p, 10), 0);
  assert.equal(p.vivas(), 0);
  const c = ctxFalso();
  assert.equal(p.dibujar(c), 0); assert.equal(c.rellenos + c.trazos, 0);
  assert.equal(p.paso(0.016), 0);
});

test('particulas: cada tipo vive lo que dice VIDA (±) y se apaga sola; paso() ignora dt inválidos', () => {
  for (const tipo of TIPOS) {
    const p = crearParticulas({ azar: azar(3) });
    if (tipo === 'polvo') p.polvo(20, 30); else if (tipo === 'anillo') p.anillo(0, 0, 100, 100); else p.confeti(50, 0, ['#123456']);
    assert.equal(p.vivas(), RAFAGA[tipo], tipo + ': emite su ráfaga');
    assert.equal(p.paso(NaN), RAFAGA[tipo]); assert.equal(p.paso(-1), RAFAGA[tipo]); assert.equal(p.paso(0), RAFAGA[tipo]);
    let t = 0; while (p.vivas() && t < 10) { p.paso(0.02); t += 0.02; }
    assert.ok(t >= VIDA[tipo] * 0.7 && t <= VIDA[tipo] * 1.15 + 0.03, `${tipo}: murió a los ${t.toFixed(2)} s (VIDA ${VIDA[tipo]})`);
    assert.equal(p.vivas(), 0);
  }
});

test('particulas: dibujar() pinta una vez por partícula viva con save/restore en pareja y el confeti cae', () => {
  const p = crearParticulas({ azar: azar(11) }), c = ctxFalso();
  p.polvo(10, 10); p.anillo(0, 0, 80, 80); p.confeti(100, 100, ['#f00', '#0f0', '#00f']);
  const vivas = p.vivas();
  assert.equal(vivas, RAFAGA.polvo + RAFAGA.anillo + RAFAGA.confeti);
  assert.equal(p.dibujar(c), vivas);
  assert.equal(c.profundidad, 0); assert.equal(c.maxima, 1);
  assert.equal(c.trazos, RAFAGA.anillo); assert.equal(c.rellenos, RAFAGA.polvo + RAFAGA.confeti);
  // Gravedad: tras medio segundo el confeti ya baja (vy > 0) aunque salió hacia arriba.
  p.limpiar(); p.confeti(0, 0, ['#fff'], { n: 1 });
  for (let i = 0; i < 25; i++) p.paso(0.02);
  assert.equal(p.vivas(), 1);
});

test('particulas: degradar() (fps-bajo) deja la mitad por ráfaga, mínimo 1, y limpiar() vacía', () => {
  const p = crearParticulas({ azar: azar() });
  assert.equal(p.degradado, false);
  p.degradar(); assert.equal(p.degradado, true);
  assert.equal(p.polvo(0, 0), Math.ceil(RAFAGA.polvo / 2));
  assert.equal(p.anillo(0, 0, 1, 1), 1);
  assert.equal(p.confeti(0, 0), Math.ceil(RAFAGA.confeti / 2));
  assert.ok(p.vivas() > 0); p.limpiar(); assert.equal(p.vivas(), 0);
  // Sin sombra en gama baja: dibujar no toca shadowBlur.
  p.polvo(0, 0); const c = ctxFalso(); p.dibujar(c); assert.equal(c.shadowBlur, 0);
});

test('particulas: el confeti sin colores usa oro y acepta colores del look; el polvo acepta color propio', () => {
  const p = crearParticulas({ azar: azar(5) });
  assert.equal(p.confeti(0, 0, [], { n: 3 }), 3); assert.equal(p.confeti(0, 0, [null, '', '#abcdef'], { n: 2 }), 2);
  assert.equal(p.polvo(0, 0, { color: '#ffffff', n: 2 }), 2);
  assert.equal(p.vivas(), 7);
});
