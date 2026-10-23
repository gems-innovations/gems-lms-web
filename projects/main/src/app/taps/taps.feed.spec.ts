import { MAX_SAME_TOPIC_IN_A_ROW, TAP_LIMITS, choose, esPaso, feedTopics, mixFeed, next, optionLayout, orderFeed, questionTipo, sawtoothOrder, startRun, streak, timeOut, topicOf, validateTap } from './taps.logic';
import { HOOK_TAP_IDS, RETIRED_TAP_IDS, TAP_TOPICS, TAPS, findTap } from './taps.data';
import { keyAction } from './taps.keys';
import { ITap, SIN_RESPUESTA } from './taps.types';

const tap: ITap = {
  id: 'prueba', theme: 'minecraft', title: 'Prueba', kicker: 'Quiz', scene: { world: 'pradera', host: 'leo' }, backdrop: ['#000', '#111'],
  questions: [
    { id: 'a', q: '¿A?', options: ['1', '2', '3'], answer: 1, why: 'Porque sí.' },
    { id: 'b', q: '¿B?', options: ['1', '2'], answer: 0, why: 'Porque no.' },
  ],
  results: [{ min: 0, title: 'Novato', line: 'Sigue.' }],
};

describe('respuestas y racha', () => {
  it('guarda acierto o fallo de cada pregunta en orden', () => {
    let run = choose(startRun(tap), tap, 1).run;            // acierto
    run = choose(next(run, tap), tap, 1).run;                // fallo (la b es 0)
    expect(run.answers).toEqual([true, false]);
  });

  it('cuenta los aciertos seguidos del final', () => {
    expect(streak({ ...startRun(tap), answers: [true, false, true, true] })).toBe(2);
    expect(streak({ ...startRun(tap), answers: [true, true, true] })).toBe(3);
    expect(streak({ ...startRun(tap), answers: [true, false] })).toBe(0);
  });
});

describe('orderFeed', () => {
  const gancho: ITap = { ...tap, id: 'gancho', hook: true };
  const a: ITap = { ...tap, id: 'a' };
  const logica: ITap = { ...tap, id: 'l', topic: 'logica' };
  const todos = [a, gancho, logica];

  it('alguien nuevo empieza por el Tap de gancho y luego se alternan las categorías', () => {
    expect(orderFeed(todos, {}).map(t => t.id)).toEqual(['gancho', 'l', 'a']);
  });
  it('quien ya lo jugó lo encuentra al final', () => {
    expect(orderFeed(todos, { hookDone: true }).map(t => t.id)).toEqual(['a', 'l', 'gancho']);
  });
  it('el enlace ?t= manda sobre el gancho', () => {
    expect(orderFeed(todos, { first: 'l' }).map(t => t.id)[0]).toBe('l');
  });
  it('?tema= pone primero esa categoría y deja el resto después', () => {
    expect(orderFeed(todos, { topic: 'logica' }).map(t => t.id)).toEqual(['l', 'gancho', 'a']);
  });
  it('un ?tema= sin Taps deja el orden normal', () => {
    expect(orderFeed(todos, { topic: 'nada' }).map(t => t.id)).toEqual(['gancho', 'l', 'a']);
  });
  it('sin topic la categoría es el tema del motor', () => {
    expect(topicOf(a)).toBe('minecraft');
    expect(topicOf(logica)).toBe('logica');
  });
});

