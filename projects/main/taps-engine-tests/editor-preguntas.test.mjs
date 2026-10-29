// Lógica pura del editor de preguntas de /crear (PR-W0): validación con los límites del banco, parser de «pegar texto», plantillas y borrador local.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EJEMPLO_PEGADO, LIM, PLANTILLAS, RESULTADOS_DEFECTO, VF, cambiarTipo, estadoDePlantilla, estadoNuevo, leerEstado, paraVista, parsearTexto,
  preguntaNueva, preguntasJugables, resumenEstado, resumenPregunta, serializarEstado, validarPregunta, validarResultados,
} from '../public/taps-engine/editor-preguntas.js';

const buena = () => ({ tipo: 'clasica', q: '¿Cuánto es 2 + 2?', options: ['3', '4', '5', '6'], answer: 1, why: 'Dos y dos son cuatro.' });

test('límites del banco', () => {
  assert.deepEqual({ q: LIM.q, opcion: LIM.opcion, why: LIM.why, preguntas: LIM.preguntas }, { q: 120, opcion: 22, why: 90, preguntas: 5 });
});

test('validarPregunta: completa, faltas sin gritar y errores con mensaje humano', () => {
  assert.equal(validarPregunta(buena()).completa, true);
  const vacia = validarPregunta(preguntaNueva());
  assert.equal(vacia.completa, false); assert.equal(vacia.hayError, false);
  assert.deepEqual(vacia.falta, ['la pregunta', 'la opción A', 'la opción B', 'la opción C', 'la opción D', 'marcar la correcta', 'la explicación']);
  assert.equal(resumenPregunta(validarPregunta(buena())), 'Lista');
  const larga = { ...buena(), q: 'x'.repeat(125), options: ['a'.repeat(25), 'b', 'c', 'c'], why: 'w'.repeat(91) };
  const v = validarPregunta(larga);
  assert.match(v.q, /Se pasa por 5 caracteres/); assert.match(v.opciones[0], /Se pasa por 3\. Máximo 22/);
  assert.match(v.opciones[2], /se repite/); assert.match(v.opciones[3], /se repite/); assert.match(v.why, /Se pasa por 1\. Máximo 90/);
  assert.equal(v.completa, false); assert.equal(v.hayError, true);
  assert.equal(validarPregunta({ ...buena(), q: 'x'.repeat(120), options: ['a'.repeat(22), 'b', 'c', 'd'], why: 'w'.repeat(90) }).completa, true, 'justo en el límite vale');
  assert.equal(validarPregunta({ ...buena(), answer: -1 }).falta[0], 'marcar la correcta');
});

test('tipos: duo tiene 2 opciones, vf Verdadero/Falso fijas; cambiar conserva lo escrito', () => {
  const d = cambiarTipo(buena(), 'duo');
  assert.deepEqual(d.options, ['3', '4']); assert.equal(d.answer, 1);
  assert.equal(cambiarTipo({ ...buena(), answer: 3 }, 'duo').answer, -1, 'la correcta que ya no existe se desmarca');
  const vf = cambiarTipo(buena(), 'vf');
  assert.deepEqual(vf.options, [...VF]); assert.equal(validarPregunta({ ...vf, why: 'x' }).completa, true);
  assert.deepEqual(cambiarTipo(vf, 'clasica').options, ['', '', '', '']);
  assert.equal(cambiarTipo(buena(), 'inventado').tipo, 'clasica');
});

test('las 4 plantillas están completas, dentro de los límites y juegan', () => {
  assert.equal(PLANTILLAS.length, 4);
  for (const pl of PLANTILLAS) {
    assert.equal(pl.preguntas.length, 5, pl.nombre);
    const est = estadoDePlantilla(pl.id);
    assert.equal(resumenEstado(est).cinco, true, pl.nombre);
    assert.equal(preguntasJugables(est).length, 5);
    assert.ok(new Set(pl.preguntas.map(p => p.answer)).size > 1, 'la correcta cambia de lugar');
    assert.ok(pl.preguntas.some(p => p.tipo === 'vf') && pl.preguntas.some(p => p.tipo === 'duo'));
  }
  assert.equal(estadoDePlantilla('no-existe').preguntas.length, 1);
});

test('parsearTexto: el ejemplo se entiende sin avisos', () => {
  const r = parsearTexto(EJEMPLO_PEGADO);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.preguntas.length, 2);
  assert.deepEqual(r.preguntas[0], { tipo: 'clasica', q: '¿Cuánto es 7 × 8?', options: ['54', '56', '58', '64'], answer: 1, why: '7 × 8 = 56.' });
  assert.equal(r.preguntas[1].tipo, 'vf'); assert.equal(r.preguntas[1].answer, 0);
});

test('parsearTexto: prefijos, asterisco al final, falso primero, duo y numeración', () => {
  const r = parsearTexto('1. ¿Capital de Francia?\r\nA) Roma\r\nB) París *\r\nC) Madrid\r\nD) Lima\r\n\r\n\r\n2. ¿Es de día?\r\nFalso*\r\nVerdadero\r\n\r\nMejor opción\r\n- Sí\r\n- *No\r\nPorque: sí');
  assert.equal(r.preguntas.length, 3);
  assert.deepEqual(r.preguntas[0].options, ['Roma', 'París', 'Madrid', 'Lima']); assert.equal(r.preguntas[0].answer, 1);
  assert.equal(r.preguntas[0].q, '¿Capital de Francia?');
  assert.equal(r.preguntas[1].tipo, 'vf'); assert.equal(r.preguntas[1].answer, 1, 'Falso marcado = índice 1 en el orden fijo');
  assert.deepEqual(r.preguntas[2], { tipo: 'duo', q: 'Mejor opción', options: ['Sí', 'No'], answer: 1, why: 'sí' });
});

