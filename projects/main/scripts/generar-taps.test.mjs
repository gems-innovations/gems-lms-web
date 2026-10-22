// Pruebas del generador de Taps:  npm run taps:test   (node --test, sin dependencias)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  FONDOS_SUBTEMA, FONDOS_TEMA, LENGUAJES, LIMITES, PLANOS, RETO, RUTAS, TEMAS, TRANSICIONES, asignarEscena, calendarioReto, construir, emitir, generar, hashAvalancha,
  leerBancos, leerRetos, leerTemas, ordenParaTi, ordenSierra, temaDelDia, validarEscena, validarPregunta,
} from './generar-taps.mjs';

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
/** Un banco mínimo de historias: una historia de 3 pasos y una pregunta final (la única que puntúa). */
function bancoHistoriaMinimo() {
  const paso = i => ({
    id: `hi-p${i}`, tipo: 'paso', q: `Paso ${i}: ¿qué haces?`, options: ['Esto', 'Aquello'], consecuencias: ['Pasa esto.', 'Pasa aquello.'],
    subtema: 'prueba', estado: 'revisada',
  });
  const final = { id: 'hi-final', q: '¿Cuál es la verdad?', options: ['uno', 'dos', 'tres', 'cuatro'], answer: 1, why: 'Porque sí.', dificultad: 1, subtema: 'prueba', estado: 'revisada' };
  return {
    tema: 'historias',
    titulosResultado: [{ min: 0, title: 'A', line: 'a' }, { min: 1, title: 'B', line: 'b' }],
    existentes: [],
    preguntas: [paso(1), paso(2), paso(3), final],
    taps: [{ id: 'hi', tipo: 'historia', titulo: 'Historia', nivel: 'facil', subtema: 'prueba', preguntas: ['hi-p1', 'hi-p2', 'hi-p3', 'hi-final'] }],
  };
}
const bancosMinimos = () => ({ minecraft: bancoMinimo('mc'), logica: bancoMinimo('lg'), cultura: bancoMinimo('cu'), tecnologia: bancoMinimo('tc'), historias: bancoHistoriaMinimo() });
const correr = bancos => generar(bancos, retos, temas);

test('el banco real genera 123 Taps de 5 preguntas sin errores', () => {
  const r = construir();
  assert.deepEqual(r.errores, []);
  assert.equal(r.taps.length, 123);
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
  assert.equal(r.taps.length, 9);
  assert.equal(r.taps[0].hook, true);
  assert.equal(r.taps[0].topic, 'minecraft');
  assert.equal(r.taps[2].theme, 'estudio');
  assert.equal(r.taps[4].theme, 'aventura');
  assert.equal(r.taps[6].theme, 'aventura');
  assert.equal(r.taps[6].topic, 'tecnologia');
});

test('formatos duo y vf: 2 opciones, vf con «Verdadero» y «Falso», y el tipo llega al Tap generado', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[1] = { ...b.minecraft.preguntas[1], tipo: 'duo', options: ['Carbón', 'Diamante'], answer: 1 };
  b.minecraft.preguntas[2] = { ...b.minecraft.preguntas[2], tipo: 'vf', options: ['Verdadero', 'Falso'], answer: 0 };
  const r = correr(b);
  assert.deepEqual(r.errores, []);
  assert.equal(r.taps[0].questions[0].tipo, undefined);
  assert.equal(r.taps[0].questions[1].tipo, 'duo');
  assert.equal(r.taps[0].questions[2].tipo, 'vf');
  assert.deepEqual(r.taps[0].questions[2].options, ['Verdadero', 'Falso']);
});

test('rechaza un duo de 4 opciones, un vf con otras opciones, una clásica de 2 y un tipo desconocido', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0] = { ...b.minecraft.preguntas[0], tipo: 'duo' };
  b.minecraft.preguntas[1] = { ...b.minecraft.preguntas[1], tipo: 'vf', options: ['Sí', 'No'], answer: 0 };
  b.minecraft.preguntas[2] = { ...b.minecraft.preguntas[2], options: ['uno', 'dos'], answer: 0 };
  b.minecraft.preguntas[3] = { ...b.minecraft.preguntas[3], tipo: 'trio' };
  const e = correr(b).errores.join('\n');
  assert.match(e, /mcp0»: debe tener exactamente 2 opciones \(formato duo\)/);
  assert.match(e, /mcp1»: verdadero\/falso lleva las opciones \["Verdadero","Falso"\]/);
  assert.match(e, /mcp2»: debe tener exactamente 4 opciones/);
  assert.match(e, /mcp3»: tipo «trio» desconocido/);
});

