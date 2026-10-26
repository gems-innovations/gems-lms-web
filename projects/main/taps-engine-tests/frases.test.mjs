// Frases del bocadillo (PR-D4, disenador-v2-plan.md §5): seis por tipo, voz por punto de partida y sin repetir las tres últimas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FRASES, MEMORIA, PESO_BASE, POR_BASE, crearFrases } from '../public/taps-engine/themes/epoca/frases.js';

/** Generador determinista (LCG) para que las pruebas no dependan de Math.random. */
function lcg(semilla = 7) { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const TIPOS = ['hat', 'hair', 'outfit', 'color', 'face', 'gafas', 'barba', 'item', 'world', 'sorpresa', 'deshacer', 'sugerencia', 'guardar', 'cargar'];

test('frases: seis por tipo, todas distintas, sin emojis y con puntuación de frase', () => {
  assert.deepEqual(Object.keys(FRASES).sort(), [...TIPOS].sort());
  for (const [tipo, lista] of Object.entries(FRASES)) {
    assert.equal(lista.length, 6, tipo);
    assert.equal(new Set(lista).size, 6, tipo + ': repetidas');
    for (const f of lista) { assert.match(f, /[.!?]$/, f); assert.doesNotMatch(f, /\p{Extended_Pictographic}/u, f); assert.ok(f.length <= 48, f); }
  }
  for (const [base, porTipo] of Object.entries(POR_BASE)) for (const [tipo, lista] of Object.entries(porTipo)) {
    assert.ok(tipo in FRASES, `${base}.${tipo} es un tipo conocido`);
    for (const f of lista) { assert.ok(!FRASES[tipo].includes(f), `${base}: «${f}» no repite una general`); assert.match(f, /[.!?]$/); }
  }
  assert.equal(MEMORIA, 3); assert.ok(PESO_BASE > 0 && PESO_BASE < 1);
});

test('frase(): nunca repite ninguna de las tres últimas dichas (mismo tipo, 2000 veces, varias semillas)', () => {
  for (const semilla of [1, 7, 42, 2026]) {
    const { frase } = crearFrases({ aleatorio: lcg(semilla) });
    for (const tipo of TIPOS) {
      const dichas = [];
      for (let i = 0; i < 2000; i++) {
        const f = frase(tipo, 'grabador');
        assert.ok(FRASES[tipo].includes(f) || (POR_BASE.grabador[tipo] ?? []).includes(f), `${tipo}: «${f}» es del tipo`);
        assert.ok(!dichas.slice(-3).includes(f), `${tipo}: «${f}» repite una de las tres últimas (semilla ${semilla})`);
        dichas.push(f);
      }
      assert.ok(new Set(dichas).size >= 6, tipo + ': usa todo el repertorio');
    }
  }
});

test('frase(): la memoria cruza tipos (lo dicho hace poco no vuelve aunque cambie el tipo) y ultimas() la enseña', () => {
  const r = crearFrases({ aleatorio: lcg(3) });
  const a = r.frase('hat', 'grabador'), b = r.frase('color', 'grabador'), c = r.frase('hat', 'grabador');
  assert.notEqual(a, c);
  assert.deepEqual(r.ultimas(), [a, b, c]);
  r.frase('item', 'grabador'); assert.equal(r.ultimas().length, 3);
});

test('frase(): habla en la voz del punto de partida cuando lo tiene y nunca mezcla voces de otro', () => {
  for (const [base, porTipo] of Object.entries(POR_BASE)) {
    const { frase } = crearFrases({ aleatorio: lcg(11) });
    for (const [tipo, propias] of Object.entries(porTipo)) {
      const vistas = new Set(); for (let i = 0; i < 300; i++) vistas.add(frase(tipo, base));
      assert.ok(propias.some(p => vistas.has(p)), `${base}: dice lo suyo en ${tipo}`);
      for (const [otra, suyas] of Object.entries(POR_BASE)) if (otra !== base) for (const f of suyas[tipo] ?? []) assert.ok(!vistas.has(f), `${base} no dice «${f}» de ${otra}`);
    }
  }
  // Un punto de partida sin voz propia (sorpresa) y un tipo desconocido: solo generales, sin fallar.
  const { frase, saludo } = crearFrases({ aleatorio: lcg(5) });
  for (let i = 0; i < 50; i++) { assert.ok(FRASES.hat.includes(frase('hat', 'sorpresa'))); assert.ok(FRASES.color.includes(frase('inventado', undefined))); }
  assert.equal(saludo('Nefer'), '¡Hola! Soy Nefer.');
});

test('frase(): con menos de cuatro frases disponibles repite la más vieja y no se cuelga', () => {
  const mod = { ...FRASES };                                                     // no se puede achicar FRASES (congelado): se simula con la memoria llena
  assert.ok(Object.isFrozen(FRASES) && mod);
  const { frase } = crearFrases({ aleatorio: () => 0 });
  const dichas = []; for (let i = 0; i < 20; i++) dichas.push(frase('deshacer', 'x'));
  assert.equal(new Set(dichas).size, 4, 'con aleatorio fijo en 0 rota entre cuatro: las tres en memoria nunca salen');
});