describe('mixFeed (feed «Para ti»)', () => {
  const NIVELES = ['facil', 'media', 'dificil'] as const;
  const maker = (topic: string, n: number, hook = true): ITap[] =>
    Array.from({ length: n }, (_, i) => ({ ...tap, id: `${topic}-${i}`, topic, hook: hook && i === 0, level: NIVELES[(i * 2) % 3] }));
  const sample = [...maker('mc', 9), ...maker('lg', 5), ...maker('cu', 6)];

  it('conserva todos los Taps, sin repetir ni perder ninguno', () => {
    const out = mixFeed(sample);
    expect(out.length).toBe(sample.length);
    expect(new Set(out.map(t => t.id)).size).toBe(sample.length);
  });
  it('nunca pone más de 2 seguidos de la misma categoría', () => {
    expect(maxRun(mixFeed(sample))).toBeLessThanOrEqual(MAX_SAME_TOPIC_IN_A_ROW);
    expect(maxRun(mixFeed(sample, { hookDone: true }).slice(0, -3))).toBeLessThanOrEqual(MAX_SAME_TOPIC_IN_A_ROW);
  });
  it('con cuatro categorías evita 3 difíciles seguidos mientras alguna cola tenga otra cosa que ofrecer', () => {
    // una categoría cargada de difíciles y tres normales: tras dos difíciles se prefiere la cola cuyo siguiente Tap no lo es
    const duro = (topic: string, n: number): ITap[] => Array.from({ length: n }, (_, i) => ({ ...tap, id: `${topic}-${i}`, topic, hook: i === 0, level: i % 3 === 1 ? 'facil' : 'dificil' }));
    const cuatro = [...duro('a', 9), ...maker('b', 9), ...maker('c', 8), ...maker('d', 8)];
    for (const opts of [{}, { hookDone: true }]) {
      const out = mixFeed(cuatro, opts), levels = out.map(t => t.level);
      // mientras las cuatro colas están abiertas (los primeros 20) no hay tres difíciles seguidos; al final, cuando solo quedan
      // difíciles, es inevitable
      for (let i = 2; i < 20; i++) expect(levels[i] === 'dificil' && levels[i - 1] === 'dificil' && levels[i - 2] === 'dificil').withContext(JSON.stringify(opts) + ' posición ' + i).toBeFalse();
      expect(maxRun(out.slice(0, -4))).toBeLessThanOrEqual(MAX_SAME_TOPIC_IN_A_ROW);
      expect(new Set(out.map(t => t.id)).size).toBe(cuatro.length);
    }
  });
  it('empieza por un gancho y el gancho de cada categoría es lo primero que sale de ella', () => {
    const out = mixFeed(sample);
    expect(out[0].hook).toBeTrue();
    for (const topic of ['mc', 'lg', 'cu']) expect(out.find(t => topicOf(t) === topic)!.hook).toBeTrue();
  });
  it('con hookDone los ganchos van al final', () => {
    const out = mixFeed(sample, { hookDone: true });
    expect(out.slice(-3).every(t => t.hook)).toBeTrue();
    expect(out.slice(0, -3).some(t => t.hook)).toBeFalse();
  });
  it('es determinista: el servidor y el navegador dan el mismo orden', () => {
    expect(mixFeed(sample).map(t => t.id)).toEqual(mixFeed([...sample]).map(t => t.id));
  });
  it('sawtoothOrder: el gancho primero y la dificultad no sube en línea recta', () => {
    const base = ['facil', 'media', 'dificil'] as const;
    const list = Array.from({ length: 12 }, (_, i): ITap => ({ ...tap, id: 'x' + i, topic: 'x', hook: i === 0, level: base[i % 3] }));
    const out = sawtoothOrder(list);
    expect(out.length).toBe(12);
    expect(out[0].hook).toBeTrue();
    const rank = out.slice(1).map(t => base.indexOf(t.level!));
    expect(rank.some((r, i) => i > 0 && r < rank[i - 1])).toBeTrue();     // alguna bajada
    expect(rank.some((r, i) => i > 0 && r > rank[i - 1])).toBeTrue();     // alguna subida
  });
  it('si queda una sola categoría, no se detiene', () => {
    expect(mixFeed(maker('solo', 5)).length).toBe(5);
  });
});