test('el banco real trae los 4 Taps que mezclan formatos (clásica, duo y vf)', () => {
  const { taps } = construir();
  for (const id of ['mc-duelo-1', 'lg-duelo-1', 'cu-duelo-1', 'cu-duelo-2']) {
    const t = taps.find(x => x.id === id);
    assert.ok(t, `falta ${id}`);
    const tipos = new Set(t.questions.map(q => q.tipo ?? 'clasica'));
    assert.deepEqual([...tipos].sort(), ['clasica', 'duo', 'vf'], `${id} debe mezclar los tres formatos`);
  }
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
  assert.deepEqual(asignarEscena('logica', 'mixto', 0, 0, true), { world: 'aula', host: 'chispa', item: 'lupa', shot: 'centro', enter: 'saluda' });
  const cu = asignarEscena('cultura', 'cuerpo-humano', 0, 3, false);
  assert.equal(cu.item, undefined, 'aventura: sin objeto en la mano');
  assert.equal(cu.host, asignarEscena('cultura', 'otro-subtema', 5, 3, false).host, 'aventura: el personaje lo da el orden');
  assert.equal(asignarEscena('cultura', 'espacio', 0, 3, false).world, 'noche-estrellada', 'el espacio pasa de noche');
  assert.equal(asignarEscena('cultura', 'espacio', 0, 3, false, 'x', 'noche-estrellada').world, 'piramides-noche', 'sin repetir el fondo anterior');
  assert.deepEqual(asignarEscena('cultura', 'mixto', 0, 0, true), { world: 'cielo-nublado', host: 'zorro', shot: 'centro', enter: 'saluda' });
  assert.notEqual(asignarEscena('minecraft', 'mobs', 0, 0, false).world + asignarEscena('minecraft', 'mobs', 1, 1, false).world,
    asignarEscena('minecraft', 'mobs', 0, 0, false).world.repeat(2));
});

test('en el banco real la escena varía: varios mundos, objetos y personajes por tema', () => {
  const { taps } = construir();
  for (const theme of ['minecraft', 'estudio']) {
    const del = taps.filter(t => t.theme === theme);
    assert.ok(new Set(del.map(t => t.scene.world)).size >= 3, `${theme}: pocos mundos`);
    assert.ok(new Set(del.map(t => t.scene.item)).size >= (theme === 'minecraft' ? 3 : 2), `${theme}: pocos objetos`);
    assert.ok(new Set(del.map(t => t.scene.host)).size >= 2, `${theme}: pocos personajes`);
  }
  assert.ok(taps.filter(t => t.subtopic === 'nether-end').every(t => ['nether', 'end'].includes(t.scene.world)));
  assert.ok(taps.filter(t => t.subtopic === 'redstone').every(t => t.scene.world === 'cueva' || t.scene.world === 'noche'));
});

