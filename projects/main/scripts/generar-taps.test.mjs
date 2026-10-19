// Pruebas del generador de Taps:  npm run taps:test   (node --test, sin dependencias)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LIMITES, RUTAS, asignarEscena, construir, emitir, generar, leerBancos, leerRetos, leerTemas, validarPregunta } from './generar-taps.mjs';

const clonar = o => structuredClone(o);
const retos = leerRetos();
const temas = leerTemas();
const bancosReales = leerBancos();

/** Un banco mínimo válido por cada tema (5 preguntas por Tap, el primer Tap es el de gancho). */
function bancoMinimo(prefijo, subtema = 'mixto') {
  const preguntas = Array.from({ length: 10 }, (_, i) => ({
    id: `${prefijo}p${i}`, q: `¿Pregunta ${i}?`, options: ['uno', 'dos', 'tres', 'cuatro'], answer: i % 4, why: 'Porque sí.',
    dificultad: 1, subtema, estado: 'revisada',
  }));
  return {
    tema: prefijo,
    titulosResultado: [{ min: 0, title: 'A', line: 'a' }, { min: 2, title: 'B', line: 'b' }, { min: 4, title: 'C', line: 'c' }],
    existentes: [],
    preguntas,
    taps: [
      { id: `${prefijo}-gancho`, titulo: 'Gancho', nivel: 'facil', subtema, gancho: true, preguntas: preguntas.slice(0, 5).map(p => p.id) },
      { id: `${prefijo}-dos`, titulo: 'Dos', nivel: 'media', subtema, preguntas: preguntas.slice(5).map(p => p.id) },
    ],
  };
}
const bancosMinimos = () => ({ minecraft: bancoMinimo('mc'), logica: bancoMinimo('lg'), cultura: bancoMinimo('cu') });
const correr = bancos => generar(bancos, retos, temas);

test('el banco real genera 53 Taps de 5 preguntas sin errores', () => {
  const r = construir();
  assert.deepEqual(r.errores, []);
  assert.equal(r.taps.length, 53);
  assert.ok(r.taps.every(t => t.questions.length === LIMITES.preguntasPorTap));
});

test('el archivo generado en git coincide con el banco (si falla: npm run taps:generar)', () => {
  const r = construir();
  assert.equal(readFileSync(RUTAS.salida, 'utf8').split('\r\n').join('\n'), r.texto);   // con autocrlf en Windows el archivo trae CRLF
});

test('ids de Tap y de pregunta únicos en todo el banco', () => {
  const { taps } = construir();
  assert.equal(new Set(taps.map(t => t.id)).size, taps.length);
  const preguntas = taps.flatMap(t => t.questions.map(q => q.id));
  assert.equal(new Set(preguntas).size, preguntas.length);
});

test('un banco mínimo válido genera sus Taps', () => {
  const r = correr(bancosMinimos());
  assert.deepEqual(r.errores, []);
  assert.equal(r.taps.length, 6);
  assert.equal(r.taps[0].hook, true);
  assert.equal(r.taps[0].topic, 'minecraft');
  assert.equal(r.taps[2].theme, 'estudio');
});

test('rechaza una pregunta de más de 120 caracteres', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0].q = 'x'.repeat(121);
  assert.match(correr(b).errores.join('\n'), /el enunciado tiene 121 caracteres \(máximo 120\)/);
});

test('acepta exactamente 120 caracteres', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0].q = 'x'.repeat(120);
  assert.deepEqual(correr(b).errores, []);
});

test('rechaza opciones de más de 22 caracteres y explicaciones de más de 90', () => {
  const b = bancosMinimos();
  b.logica.preguntas[1].options[2] = 'o'.repeat(23);
  b.cultura.preguntas[2].why = 'w'.repeat(91);
  const e = correr(b).errores.join('\n');
  assert.match(e, /tiene 23 caracteres \(máximo 22\)/);
  assert.match(e, /la explicación tiene 91 caracteres \(máximo 90\)/);
});

test('rechaza que no sean 4 opciones', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0].options = ['a', 'b', 'c'];
  assert.match(correr(b).errores.join('\n'), /exactamente 4 opciones/);
});

test('rechaza un índice de respuesta fuera de las opciones', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0].answer = 4;
  b.minecraft.preguntas[1].answer = -1;
  b.minecraft.preguntas[2].answer = 1.5;
  assert.equal(correr(b).errores.filter(e => /no es el índice de una opción/.test(e)).length, 3);
});

test('rechaza ids de pregunta repetidos, también entre temas', () => {
  const b = bancosMinimos();
  b.logica.preguntas[0].id = 'mcp0';
  assert.match(correr(b).errores.join('\n'), /pregunta «mcp0»: el id ya existe en minecraft\.json/);
});

test('rechaza ids de Tap repetidos', () => {
  const b = bancosMinimos();
  b.cultura.taps[1].id = 'mc-dos';
  assert.match(correr(b).errores.join('\n'), /Tap «mc-dos»: id repetido/);
});

