import { TAP_LIMITS, choose, feedTopics, next, optionLayout, orderFeed, startRun, streak, topicOf, validateTap } from './taps.logic';
import { HOOK_TAP_ID, TAP_TOPICS, TAPS } from './taps.data';
import { ITap } from './taps.types';

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

  it('alguien nuevo empieza por el Tap de gancho', () => {
    expect(orderFeed(todos, {}).map(t => t.id)).toEqual(['gancho', 'a', 'l']);
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
    expect(orderFeed(todos, { topic: 'nada' }).map(t => t.id)).toEqual(['gancho', 'a', 'l']);
  });
  it('sin topic la categoría es el tema del motor', () => {
    expect(topicOf(a)).toBe('minecraft');
    expect(topicOf(logica)).toBe('logica');
  });
});

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
  it('con los Taps reales Minecraft es jugable', () => {
    const real = feedTopics(TAPS, TAP_TOPICS);
    expect(real[0].topic.id).toBe('minecraft');
    expect(real[0].soon).toBeFalse();
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
  it('explicaciones de 90 caracteres o menos y preguntas de 70 o menos', () => {
    for (const t of TAPS) for (const q of t.questions) {
      expect(q.why.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.why);
      expect(q.q.length).withContext(t.id + '/' + q.id).toBeLessThanOrEqual(TAP_LIMITS.question);
    }
  });

  it('hay un Tap de gancho con la primera respuesta abajo a la derecha (donde pulsa la pista)', () => {
    const gancho = TAPS.find(t => t.id === HOOK_TAP_ID)!;
    expect(gancho.hook).toBeTrue();
    expect(gancho.questions[0].answer).toBe(3);
    expect(gancho.questions[0].options.length).toBe(4);
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
