import { TAPS, TAP_TOPICS } from './taps.data';
import { TAPS_DESDE } from './taps.desde';
import {
  IContexto, IItem, IResultado, MIN_TAPS_CON_VISTAS, NUEVO_DIAS, aplicarVista, buscar, categoriasDe, construirItems, esNuevo, explorar, fechaMs, filtrarCategoria,
  hayVistas, masNuevos, masVistos, normalizar, paraTi, progresoDe, seguirJugando, subtemasDe, sugerencias,
} from './taps.explorar';
import { colecciones } from './taps.coleccion';
import { emptyInterest, markCompleted } from './taps.interest';
import { emptySesion } from './taps.sesion';
import { ITap } from './taps.types';

const DIA = 86_400_000;
const NOW = new Date(2026, 9, 29, 12, 0, 0).getTime();

const mk = (id: string, over: Partial<ITap> = {}): ITap => ({
  id, theme: 'minecraft', title: id, kicker: 'Quiz de bloques', topic: 'minecraft', subtopic: 'redstone', scene: { world: 'pradera', host: 'leo' },
  backdrop: ['#000', '#111'], questions: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, q: `Pregunta ${i} de ${id}`, options: ['a', 'b', 'c', 'd'], answer: 0, why: '.' })),
  results: [{ min: 0, title: 'A', line: 'a' }], ...over,
});
const temas = TAP_TOPICS;
const ctx = (over: Partial<IContexto> = {}): IContexto => ({ now: NOW, interest: emptyInterest(), sesion: emptySesion(), partidas: {}, vistas: null, ...over });
const ids = (xs: readonly (IItem | IResultado)[]) => xs.map(x => ('item' in x ? x.item : x).tap.id);

describe('normalizar', () => {
  it('quita tildes y mayúsculas y junta espacios', () => {
    expect(normalizar('  VOLCÁN   Más\tAlto ')).toBe('volcan mas alto');
    expect(normalizar('Piña ñandú')).toBe('pina nandu');
  });
});

describe('construirItems', () => {
  it('deja fuera los Taps solo enlace, da nombre legible al subtema y respeta el orden del banco', () => {
    const lista = construirItems([mk('a'), mk('b', { soloEnlace: true }), mk('c', { subtopic: undefined, topic: 'ajeno' })], temas);
    expect(lista.map(i => i.tap.id)).toEqual(['a', 'c']);
    expect(lista[0].subtema).toBe('Redstone');
    expect(lista[1].tema.name).toBe('Ajeno');
    expect(lista[1].subtema).toBe('Mixto');
  });
  it('lee la fecha de adición y no inventa una si falta o está rota', () => {
    const lista = construirItems([mk('a'), mk('b'), mk('c')], temas, { a: '2026-10-28', c: 'ayer' });
    expect(lista.map(i => i.desde)).toEqual([fechaMs('2026-10-28'), null, null]);
  });
});

describe('buscar', () => {
  const lista = construirItems([
    mk('volcanes', { title: 'Volcanes y lava', subtopic: 'biomas' }),
    mk('nether', { title: 'Primer viaje al Nether', subtopic: 'nether-end' }),
    mk('otro', { title: 'Otro', questions: [{ id: 'q', q: '¿Dónde está el volcán más alto?', options: ['a', 'b', 'c', 'd'], answer: 0, why: '.' }] }),
    mk('cultura', { title: 'Datos', topic: 'cultura', theme: 'aventura', kicker: 'Cultura general', subtopic: 'espacio' }),
  ], temas);

  it('sin texto devuelve todo en el mismo orden', () => {
    expect(ids(buscar(lista, '   '))).toEqual(['volcanes', 'nether', 'otro', 'cultura']);
  });
  it('no distingue tildes ni mayúsculas y pone primero el título', () => {
    const r = buscar(lista, 'VOLCAN');
    expect(ids(r)).toEqual(['volcanes', 'otro']);
    expect(r[0].pregunta).toBeNull();
    expect(r[1].pregunta).toBe('¿Dónde está el volcán más alto?');
  });
  it('busca en subtema y tema, y pide todas las palabras', () => {
    expect(ids(buscar(lista, 'nether end'))).toEqual(['nether']);
    expect(ids(buscar(lista, 'espacio'))).toEqual(['cultura']);
    expect(ids(buscar(lista, 'cultura general'))).toEqual(['cultura']);
    expect(buscar(lista, 'volcan espacio')).toEqual([]);
  });
  it('un texto sin coincidencias da lista vacía', () => { expect(buscar(lista, 'zzzz')).toEqual([]); });
});