test('cada Tap publicado tiene su lugar propio y el personaje no queda siempre igual al deslizar', () => {
  const { taps } = construir();
  assert.equal(taps.find(t => t.id === 'mc-nether-1').scene.world, 'nether', 'el viaje al Nether pasa en el Nether');
  assert.equal(taps.find(t => t.id === 'mc-end').scene.world, 'end');
  for (const theme of ['minecraft', 'estudio']) {
    const del = taps.filter(t => t.theme === theme);
    assert.ok(new Set(del.map(t => t.scene.shot)).size >= 5, theme + ': pocos encuadres');
    assert.ok(new Set(del.map(t => t.scene.enter)).size >= 3, theme + ': pocas entradas');
    assert.ok(del.filter(t => t.scene.props).length >= (theme === 'minecraft' ? 8 : 6), theme + ': pocos decorados');
  }
  // en los órdenes reales del feed («Para ti» y cada categoría sola), dos Taps seguidos del mismo tema nunca repiten encuadre
  for (const orden of [ordenParaTi(taps), ordenParaTi(taps, true), ...Object.keys(TEMAS).map(k => ordenSierra(taps.filter(t => t.topic === k)))]) {
    // (los ganchos van siempre centrados y saludando: dos ganchos seguidos, al final del feed, no cuentan)
    orden.forEach((t, i) => i && t.theme === orden[i - 1].theme && !(t.hook && orden[i - 1].hook) && assert.notEqual(t.scene.shot, orden[i - 1].scene.shot, t.id + ' repite el encuadre del Tap anterior'));
  }
  assert.ok(new Set(taps.filter(t => t.theme === 'estudio').map(t => t.scene.world)).size >= 7, 'estudio usa sus mundos nuevos');
  // aventura (personajes y fondos del registro): todos aparecen, y dos Taps seguidos no repiten personaje ni fondo
  const av = taps.filter(t => t.theme === 'aventura' && !t.hook && t.topic === 'cultura');
  assert.ok(av.length >= 9, 'cultura usa el tema aventura');
  assert.ok(new Set(av.map(t => t.scene.host)).size >= 9, 'aventura: aparecen todos los personajes');
  assert.ok(new Set(av.map(t => t.scene.world)).size >= 7, 'aventura: aparecen casi todos los fondos');
  assert.ok(av.filter(t => t.subtopic === 'espacio').every(t => FONDOS_SUBTEMA.espacio.includes(t.scene.world)), 'los Taps del espacio pasan de noche');
  av.forEach((t, i) => {
    if (!i) return;
    assert.notEqual(t.scene.host, av[i - 1].scene.host, t.id + ' repite el personaje del Tap anterior');
    assert.notEqual(t.scene.world, av[i - 1].scene.world, t.id + ' repite el fondo del Tap anterior');
  });
  assert.ok(av.every(t => t.scene.item === undefined && t.backdrop.length === 2));
  assert.ok(taps.every(t => typeof t.ground === 'string'), 'cada Tap trae el color de su suelo');
});

test('tecnología: presentadores humanos o el robot (nunca animales), fondos sobrios y gancho con la científica de noche', () => {
  const { taps } = construir();
  const tc = taps.filter(t => t.topic === 'tecnologia');
  assert.equal(tc.length, 20);
  assert.ok(tc.every(t => t.theme === 'aventura' && t.kicker === 'Tecnología'));
  assert.ok(tc.every(t => TEMAS.tecnologia.personajes.includes(t.scene.host)), 'solo cientifica, exploradora, hana y robot');
  assert.equal(new Set(tc.map(t => t.scene.host)).size, 4, 'aparecen los cuatro presentadores');
  assert.ok(tc.every(t => FONDOS_TEMA.tecnologia.includes(t.scene.world)), 'solo fondos sobrios');
  assert.deepEqual(tc.find(t => t.hook).scene, { world: 'noche-estrellada', host: 'cientifica', shot: 'centro', enter: 'saluda', camara: 'travelling', transicion: 'fundido' });
  tc.forEach((t, i) => i && assert.notEqual(t.scene.world, tc[i - 1].scene.world, t.id + ' repite el fondo del Tap anterior'));
  // 3 Taps por subtema con dificultad creciente entre ellos, y escenas de código en los seis subtemas
  for (const sub of ['git', 'programacion', 'redes', 'ciberseguridad', 'ia', 'hardware']) {
    const del = tc.filter(t => t.subtopic === sub);
    assert.deepEqual(del.map(t => t.level), ['facil', 'media', 'dificil'], sub);
    assert.ok(del.some(t => t.questions.some(q => q.escena)), sub + ': sin escena');
  }
  const lenguajes = new Set(tc.flatMap(t => t.questions.filter(q => q.escena?.tipo === 'codigo').map(q => q.escena.lenguaje ?? 'pseudo')));
  for (const l of LENGUAJES) assert.ok(lenguajes.has(l), 'sin escena en ' + l);
  assert.ok(tc.flatMap(t => t.questions).filter(q => q.escena).length >= 22);
  assert.deepEqual([...new Set(tc.flatMap(t => t.questions).map(q => q.tipo ?? 'clasica'))].sort(), ['clasica', 'duo', 'vf']);
  // un lenguaje desconocido se rechaza
  const b = bancosMinimos();
  b.tecnologia.preguntas[0].escena = { tipo: 'codigo', lenguaje: 'cobol', lineas: ['x'] };
  assert.match(correr(b).errores.join(' | '), /«lenguaje» debe ser uno de/);
});