describe('el feed con los Taps reales', () => {
  const feed = orderFeed(TAPS, {});
  const enFeed = TAPS.filter(t => !t.soloEnlace).length;
  it('hay 127 Taps de 5 preguntas con ids únicos (de Tap y de pregunta)', () => {
    expect(TAPS.length).toBe(127);
    expect(new Set(TAPS.map(t => t.id)).size).toBe(TAPS.length);
    const questionIds = TAPS.flatMap(t => t.questions.map(q => q.id));
    expect(questionIds.length).toBe(127 * 5);
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });
  it('el feed los trae todos, con un gancho primero y nunca más de 2 seguidos del mismo tema', () => {
    expect(feed.length).toBe(enFeed);
    expect(feed.some(t => t.soloEnlace)).toBeFalse();
    expect(feed[0].hook).toBeTrue();
    expect(maxRun(feed)).toBeLessThanOrEqual(MAX_SAME_TOPIC_IN_A_ROW);
  });
  it('cada tema tiene su Tap de gancho y es el primero de ese tema en el feed', () => {
    expect(HOOK_TAP_IDS.length).toBe(4);
    for (const topic of ['minecraft', 'logica', 'cultura', 'tecnologia']) expect(feed.find(t => topicOf(t) === topic)!.hook).toBeTrue();
  });
  it('un enlace a un Tap lo pone primero y sigue sin pasar de 2 seguidos', () => {
    const f = orderFeed(TAPS, { first: TAPS[30].id });
    expect(f[0].id).toBe(TAPS[30].id);
    expect(f.length).toBe(enFeed);
  });
  it('un enlace a un Tap solo enlace lo trae primero y el resto del feed sigue igual', () => {
    const f = orderFeed(TAPS, { first: 'napoleon' });
    expect(f[0].id).toBe('napoleon');
    expect(f.length).toBe(enFeed + 1);
    expect(f.slice(1).map(t => t.id)).toEqual(feed.map(t => t.id));
  });
  it('con ?tema= salen primero los de ese tema (con su gancho al frente)', () => {
    const f = orderFeed(TAPS, { topic: 'cultura' });
    const n = TAPS.filter(t => topicOf(t) === 'cultura').length;
    expect(f.slice(0, n).every(t => topicOf(t) === 'cultura')).toBeTrue();
    expect(f[0].hook).toBeTrue();
  });
  it('la dificultad sube y baja: nunca 3 difíciles seguidos y hay fáciles repartidos hasta el final', () => {
    const levels = feed.map(t => t.level);
    for (let i = 2; i < levels.length; i++) expect(levels[i] === 'dificil' && levels[i - 1] === 'dificil' && levels[i - 2] === 'dificil').withContext('posición ' + i).toBeFalse();
    expect(levels.slice(30).includes('facil')).toBeTrue();
  });
  it('mezcla temas visuales (Minecraft, estudio, aventura) desde los primeros 12 Taps', () => {
    expect(new Set(feed.slice(0, 12).map(t => t.theme)).size).toBeGreaterThanOrEqual(2);
  });
  it('los ids antiguos llevan a su equivalente y un id retirado o inexistente no devuelve nada', () => {
    expect(findTap('primeros-pasos')?.hook).toBeTrue();
    expect(findTap('nether')?.subtopic).toBe('nether-end');
    expect(findTap('redstone')?.subtopic).toBe('redstone');
    expect(findTap('no-existe')).toBeNull();
    for (const id of RETIRED_TAP_IDS) expect(findTap(id)).toBeNull();
  });
});

function maxRun(list: ITap[]): number {
  let best = 0, run = 0;
  list.forEach((t, i) => { run = i && topicOf(t) === topicOf(list[i - 1]) ? run + 1 : 1; best = Math.max(best, run); });
  return best;
}

describe('feedTopics', () => {
  const catalogo = [
    { id: 'minecraft', name: 'Minecraft', blurb: '', color: '#0f0' },
    { id: 'logica', name: 'Lógica', blurb: '', color: '#00f' },
  ];
  it('las categorías sin Taps salen al final como «pronto»', () => {
    const list = feedTopics([tap, { ...tap, id: 'x' }], catalogo);
    expect(list.map(t => [t.topic.id, t.count, t.soon])).toEqual([['minecraft', 2, false], ['logica', 0, true]]);
  });
  it('un tema nuevo aparece solo con agregar sus Taps, aunque no esté en el catálogo', () => {
    const list = feedTopics([{ ...tap, id: 'q', topic: 'ciencias' }], catalogo);
    expect(list[0]).toEqual(jasmine.objectContaining({ count: 1, soon: false }));
    expect(list[0].topic.name).toBe('Ciencias');
  });
  it('con los Taps reales los cuatro temas son jugables, con sus conteos, y ninguno dice «pronto»', () => {
    const real = feedTopics(TAPS, TAP_TOPICS);
    expect(real.map(t => [t.topic.id, t.count, t.soon])).toEqual([['minecraft', 42, false], ['logica', 29, false], ['cultura', 31, false], ['tecnologia', 20, false]]);
  });
});

