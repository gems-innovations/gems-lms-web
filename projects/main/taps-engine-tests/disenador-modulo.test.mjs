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