test('rechaza un Tap que no tiene exactamente 5 preguntas', () => {
  const b = bancosMinimos();
  b.minecraft.taps[1].preguntas.pop();
  assert.match(correr(b).errores.join('\n'), /Tap «mc-dos»: tiene 4 preguntas \(deben ser 5\)/);
});

test('rechaza una pregunta que no existe y una repetida dentro del Tap', () => {
  const b = bancosMinimos();
  b.minecraft.taps[0].preguntas[0] = 'no-existe';
  b.logica.taps[1].preguntas[1] = b.logica.taps[1].preguntas[0];
  const e = correr(b).errores.join('\n');
  assert.match(e, /no existe la pregunta «no-existe»/);
  assert.match(e, /Tap «lg-dos»: repite una pregunta/);
});

test('rechaza preguntas en borrador o retiradas dentro de un Tap publicado', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0].estado = 'borrador';
  b.logica.preguntas[0].estado = 'retirada';
  const e = correr(b).errores.join('\n');
  assert.match(e, /«mcp0» sigue en borrador/);
  assert.match(e, /«lgp0» está retirada/);
});

test('un Tap retirado no se publica y su id queda en la lista de retirados', () => {
  const b = bancosMinimos();
  b.cultura.taps[1].retirado = true;
  b.cultura.preguntas[9].estado = 'borrador';        // un Tap retirado no se valida a fondo
  const r = correr(b);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.retirados, ['cu-dos']);
  assert.equal(r.taps.some(t => t.id === 'cu-dos'), false);
});

test('el primer Tap de cada tema debe ser el de gancho', () => {
  const b = bancosMinimos();
  b.logica.taps[0].gancho = false;
  assert.match(correr(b).errores.join('\n'), /el primer Tap del tema debe ser el de gancho/);
});

test('rechaza títulos de resultado sin el 0 o desordenados', () => {
  const b = bancosMinimos();
  b.minecraft.titulosResultado[0].min = 1;
  b.logica.titulosResultado[2].min = 1;
  const e = correr(b).errores.join('\n');
  assert.match(e, /debe empezar en 0 aciertos/);
  assert.match(e, /los min de los títulos deben subir/);
});

test('resuelve las preguntas «existentes» de retos.data.ts y falla si no existen', () => {
  const b = bancosMinimos();
  b.minecraft.existentes = [{ id: 'no-esta-en-retos', origen: 'BLOQUES' }];
  assert.match(correr(b).errores.join('\n'), /«no-esta-en-retos» no está en BLOQUES/);
});

test('JSON inválido o archivo ausente dan un mensaje claro', () => {
  assert.throws(() => leerBancos('/carpeta/que/no/existe'), /Falta minecraft\.json/);
});

test('validarPregunta describe cada problema con el id', () => {
  const e = validarPregunta({ id: 'Mal Id', q: '', options: ['a', 'a', 'b', 'c'], answer: 9, why: '' }, 'p');
  assert.ok(e.length >= 5);
  assert.ok(e.every(m => m.startsWith('p: ')));
});

test('la asignación de escena es determinista y variada', () => {
  const a = asignarEscena('minecraft', 'redstone', 0, 3, false);
  assert.deepEqual(a, asignarEscena('minecraft', 'redstone', 0, 3, false));
  assert.equal(a.world, 'cueva');
  assert.equal(a.item, 'pick');
  assert.equal(asignarEscena('minecraft', 'nether-end', 0, 0, false).world, 'nether');
  assert.equal(asignarEscena('minecraft', 'nether-end', 0, 0, false).item, 'sword');
  assert.deepEqual(asignarEscena('logica', 'mixto', 0, 0, true), { world: 'aula', host: 'chispa', item: 'lupa' });
  assert.deepEqual(asignarEscena('cultura', 'cuerpo-humano', 0, 0, false).item, 'matraz');
  assert.notEqual(asignarEscena('minecraft', 'mobs', 0, 0, false).world + asignarEscena('minecraft', 'mobs', 1, 1, false).world,
    asignarEscena('minecraft', 'mobs', 0, 0, false).world.repeat(2));
});

test('en el banco real la escena varía: varios mundos, objetos y personajes por tema', () => {
  const { taps } = construir();
  for (const theme of ['minecraft', 'estudio']) {
    const del = taps.filter(t => t.theme === theme);
    assert.ok(new Set(del.map(t => t.scene.world)).size >= 3, `${theme}: pocos mundos`);
    assert.ok(new Set(del.map(t => t.scene.item)).size >= 3, `${theme}: pocos objetos`);
    assert.ok(new Set(del.map(t => t.scene.host)).size >= 2, `${theme}: pocos personajes`);
  }
  assert.ok(taps.filter(t => t.subtopic === 'nether-end').every(t => ['nether', 'end'].includes(t.scene.world)));
  assert.ok(taps.filter(t => t.subtopic === 'redstone').every(t => t.scene.world === 'cueva' || t.scene.world === 'noche'));
});

test('emitir produce el mismo texto para los mismos datos', () => {
  const r = construir();
  assert.equal(emitir(r), emitir(clonar(r)));
});