test('reto del día: la rotación está versionada por día y los domingos pasan a Tecnología desde el día 427', () => {
  assert.equal(temaDelDia(6), 'minecraft');
  assert.equal(temaDelDia(426), 'minecraft');
  assert.equal(temaDelDia(427), 'minecraft');
  assert.equal(temaDelDia(433), 'tecnologia');
  assert.equal(RETO.rotaciones[1].desde % 7, 0, 'la rotación nueva empieza un lunes');
  assert.deepEqual(RETO.rotacion, RETO.rotaciones[RETO.rotaciones.length - 1].temas);
  const { taps, calendario } = construir();
  const porId = new Map(taps.map(t => [t.id, t]));
  const tc = calendario.dias.map((id, d) => [id, d]).filter(([id]) => porId.get(id).topic === 'tecnologia');
  assert.equal(tc.length, 19, 'los 19 Taps de Tecnología (sin gancho) entran al calendario');
  assert.ok(tc.every(([, d]) => d >= 427 && d % 7 === 6), 'solo en domingos nuevos');
  assert.equal(new Set(tc.map(([id]) => id)).size, 19);
  // cambiar la rotación no toca los días ya fijados: con la rotación vieja en los días fijos sale lo mismo
  const previo = calendarioReto(taps, null, { ...RETO, dias: 427, rotaciones: [RETO.rotaciones[0]] });
  const nuevo = calendarioReto(taps, previo, RETO);
  assert.deepEqual(nuevo.dias.slice(0, 427), previo.dias);
});

test('objetos para explicar: se copian a la pregunta y se validan contra el catálogo del tema', () => {
  const { taps } = construir();
  const conObjeto = taps.flatMap(t => t.questions.filter(q => q.visual).map(q => [t.theme, q.visual.objeto]));
  assert.ok(conObjeto.length >= 25, 'hay preguntas reales con objeto');
  assert.ok(new Set(conObjeto.map(([, o]) => o)).size >= 8, 'al menos 8 objetos distintos');
  const b = bancosMinimos();
  b.minecraft.preguntas[0].visual = { objeto: 'piston', accion: 'bloquea' };
  b.logica.preguntas[0].visual = { objeto: 'no-existe', accion: 'x' };
  b.cultura.preguntas[0].visual = { objeto: 'planetas', accion: 'volar' };
  const r = correr(b), e = r.errores.join(' | ');
  assert.match(e, /el objeto «no-existe» no existe en el tema/);
  assert.match(e, /no tiene la acción «volar»/);
  assert.deepEqual(r.taps[0].questions[0].visual, { objeto: 'piston', accion: 'bloquea' });
});

test('emitir produce el mismo texto para los mismos datos', () => {
  const r = construir();
  assert.equal(emitir(r), emitir(clonar(r)));
});

test('titulosPorSubtema: cada subtema usa sus títulos y los demás, los del tema', () => {
  const b = bancosMinimos();
  b.minecraft.taps[1].subtema = 'redstone';
  b.minecraft.titulosPorSubtema = { redstone: [{ min: 0, title: 'R0', line: 'r0' }, { min: 2, title: 'R2', line: 'r2' }, { min: 4, title: 'R4', line: 'r4', lineas: ['r4b', 'r4c'] }] };
  const r = correr(b);
  assert.deepEqual(r.errores, []);
  const [gancho, dos] = r.taps;
  assert.equal(gancho.results[0].title, 'A');
  assert.equal(dos.results[0].title, 'R0');
  assert.deepEqual(dos.results[2].lines, ['r4', 'r4b', 'r4c']);
  assert.equal(dos.results[0].lines, undefined);
});

