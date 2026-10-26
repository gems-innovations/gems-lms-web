// disenador.js (PR-6): el módulo del diseñador se limpia solo. Sin navegador: se lee el código y se comprueba el contrato que
// garantiza la limpieza (todo temporizador pasa por `esperar`, `destruir` los cancela, quita window.tapsMedicion y respeta
// `limpiarHash`). El comportamiento vivo lo cubren tap-disenador.component.spec.ts y e2e/taps-crear.spec.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const codigo = readFileSync(new URL('../public/taps-engine/disenador.js', import.meta.url), 'utf8');
const cuerpo = codigo.slice(codigo.indexOf('export async function montarDisenador'));

test('disenador.js: ningún setTimeout suelto; todos pasan por esperar() y destruir() los cancela', () => {
  const sueltos = [...cuerpo.matchAll(/\bsetTimeout\(/g)];
  assert.equal(sueltos.length, 1, 'solo el de la definición de esperar()');
  assert.match(cuerpo, /const esperar = \(fn, ms\) => \{ const id = setTimeout\(/);
  assert.match(cuerpo, /for \(const t of temporizadores\) clearTimeout\(t\);/);
  assert.ok((cuerpo.match(/\besperar\(/g) ?? []).length >= 12, 'los temporizadores del prototipo usan esperar()');
});

test('disenador.js: destruir() quita window.tapsMedicion y los oyentes; limpiarHash sustituye a history.replaceState', () => {
  assert.match(cuerpo, /delete window\.tapsMedicion/);
  assert.match(cuerpo, /for \(const \[t, ev, fn\] of oyentes\) t\.removeEventListener\(ev, fn\);/);
  assert.match(cuerpo, /if \(opciones\.limpiarHash\) opciones\.limpiarHash\(\); else history\.replaceState\(null, '', location\.pathname \+ location\.search\);/);
  assert.equal((cuerpo.match(/history\.replaceState/g) ?? []).length, 1);
  assert.doesNotMatch(cuerpo, /document\.addEventListener\(|\n\s*addEventListener\(/, 'oyentes de documento/ventana solo con escuchar()');
});

test('disenador.js (PR-D3): JSON crudo solo con ?dev=1, «Copiar JSON» ya no existe, textos del paso y pista con tope por navegador', () => {
  assert.match(cuerpo, /const modoDev = \/\(\^\|\[\?&\]\)dev=1\(&\|\$\)\/\.test\(location\.search\);/);
  assert.match(cuerpo, /\$\('json'\)\.hidden = !modoDev;/);
  assert.doesNotMatch(codigo, /Copiar JSON|Exportar JSON|id=\\"copiar\\"/, 'microcopy para desarrolladores fuera de la vista');
  assert.match(codigo, /Descargar archivo del personaje/);
  assert.match(codigo, /role=\\"tablist\\"/); assert.match(cuerpo, /ArrowRight/); assert.match(cuerpo, /ArrowLeft/);
  assert.match(codigo, /Aquí van los personajes que guardes/);
  assert.match(cuerpo, /almacen\.escribir\(CLAVE_PISTA, String\(veces \+ 1\)\)/);
  assert.match(cuerpo, /id = 'reintentar'/);
  assert.match(cuerpo, /e\.clientX - origenX, e\.clientY - origenY\) > 8\) soltar\(\)/, 'comparar se cancela al mover > 8 px');
});

test('disenador.js (PR-D4): reacciones y frases vienen de sus módulos; la cámara pasa por encuadrar() y respeta movimiento reducido', () => {
  assert.match(codigo, /from '\.\/themes\/epoca\/reacciones\.js'/); assert.match(codigo, /from '\.\/themes\/epoca\/frases\.js'/);
  assert.doesNotMatch(cuerpo, /const FRASES = \{/, 'las frases ya no viven en disenador.js');
  assert.match(cuerpo, /const propia = reaccionDe\(tipo, detalle\);/);
  assert.match(cuerpo, /decir\(frases\.frase\(tipoFrase, estado\.base\)\)/);
  assert.match(cuerpo, /camaraT = reducido \|\| !camaraOrigen \? 1 : 0;/, 'con movimiento reducido el corte es directo');
  assert.match(cuerpo, /ctx\.scale\(camara\.zoom, camara\.zoom\); ctx\.translate\(-camara\.fx, -camara\.fy\);/);
  assert.match(cuerpo, /QUIETA\[nombre\] \?\? QUIETA_REACCION\[nombre\] \?\? 'still'/);
  assert.doesNotMatch(codigo, /themes\/epoca\/rig\.js'[^\n]*\n[\s\S]*export function (base|drawHost)/, 'rig.js no se toca desde aquí');
});

test('disenador.js (PR-D3): títulos por paso y botones de avanzar según §2 del plan', async () => {
  const m = await import('../public/taps-engine/disenador.js').catch(() => null);
  // El módulo importa código de navegador: si no se puede cargar en Node, se comprueba sobre el texto.
  const titulos = m?.TITULOS_PASO ?? JSON.parse(codigo.match(/TITULOS_PASO = Object\.freeze\((\[[^\]]+\])\)/)[1].replace(/'/g, '"'));
  const botones = m?.BOTON_SIGUIENTE ?? JSON.parse(codigo.match(/BOTON_SIGUIENTE = Object\.freeze\((\[[^\]]+\])\)/)[1].replace(/'/g, '"'));
  assert.deepEqual([...titulos], ['Elige quién eres', 'Hazlo tuyo', 'Dónde vive', 'Lo hiciste']);
  assert.deepEqual([...botones], ['Siguiente', 'Ponlo en su mundo', 'Terminar', 'Empezar otro']);
});