test('parsearTexto: tolerante, nunca lanza y avisa con frases claras', () => {
  for (const basura of [null, undefined, '', '   \n\n  ', 42, {}, '\u0000\u0001', '*', '***\n***\n***']) assert.doesNotThrow(() => parsearTexto(basura));
  assert.match(parsearTexto('').avisos[0], /No encontré preguntas/);
  const a = parsearTexto('Solo una línea').avisos; assert.match(a.join(' '), /no tiene opciones/);
  const b = parsearTexto('P\nuno\ndos\ntres').avisos.join(' '); assert.match(b, /tiene 3 opciones y faltan 1/); assert.match(b, /no marcaste la correcta/);
  assert.match(parsearTexto('P\n*a\n*b\nc\nd').avisos.join(' '), /marcaste 2 correctas/);
  const seis = parsearTexto('P\na\n*b\nc\nd\ne\nf'); assert.match(seis.avisos.join(' '), /dejé las 4 primeras/); assert.equal(seis.preguntas[0].options.length, 4);
  const muchas = parsearTexto(Array.from({ length: 7 }, (_, i) => `P${i}\na\n*b\nc\nd`).join('\n\n'));
  assert.equal(muchas.preguntas.length, 5); assert.match(muchas.avisos.join(' '), /5 preguntas/);
  // Lo largo se conserva (la validación lo marca junto al campo), no se recorta en silencio.
  assert.equal(parsearTexto('P\n' + 'x'.repeat(30) + '\n*y').preguntas[0].options[0].length, 30);
});

test('resultados: 3 a 5 niveles, el primero en 0, mins crecientes, textos acotados', () => {
  assert.equal(validarResultados(RESULTADOS_DEFECTO.map(r => ({ ...r }))).ok, true);
  assert.equal(RESULTADOS_DEFECTO.length, 4); assert.equal(RESULTADOS_DEFECTO[0].min, 0);
  assert.match(validarResultados(RESULTADOS_DEFECTO.slice(0, 2).map(r => ({ ...r }))).general, /entre 3 y 5/);
  assert.match(validarResultados([{ min: 1, title: 'a', line: 'b' }, { min: 2, title: 'a', line: 'b' }, { min: 3, title: 'a', line: 'b' }]).general, /0 aciertos/);
  assert.match(validarResultados([{ min: 0, title: 'a', line: 'b' }, { min: 2, title: 'a', line: 'b' }, { min: 2, title: 'a', line: 'b' }]).general, /subir/);
  const r = validarResultados([{ min: 0, title: 'x'.repeat(41), line: 'b' }, { min: 2, title: '', line: 'b' }, { min: 4, title: 'a', line: 'l'.repeat(91) }]);
  assert.match(r.niveles[0], /pasa por 1/); assert.match(r.niveles[1], /Escribe el título/); assert.match(r.niveles[2], /frase se pasa/);
});

test('borrador local: ida y vuelta, versionado y a prueba de datos rotos', () => {
  const est = estadoDePlantilla('cultura'); est.actual = 3;
  const de = leerEstado(serializarEstado(est));
  assert.deepEqual(de.preguntas, est.preguntas); assert.equal(de.actual, 3);
  for (const malo of [null, '', 'no es json', '{"v":2,"preguntas":[{}]}', '{"v":1,"preguntas":[]}', '{"v":1,"preguntas":"x"}', '[]']) assert.equal(leerEstado(malo), null);
  const raro = leerEstado(JSON.stringify({ v: 1, preguntas: [{ tipo: 'raro', q: 5, options: [1, 'a'], answer: 9, why: null }, null, ...Array(9).fill(buena())], resultados: 'x', actual: 99 }));
  assert.equal(raro.preguntas.length, 5, 'tope de 5 y se descartan nulos'); assert.equal(raro.preguntas[0].tipo, 'clasica'); assert.equal(raro.preguntas[0].answer, -1);
  assert.deepEqual(raro.resultados, RESULTADOS_DEFECTO); assert.equal(raro.actual, 4);
  assert.equal(leerEstado(JSON.stringify({ v: 1, preguntas: [{ q: 'x'.repeat(9999) }] })).preguntas[0].q.length, 400, 'sin textos descomunales');
  assert.deepEqual(Object.keys(JSON.parse(serializarEstado(estadoNuevo()))).sort(), ['actual', 'preguntas', 'resultados', 'v']);
});

test('jugables y vista: solo lo que se puede jugar; la vista rellena huecos', () => {
  const est = { ...estadoNuevo(), preguntas: [buena(), preguntaNueva(), { ...buena(), answer: -1 }] };
  const j = preguntasJugables(est);
  assert.equal(j.length, 1); assert.deepEqual(Object.keys(j[0]), ['q', 'options', 'answer', 'why', 'tipo']);
  assert.deepEqual(paraVista(preguntaNueva()), { q: 'Escribe tu pregunta', options: ['…', '…', '…', '…'], answer: -1, why: '' });
  assert.deepEqual(paraVista(preguntaNueva('vf')).options, [...VF]);
});

test('disenador.js carga en Node y su plantilla trae el paso Preguntas (interno 4) vacío' , async () => {
  const m = await import('../public/taps-engine/disenador.js');
  assert.match(m.PLANTILLA, /data-p="4" id="pantallaPreguntas" aria-label="Preguntas"><\/section>/);
  assert.equal([...m.PLANTILLA.matchAll(/<section class="pantalla/g)].length, 5);
});