test('rechaza variantes de línea vacías, repetidas o de más', () => {
  const b = bancosMinimos();
  b.logica.titulosResultado[0].lineas = ['a', ''];
  b.cultura.titulosResultado[1].lineas = ['x', 'y', 'z'];
  const r = correr(b);
  assert.ok(r.errores.some(e => /repite su línea/.test(e)));
  assert.ok(r.errores.some(e => /variante de línea vacía/.test(e)));
  assert.ok(r.errores.some(e => /hasta 2 variantes/.test(e)));
});

test('el banco real da títulos por subtema y 3 variantes de línea en cada título', () => {
  const { taps } = construir();
  const mc = taps.filter(t => t.topic === 'minecraft');
  assert.ok(new Set(mc.map(t => t.results.find(x => x.min === 4).title)).size >= 6);
  assert.ok(taps.filter(t => !t.soloEnlace).every(t => t.results.every(x => x.lines?.length === 3)));
});

// ───────────── calendario del reto del día ─────────────
test('el calendario del reto en git coincide con el generado (si falla: npm run taps:generar)', () => {
  const r = construir();
  assert.equal(readFileSync(RUTAS.calendario, 'utf8').split('\r\n').join('\n'), r.textoCalendario);
  assert.equal(r.calendario.dias.length, RETO.dias);
  assert.equal(r.calendario.inicio, RETO.inicio);
});

test('calendario del reto: rota temas, sin Taps de gancho, todos los del tema antes de repetir y subtemas intercalados', () => {
  const { taps, calendario } = construir();
  const porId = new Map(taps.map(t => [t.id, t]));
  const ultimo = new Map(), vistos = new Map();
  calendario.dias.forEach((id, d) => {
    const t = porId.get(id);
    assert.ok(t, `día ${d}: ${id} no está en el banco`);
    assert.ok(!t.hook, `día ${d}: ${id} es de gancho`);
    assert.equal(t.topic, temaDelDia(d), `día ${d}`);
    assert.notEqual(ultimo.get(t.topic), t.subtopic ?? 'mixto', `día ${d}: mismo subtema que el anterior de ${t.topic}`);
    ultimo.set(t.topic, t.subtopic ?? 'mixto');
    vistos.set(t.topic, [...(vistos.get(t.topic) ?? []), id]);
  });
  // Todos los Taps del tema (sin gancho) salen al menos una vez en el calendario.
  for (const [tema, lista] of vistos) {
    const delTema = taps.filter(t => t.topic === tema && !t.hook).map(t => t.id);
    assert.deepEqual(delTema.filter(id => !lista.includes(id)), [], `${tema}: Taps que no entran al reto`);
  }
  // Recién armado (sin días fijos), recorre todos los del tema antes de repetir. En el calendario real los días ya fijados
  // no se reordenan: los Taps agregados después entran en los días que se suman al final.
  const nuevo = calendarioReto(taps, null);
  for (const tema of new Set(taps.filter(t => !t.soloEnlace).map(t => t.topic))) {
    const lista = nuevo.dias.filter(id => porId.get(id).topic === tema), n = taps.filter(t => t.topic === tema && !t.hook).length;
    assert.equal(new Set(lista.slice(0, n)).size, n, tema);
  }
});

test('calendario del reto: solo crece hacia el futuro (agregar Taps no cambia los días ya fijados)', () => {
  const { taps } = construir();
  const previo = calendarioReto(taps, null, { ...RETO, dias: 60 });
  const nuevo = { ...taps.find(t => t.topic === 'minecraft' && !t.hook), id: 'mc-nuevo-de-prueba', subtopic: 'redstone' };
  const despues = calendarioReto([...taps, nuevo], previo, { ...RETO, dias: 120 });
  assert.deepEqual(despues.dias.slice(0, 60), previo.dias);
  assert.equal(despues.dias.length, 120);
  assert.ok(despues.dias.slice(60).includes('mc-nuevo-de-prueba'), 'el Tap nuevo entra en los días agregados');
  // Un Tap retirado se reemplaza solo en los días que lo tenían.
  const retirado = previo.dias[3];
  const sin = calendarioReto(taps.filter(t => t.id !== retirado), previo, { ...RETO, dias: 60 });
  previo.dias.forEach((id, d) => { if (id !== retirado) assert.equal(sin.dias[d], id); else assert.notEqual(sin.dias[d], retirado); });
});