describe('categorías y subtemas', () => {
  const lista = construirItems([mk('a'), mk('b', { subtopic: 'mobs' }), mk('c', { topic: 'cultura', theme: 'aventura', subtopic: 'espacio' }), mk('d', { topic: 'logica', theme: 'estudio' })], temas);
  it('Minecraft va primero aunque el banco empiece por otra categoría', () => {
    const otra = construirItems([mk('x', { topic: 'cultura', theme: 'aventura' }), ...lista.map(i => i.tap)], temas);
    expect(categoriasDe(otra).map(c => c.tema.id)).toEqual(['minecraft', 'cultura', 'logica']);
    expect(categoriasDe(lista).map(c => c.cuenta)).toEqual([2, 1, 1]);
  });
  it('filtra por categoría y subtema', () => {
    expect(ids(filtrarCategoria(lista, { categoria: 'minecraft', subtema: null }))).toEqual(['a', 'b']);
    expect(ids(filtrarCategoria(lista, { categoria: 'minecraft', subtema: 'mobs' }))).toEqual(['b']);
    expect(ids(filtrarCategoria(lista, { categoria: null, subtema: null }))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('lista los subtemas con su conteo', () => {
    expect(subtemasDe(lista, 'minecraft')).toEqual([{ id: 'redstone', nombre: 'Redstone', cuenta: 1 }, { id: 'mobs', nombre: 'Mobs', cuenta: 1 }]);
  });
});

describe('orden', () => {
  const lista = construirItems([mk('a'), mk('b'), mk('c'), mk('d'), mk('e')], temas, { a: '2026-10-19', b: '2026-10-21', c: '2026-10-21' });

  it('«Más vistos» ordena por vistas y desempata con el orden curado', () => {
    const vistas = { c: 50, a: 50, b: 9, e: 1 };
    expect(ids(masVistos(lista, vistas))).toEqual(['a', 'c', 'b', 'e', 'd']);
  });
  it('sin datos fiables cae al orden curado y no presenta nada como visto', () => {
    expect(hayVistas(null, lista)).toBe(false);
    expect(hayVistas({}, lista)).toBe(false);
    expect(hayVistas({ a: 3, b: 2 }, lista)).toBe(false);
    expect(hayVistas({ a: 3, b: 2, c: 1 }, lista)).toBe(MIN_TAPS_CON_VISTAS <= 3);
    expect(ids(masVistos(lista, null))).toEqual(['a', 'b', 'c', 'd', 'e']);
    const r = explorar(lista, { categoria: null, subtema: null, consulta: '', vista: 'vistos' }, ctx({ vistas: { a: 3 } }));
    expect(r.sinVistas).toBe(true);
    expect(ids(r.resultados)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('un id del API que no está en el banco se ignora', () => {
    expect(ids(masVistos(lista, { zzz: 999, b: 5, c: 4, d: 3 }))).toEqual(['b', 'c', 'd', 'a', 'e']);
  });
  it('«Nuevos»: la fecha más reciente primero, los empates por el último agregado y los sin fecha delante', () => {
    expect(ids(masNuevos(lista))).toEqual(['e', 'd', 'c', 'b', 'a']);
  });
  it('la marca «Nuevo» dura NUEVO_DIAS y no sale sin fecha', () => {
    const [a, b, , d] = lista;
    expect(esNuevo(b, NOW)).toBe(false);                                   // 21-oct: hace 8 días
    expect(esNuevo(b, fechaMs('2026-10-21')! + NUEVO_DIAS * DIA)).toBe(true);
    expect(esNuevo(b, fechaMs('2026-10-21')! + (NUEVO_DIAS + 1) * DIA)).toBe(false);
    expect(esNuevo(a, fechaMs('2026-10-19')! - DIA)).toBe(false);          // fecha en el futuro
    expect(esNuevo(d, NOW)).toBe(false);
  });
  it('la tabla real de fechas son fechas válidas de Taps que existen', () => {
    const existentes = new Set(TAPS.map(t => t.id));
    for (const [id, f] of Object.entries(TAPS_DESDE)) { expect(existentes.has(id)).withContext(id).toBe(true); expect(fechaMs(f)).withContext(id).not.toBeNull(); }
  });
});

describe('progreso local, «Sin jugar», «Ya jugados» y «Seguir jugando»', () => {
  const lista = construirItems([mk('a'), mk('b'), mk('c')], temas);
  const interest = markCompleted(markCompleted(emptyInterest(), lista[0].tap, NOW - 3 * DIA), lista[1].tap, NOW - DIA);
  const partidas = { c: { tapId: 'c', index: 2, chosen: null, score: 2, answers: [true, false], finished: false, t: NOW - 1000 } };
  const c = ctx({ interest, sesion: { ...emptySesion(), puntajes: { a: 4 } }, partidas });

  it('estado de cada Tap', () => {
    expect(progresoDe(lista[0], c)).toEqual({ estado: 'hecho', fraccion: 1, texto: 'Completado: 4 de 5' });
    expect(progresoDe(lista[1], c).texto).toBe('Completado');
    expect(progresoDe(lista[2], c)).toEqual({ estado: 'curso', fraccion: 0.4, texto: 'En curso: 2 de 5' });
    expect(progresoDe(lista[2], ctx())).toEqual({ estado: 'nuevo', fraccion: 0, texto: 'Sin jugar' });
  });
  it('«Sin jugar» deja fuera lo completado y lo empezado; «Ya jugados», lo último completado primero', () => {
    expect(ids(aplicarVista(lista, 'sinjugar', c))).toEqual([]);
    expect(ids(aplicarVista(lista, 'sinjugar', ctx({ interest })))).toEqual(['c']);
    expect(ids(aplicarVista(lista, 'jugados', c))).toEqual(['b', 'a']);
    expect(ids(aplicarVista(lista, 'jugados', ctx()))).toEqual([]);
  });
  it('«Seguir jugando» trae solo las partidas a medias, la más reciente primero', () => {
    expect(ids(seguirJugando(lista, c))).toEqual(['c']);
    expect(seguirJugando(lista, ctx())).toEqual([]);
  });
  it('una partida terminada sin marca de completado no cuenta como en curso', () => {
    const fin = ctx({ partidas: { c: { ...partidas.c, finished: true } } });
    expect(progresoDe(lista[2], fin).estado).toBe('nuevo');
  });
});

describe('«Para ti» y explorar', () => {
  const todos = construirItems(TAPS, TAP_TOPICS, TAPS_DESDE);

  it('sin señales respeta el orden del feed y no pierde ni repite Taps', () => {
    const r = paraTi(todos, ctx());
    expect(r.length).toBe(todos.length);
    expect(new Set(ids(r)).size).toBe(todos.length);
  });
  it('lo completado hace poco baja al final de su tema', () => {
    const base = paraTi(todos, ctx()), primero = base.find(i => i.tema.id === 'minecraft')!;
    const con = paraTi(todos, ctx({ interest: markCompleted(emptyInterest(), primero.tap, NOW - 1000) }));
    const mc = con.filter(i => i.tema.id === 'minecraft');
    expect(mc[mc.length - 1].tap.id).toBe(primero.tap.id);
  });
  it('buscar «volcán» en el banco real encuentra la pregunta del volcán más alto, sin tildes', () => {
    for (const q of ['volcán', 'VOLCAN']) {
      const r = explorar(todos, { categoria: null, subtema: null, consulta: q, vista: 'todos' }, ctx());
      expect(ids(r.resultados)).toContain('cu-gigantes');
      expect(r.resultados.find(x => x.item.tap.id === 'cu-gigantes')!.pregunta).toContain('volcán');
    }
  });
  it('la búsqueda se combina con la categoría: «volcán» en Minecraft no trae nada', () => {
    expect(explorar(todos, { categoria: 'minecraft', subtema: null, consulta: 'volcan', vista: 'todos' }, ctx()).resultados).toEqual([]);
  });
  it('sin texto y con Minecraft elegido salen sus Taps en el orden del banco', () => {
    const r = explorar(todos, { categoria: 'minecraft', subtema: null, consulta: '', vista: 'todos' }, ctx());
    expect(r.resultados.length).toBeGreaterThan(30);
    expect(ids(r.resultados)[0]).toBe('mc-gancho');
    expect(r.resultados.every(x => x.item.tema.id === 'minecraft')).toBe(true);
  });
  it('categoriasDe del banco real pone Minecraft primero', () => { expect(categoriasDe(todos)[0].tema.id).toBe('minecraft'); });
  it('las sugerencias del estado vacío salen de subtemas reales, una por tema primero', () => {
    const s = sugerencias(colecciones(TAPS));
    expect(s.length).toBe(6);
    expect(new Set(s).size).toBe(6);
    expect(s[0]).toBe('Crafteos');
  });
});