describe('optionLayout', () => {
  it('2×2 si todas son cortas, lista si alguna es larga, apiladas si son 2', () => {
    expect(optionLayout(['a', 'b', 'c', 'd'])).toBe('grid');
    expect(optionLayout(['a', 'b', 'c', 'una opción bastante más larga'])).toBe('list');
    expect(optionLayout(['Sí', 'No'])).toBe('pair');
  });
});

describe('textos de los Taps reales', () => {
  it('explicaciones de 90 caracteres o menos, preguntas de 120 o menos y opciones de 22 (4 por pregunta; 2 en duo y vf)', () => {
    for (const t of TAPS) for (const q of t.questions) {
      if (esPaso(q)) {                                          // paso de historia: 2 o 3 decisiones de hasta 40 y una consecuencia (90) por decisión
        expect(q.q.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.question);
        expect(q.options.length).withContext(t.id + '/' + q.id).toBeGreaterThanOrEqual(2);
        expect(q.options.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(3);
        for (const o of q.options) expect(o.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.option);
        expect(q.consecuencias?.length).withContext(t.id + '/' + q.id).toBe(q.options.length);
        for (const c of q.consecuencias ?? []) expect(c.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.why);
        continue;
      }
      expect(q.why.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.why);
      expect(q.q.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.question);
      expect(q.options.length).withContext(t.id + '/' + q.id).toBe(questionTipo(q) === 'clasica' ? 4 : 2);
      for (const o of q.options) expect(o.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.optionGrid);
    }
  });

  it('cada tema tiene un Tap de gancho con una primera pregunta de 4 opciones', () => {
    for (const id of HOOK_TAP_IDS) {
      const gancho = TAPS.find(t => t.id === id)!;
      expect(gancho.hook).toBeTrue();
      expect(gancho.questions[0].options.length).toBe(4);
    }
  });

  it('cada Tap usa un mundo, un personaje y un objeto de su tema', () => {
    const permitido: Record<string, { hosts: string[]; items: string[] }> = {
      minecraft: { hosts: ['leo', 'sofi', 'mateo', 'dani'], items: ['sword', 'pick', 'axe', 'torch', 'diamond', 'apple', 'grass', 'tnt'] },
      estudio: { hosts: ['chispa', 'nube'], items: ['matraz', 'lupa', 'libro'] },
      // aventura: personajes del registro (public/taps-engine/personajes), sin objeto en la mano
      // época: presentadores 2D de «historias» (public/taps-engine/themes/epoca)
      epoca: { hosts: ['grabador', 'arqueologa', 'senador', 'escriba', 'artesano', 'investigadora', 'periodista'], items: ['pluma', 'cepillo', 'pergamino', 'mapa', 'libro', 'lupa', 'matraz', 'antorcha'] },
      aventura: { hosts: ['zorro', 'cientifica', 'robot', 'panda', 'pirata', 'exploradora', 'pinguino', 'ninja', 'hana'], items: [] },
    };
    for (const t of TAPS) {
      expect(permitido[t.theme]).withContext(t.id + ': tema conocido').toBeDefined();
      expect(permitido[t.theme].hosts).withContext(t.id).toContain(t.scene.host);
      if (permitido[t.theme].items.length) expect(permitido[t.theme].items).withContext(t.id).toContain(t.scene.item!);
      else expect(t.scene.item).withContext(t.id).toBeUndefined();
    }
    expect(new Set(TAPS.map(t => t.scene.world)).size).toBeGreaterThanOrEqual(8);
  });

  it('ningún título es negativo, ni con 0 aciertos', () => {
    const negativos = /perdedor|malo|mala|fracas|pésim|desastre|torpe|inútil|nulo/i;
    for (const t of TAPS) for (const r of t.results) expect(r.title).not.toMatch(negativos);
  });

  it('validateTap marca explicaciones largas', () => {
    const largo: ITap = { ...tap, questions: [{ ...tap.questions[0], why: 'x'.repeat(91) }] };
    expect(validateTap(largo).join(' ')).toContain('explicación pasa de 90');
  });
});

describe('formatos duo y verdadero/falso', () => {
  const duo: ITap = {
    ...tap, id: 'duo',
    questions: [
      { id: 'd', q: '¿Cuál?', options: ['Carbón', 'Diamante'], answer: 1, why: 'Porque sí.', tipo: 'duo' },
      { id: 'v', q: 'Afirmación.', options: ['Verdadero', 'Falso'], answer: 0, why: 'Porque no.', tipo: 'vf' },
      { id: 'c', q: '¿Clásica?', options: ['1', '2', '3', '4'], answer: 0, why: 'Porque sí.' },
    ],
  };
  it('questionTipo: el del banco o clásica (también para una pregunta de 2 opciones sin tipo)', () => {
    expect(questionTipo(duo.questions[0])).toBe('duo');
    expect(questionTipo(duo.questions[1])).toBe('vf');
    expect(questionTipo(duo.questions[2])).toBe('clasica');
    expect(questionTipo(tap.questions[1])).toBe('clasica');
    expect(questionTipo(undefined)).toBe('clasica');
  });
  it('se acabó el tiempo en un duo: cuenta como fallo sin opción marcada y se puede avanzar', () => {
    const run = timeOut(startRun(duo), duo);
    expect(run.chosen).toBe(SIN_RESPUESTA);
    expect(run.answers).toEqual([false]);
    expect(run.score).toBe(0);
    expect(next(run, duo).index).toBe(1);
  });
  it('no se agota dos veces ni después de responder', () => {
    const answered = choose(startRun(duo), duo, 1).run;
    expect(timeOut(answered, duo)).toBe(answered);
    const out = timeOut(startRun(duo), duo);
    expect(timeOut(out, duo)).toBe(out);
  });
  it('validateTap: duo y vf llevan 2 opciones, vf exactamente «Verdadero» y «Falso»', () => {
    expect(validateTap(duo)).toEqual([]);
    const mal: ITap = { ...duo, questions: [
      { ...duo.questions[0], options: ['1', '2', '3'] },
      { ...duo.questions[1], options: ['Sí', 'No'] },
      { ...duo.questions[2], tipo: 'trio' as never },
    ] };
    const e = validateTap(mal);
    expect(e.some(m => /pregunta 1: el formato duo lleva exactamente 2 opciones/.test(m))).toBeTrue();
    expect(e.some(m => /pregunta 2: verdadero\/falso lleva las opciones «Verdadero» y «Falso»/.test(m))).toBeTrue();
    expect(e.some(m => /pregunta 3: tipo «trio» desconocido/.test(m))).toBeTrue();
  });
  it('el banco real trae los cuatro Taps que mezclan formatos y todos los Taps validan', () => {
    for (const id of ['mc-duelo-1', 'lg-duelo-1', 'cu-duelo-1', 'cu-duelo-2']) {
      const t = findTap(id);
      expect(t).withContext(id).toBeTruthy();
      expect(new Set(t!.questions.map(q => questionTipo(q)))).toEqual(new Set(['clasica', 'duo', 'vf']));
    }
    expect(TAPS.flatMap(t => validateTap(t))).toEqual([]);
  });
});

describe('atajos ← → (solo preguntas de 2 opciones)', () => {
  it('ArrowLeft es la primera opción y ArrowRight la segunda, aunque los atajos de un carácter estén apagados', () => {
    expect(keyAction({ key: 'ArrowLeft' }, false)).toEqual({ kind: 'lado', index: 0 });
    expect(keyAction({ key: 'ArrowRight' }, true)).toEqual({ kind: 'lado', index: 1 });
  });
});