test('hashAvalancha: estable y reparte (un carácter distinto cambia muchos bits)', () => {
  assert.equal(hashAvalancha('mc-mobs'), hashAvalancha('mc-mobs'));
  const a = hashAvalancha('mc-noche-1'), b = hashAvalancha('mc-noche-2');
  const bits = (a ^ b).toString(2).split('').filter(x => x === '1').length;
  assert.ok(bits >= 8, `solo cambiaron ${bits} bits`);
});

test('escenas de pregunta: al menos 20 preguntas reales en cada tema, se copian y se validan', () => {
  const { taps, errores } = construir();
  assert.deepEqual(errores, []);
  const con = taps.flatMap(t => t.questions.filter(q => q.escena).map(q => [t.topic, q.escena.tipo]));
  assert.ok(con.length >= 20, `solo ${con.length} preguntas con escena`);
  for (const topic of Object.keys(TEMAS).filter(k => !TEMAS[k].soloEnlace)) assert.ok(con.filter(([k]) => k === topic).length >= 5, topic + ': pocas escenas');
  assert.equal(new Set(con.map(([, tipo]) => tipo)).size, 5, 'se usan los cinco tipos (código, operación, serie, objeto, diagrama)');
});

test('escenas de pregunta: formato, catálogo del tema y nunca delatan la respuesta', () => {
  const p = { options: ['Lunes', 'Viernes', 'Ninguno', 'Domingo'], answer: 2 }, cat = new Set(['creeper']);
  const err = e => validarEscena(e, p, cat, 'x').join(' | ');
  assert.equal(err({ tipo: 'codigo', lineas: ['si llueve:', '  calle = "mojada"'] }), '');
  assert.equal(err({ tipo: 'serie', items: ['2', '4', '?'] }), '');
  assert.equal(err({ tipo: 'objeto', cosa: 'creeper', texto: 'Creeper' }), '');
  assert.match(err({ tipo: 'objeto', cosa: 'zombi' }), /no existe en el tema/);
  assert.match(err({ tipo: 'pelicula' }), /desconocido/);
  assert.match(err({ tipo: 'serie', items: ['1', '2', '3'] }), /ficha «\?»/);
  assert.match(err({ tipo: 'codigo', lineas: ['x'.repeat(31)] }), /pasa de 30/);
  assert.match(err({ tipo: 'codigo', lineas: ['dia = "ninguno"'] }), /delata la respuesta/);
  const num = { options: ['20', '24', '25', '32'], answer: 2 };
  assert.match(validarEscena({ tipo: 'serie', items: ['1', '4', '25', '?'] }, num, cat, 'x').join(), /delata/);
  assert.deepEqual(validarEscena({ tipo: 'serie', items: ['1', '4', '9', '16', '?'] }, num, cat, 'x'), []);
  const b = bancosMinimos();
  b.cultura.preguntas[0].escena = { tipo: 'diagrama', cosa: 'no-existe' };
  assert.match(correr(b).errores.join(' | '), /cup0.*no-existe/);
});

test('modo cine: cada Tap trae plano, transición y su ambiente; el feed nunca repite plano seguido', () => {
  const { taps } = construir();
  for (const t of taps) {
    assert.ok(PLANOS.includes(t.scene.camara), t.id + ' sin plano de cámara');
    assert.ok(TRANSICIONES.includes(t.scene.transicion), t.id + ' sin transición');
  }
  for (const theme of ['minecraft', 'estudio', 'aventura']) {
    const del = taps.filter(t => t.theme === theme), conFauna = Object.keys(leerTemas()[theme].cine?.fauna ?? {}).length > 0;
    assert.ok(new Set(del.map(t => t.scene.camara)).size >= (theme === 'minecraft' ? PLANOS.length : 6), theme + ': pocos planos');
    assert.ok(new Set(del.map(t => t.scene.hora).filter(Boolean)).size >= 3, theme + ': pocas horas del día');
    assert.ok(del.filter(t => t.scene.clima).length >= del.length * 0.3, theme + ': poco clima');
    if (conFauna) assert.ok(del.filter(t => t.scene.fauna).length >= del.length * 0.3, theme + ': poca fauna');
  }
  for (const orden of [ordenParaTi(taps), ordenParaTi(taps, true), ...Object.keys(TEMAS).map(k => ordenSierra(taps.filter(t => t.topic === k)))]) {
    orden.forEach((t, i) => {
      if (!i) return;
      const a = orden[i - 1].scene, b = t.scene;
      assert.notEqual(b.camara, a.camara, `${t.id} repite el plano de ${orden[i - 1].id}`);
      if (t.theme === orden[i - 1].theme) assert.notEqual(b.host, a.host, `${t.id} repite personaje`);
    });
  }
  // el gancho siempre igual (primera impresión) y determinista: dos corridas dan lo mismo
  assert.equal(taps.find(t => t.id === 'mc-gancho').scene.camara, 'orbita');
  assert.deepEqual(construir().taps.map(t => t.scene), taps.map(t => t.scene));
});

test('historia: un banco mínimo se genera con sus pasos, su única pregunta que puntúa y la marca de solo enlace', () => {
  const r = correr(bancosMinimos());
  assert.deepEqual(r.errores, []);
  const h = r.taps.find(t => t.id === 'hi');
  assert.equal(h.tipo, 'historia');
  assert.equal(h.soloEnlace, true);
  assert.equal(h.hook, undefined);
  assert.deepEqual(h.questions.map(q => q.tipo), ['paso', 'paso', 'paso', undefined]);
  assert.deepEqual(h.questions[0].consecuencias, ['Pasa esto.', 'Pasa aquello.']);
  assert.ok(r.taps.filter(t => t.id !== 'hi').every(t => !t.soloEnlace && t.tipo === undefined));
});

test('historia: las historias no cambian la escena de los demás Taps', () => {
  const con = correr(bancosMinimos()).taps.filter(t => t.id !== 'hi');
  const { historias, ...resto } = bancosMinimos();
  const sin = generar({ ...resto, historias: { ...historias, taps: [] } }, retos, temas).taps;
  assert.deepEqual(con, sin);
});

test('historia: errores de un paso mal armado', () => {
  const mal = cambio => { const b = bancosMinimos(); cambio(b.historias); return correr(b).errores.join(' | '); };
  assert.match(mal(h => { h.preguntas[0].answer = 0; }), /no lleva «answer» ni «why»/);
  assert.match(mal(h => { h.preguntas[0].consecuencias = ['solo una']; }), /una consecuencia por decisión/);
  assert.match(mal(h => { h.preguntas[0].options = ['a', 'b', 'c', 'd']; h.preguntas[0].consecuencias = ['1', '2', '3', '4']; }), /de 2 a 3 decisiones/);
  assert.match(mal(h => { h.preguntas[0].consecuencias[0] = 'x'.repeat(LIMITES.explicacion + 1); }), /consecuencia/);
  assert.match(mal(h => { h.taps[0].preguntas = ['hi-p1', 'hi-final', 'hi-p2', 'hi-p3']; }), /debe ser un paso|no puede ser un paso/);
  assert.match(mal(h => { h.taps[0].preguntas = ['hi-p1', 'hi-p2']; }), /una historia lleva de 3 a 5 pasos/);
  assert.match(mal(h => { h.taps[0].resultados = [{ min: 0, title: 'x', line: 'y' }, { min: 2, title: 'z', line: 'w' }]; }), /1 preguntas que puntúan/);
  assert.match(mal(h => { h.taps[0].gancho = true; }), /no tiene Tap de gancho/);
  assert.match(mal(h => { delete h.taps[0].tipo; }), /deben ser 5/);
});

test('historia: un paso no cabe en un Tap de quiz y una pregunta normal no lleva consecuencias', () => {
  const b = bancosMinimos();
  b.minecraft.preguntas[0] = { ...b.historias.preguntas[0], id: b.minecraft.preguntas[0].id };
  assert.match(correr(b).errores.join(' | '), /un paso solo cabe en un Tap de tipo historia/);
  const c = bancosMinimos();
  c.minecraft.preguntas[0].consecuencias = ['x'];
  assert.match(correr(c).errores.join(' | '), /solo un paso de historia lleva/);
});
