import {
  TAP_LIMITS, choose, esPaso, feedTopics, isGoodScore, next, optionLayout, orderFeed, orderTaps, progressPercent, puntuables, respuestasPuntuables,
  resultFor, startRun, streak, topicOf, validateTap,
} from './taps.logic';
import { ITap } from './taps.types';
import { HOOK_TAP_ID, TAP_TOPICS, TAPS } from './taps.data';

const tap: ITap = {
  id: 'prueba',
  theme: 'minecraft',
  title: 'Prueba',
  kicker: 'Quiz',
  scene: { world: 'pradera', host: 'leo' },
  backdrop: ['#000', '#111'],
  questions: [
    { id: 'a', q: '¿A?', options: ['1', '2', '3'], answer: 1, why: 'Porque sí.' },
    { id: 'b', q: '¿B?', options: ['1', '2'], answer: 0, why: 'Porque no.' },
    { id: 'c', q: '¿C?', options: ['1', '2'], answer: 1, why: 'Tal cual.' },
  ],
  results: [
    { min: 0, title: 'Novato', line: 'Sigue.' },
    { min: 2, title: 'Crack', line: 'Bien.' },
    { min: 3, title: 'Leyenda', line: 'Perfecto.' },
  ],
};

describe('resultFor', () => {
  it('elige el título de mayor mínimo que no supere el puntaje', () => {
    expect(resultFor(tap, 0).title).toBe('Novato');
    expect(resultFor(tap, 1).title).toBe('Novato');
    expect(resultFor(tap, 2).title).toBe('Crack');
    expect(resultFor(tap, 3).title).toBe('Leyenda');
  });

  it('no depende del orden en que se escribieron los resultados', () => {
    const revuelto: ITap = { ...tap, results: [...tap.results].reverse() };
    expect(resultFor(revuelto, 2).title).toBe('Crack');
  });

  it('con puntaje fuera de rango devuelve el extremo más cercano', () => {
    expect(resultFor(tap, -1).title).toBe('Novato');
    expect(resultFor(tap, 99).title).toBe('Leyenda');
  });
});

describe('avance de un Tap', () => {
  it('empieza en la primera pregunta sin responder', () => {
    expect(startRun(tap)).toEqual({ tapId: 'prueba', index: 0, chosen: null, score: 0, answers: [], finished: false });
  });

  it('suma un acierto solo si la opción es la correcta', () => {
    const ok = choose(startRun(tap), tap, 1);
    expect(ok.correct).toBe(true);
    expect(ok.run.score).toBe(1);
    const mal = choose(startRun(tap), tap, 0);
    expect(mal.correct).toBe(false);
    expect(mal.run.score).toBe(0);
    expect(mal.run.chosen).toBe(0);
  });

  it('ignora un segundo toque en la misma pregunta', () => {
    const primero = choose(startRun(tap), tap, 0);
    const segundo = choose(primero.run, tap, 1);
    expect(segundo.correct).toBeNull();
    expect(segundo.run).toBe(primero.run);
  });

  it('ignora opciones que no existen', () => {
    expect(choose(startRun(tap), tap, 7).correct).toBeNull();
    expect(choose(startRun(tap), tap, -1).correct).toBeNull();
  });

  it('no avanza sin responder', () => {
    const run = startRun(tap);
    expect(next(run, tap)).toBe(run);
  });

  it('avanza y limpia la elección; al responder la última termina', () => {
    let run = choose(startRun(tap), tap, 1).run;
    run = next(run, tap);
    expect(run.index).toBe(1);
    expect(run.chosen).toBeNull();
    run = next(choose(run, tap, 0).run, tap);
    expect(run.index).toBe(2);
    run = next(choose(run, tap, 1).run, tap);
    expect(run.finished).toBe(true);
    expect(run.score).toBe(3);
    expect(resultFor(tap, run.score).title).toBe('Leyenda');
  });

  it('una partida terminada no acepta más respuestas ni avances', () => {
    const fin = { ...startRun(tap), finished: true };
    expect(choose(fin, tap, 1).correct).toBeNull();
    expect(next(fin, tap)).toBe(fin);
  });

  it('calcula el progreso', () => {
    const run = startRun(tap);
    expect(progressPercent(run, tap)).toBe(0);
    expect(progressPercent(choose(run, tap, 1).run, tap)).toBe(33);
    expect(progressPercent({ ...run, finished: true }, tap)).toBe(100);
  });

  it('la mitad de aciertos o más cuenta como buen puntaje', () => {
    expect(isGoodScore(tap, 1)).toBe(false);
    expect(isGoodScore(tap, 2)).toBe(true);
  });
});

describe('orderTaps', () => {
  const otro: ITap = { ...tap, id: 'otro' };
  it('pone primero el Tap pedido', () => {
    expect(orderTaps([tap, otro], 'otro').map(t => t.id)).toEqual(['otro', 'prueba']);
  });
  it('deja el orden si no existe o no se pide', () => {
    expect(orderTaps([tap, otro], 'nada').map(t => t.id)).toEqual(['prueba', 'otro']);
    expect(orderTaps([tap, otro], null).map(t => t.id)).toEqual(['prueba', 'otro']);
  });
});

describe('formato de datos de los Taps', () => {
  it('un Tap bien formado no tiene problemas', () => {
    expect(validateTap(tap)).toEqual([]);
  });

  it('detecta una respuesta fuera de las opciones', () => {
    const roto: ITap = { ...tap, questions: [{ ...tap.questions[0], answer: 5 }] };
    expect(validateTap(roto).join(' ')).toContain('la respuesta no es una opción');
  });

  it('detecta resultados sin el 0 o con mínimos repetidos o imposibles', () => {
    expect(validateTap({ ...tap, results: [{ min: 1, title: 'x', line: 'y' }] }).join(' ')).toContain('empezar en 0');
    expect(validateTap({ ...tap, results: [{ min: 0, title: 'x', line: 'y' }, { min: 0, title: 'z', line: 'w' }] }).join(' ')).toContain('mismo mínimo');
    expect(validateTap({ ...tap, results: [{ min: 0, title: 'x', line: 'y' }, { min: 9, title: 'z', line: 'w' }] }).join(' ')).toContain('más aciertos que preguntas');
  });

  it('los Taps reales están bien formados, con 5 preguntas e ids únicos', () => {
    expect(TAPS.length).toBeGreaterThanOrEqual(2);
    for (const t of TAPS) {
      expect(validateTap(t)).toEqual([]);
      expect(t.questions.length).toBe(5);
    }
    expect(new Set(TAPS.map(t => t.id)).size).toBe(TAPS.length);
  });
});

describe('Tap de historia', () => {
  const paso = (id: string): ITap['questions'][number] => ({
    id, tipo: 'paso', q: 'La historia sigue. ¿Qué haces?', options: ['Esto', 'Aquello'], answer: 0, why: '', consecuencias: ['Pasa esto.', 'Pasa aquello.'],
  });
  const historia: ITap = {
    ...tap, id: 'historia-prueba', tipo: 'historia', soloEnlace: true, topic: 'historias',
    questions: [paso('p1'), paso('p2'), paso('p3'), { id: 'fin', q: '¿Cuál es la verdad?', options: ['1', '2', '3', '4'], answer: 2, why: 'Así es.' }],
    results: [{ min: 0, title: 'Te contaron una leyenda', line: 'Ahora sabes.' }, { min: 1, title: 'Cazador de mitos', line: 'Bien.' }],
  };

  it('una decisión de un paso avanza la historia sin sumar puntos, y solo puntúa la pregunta final', () => {
    let run = startRun(historia);
    for (let i = 0; i < 3; i++) {
      expect(esPaso(historia.questions[run.index])).toBeTrue();
      const r = choose(run, historia, i % 2);
      expect(r.correct).toBeTrue();
      expect(r.run.score).toBe(0);
      run = next(r.run, historia);
    }
    expect(run.index).toBe(3);
    const fin = choose(run, historia, 2);
    expect(fin.run.score).toBe(1);
    expect(next(fin.run, historia).finished).toBeTrue();
    expect(puntuables(historia)).toBe(1);
    expect(respuestasPuntuables(historia, fin.run.answers)).toEqual([true]);
    expect(streak({ ...fin.run, answers: respuestasPuntuables(historia, fin.run.answers) })).toBe(1);
  });

  it('el título depende de la pregunta final, no de las decisiones', () => {
    expect(resultFor(historia, 0).title).toBe('Te contaron una leyenda');
    expect(resultFor(historia, 1).title).toBe('Cazador de mitos');
    expect(isGoodScore(historia, 1)).toBeTrue();
    expect(isGoodScore(historia, 0)).toBeFalse();
  });

  it('una historia bien formada no tiene problemas y la mal armada se detecta', () => {
    expect(validateTap(historia)).toEqual([]);
    expect(validateTap({ ...historia, tipo: undefined }).join(' ')).toContain('solo cabe en un Tap de historia');
    expect(validateTap({ ...historia, questions: historia.questions.slice(2) }).join(' ')).toContain('de 3 a 5 pasos');
    expect(validateTap({ ...historia, questions: [...historia.questions, paso('p9')] }).join(' ')).toContain('termina con una única pregunta');
    const sinConsecuencias = { ...historia, questions: [{ ...paso('p1'), consecuencias: ['solo una'] }, ...historia.questions.slice(1)] };
    expect(validateTap(sinConsecuencias).join(' ')).toContain('consecuencia');
    expect(validateTap({ ...historia, results: [{ min: 0, title: 'x', line: 'y' }, { min: 2, title: 'z', line: 'w' }] }).join(' ')).toContain('más aciertos que preguntas');
  });

  it('una historia solo enlace no entra al feed ni al selector, salvo que sea el Tap del enlace', () => {
    const otros = TAPS.filter(t => !t.soloEnlace).slice(0, 6);
    const todos = [...otros, historia];
    expect(orderFeed(todos, {}).map(t => t.id)).not.toContain('historia-prueba');
    expect(orderFeed(todos, { topic: topicOf(historia) }).map(t => t.id)).not.toContain('historia-prueba');
    expect(orderFeed(todos, { first: 'historia-prueba' })[0].id).toBe('historia-prueba');
    expect(feedTopics(todos, TAP_TOPICS).some(t => t.topic.id === topicOf(historia))).toBeFalse();
  });

  it('el Tap napoleon del banco existe, es una historia solo enlace y tiene 4 pasos y una pregunta', () => {
    const n = TAPS.find(t => t.id === 'napoleon')!;
    expect(n.tipo).toBe('historia');
    expect(n.soloEnlace).toBeTrue();
    expect(n.questions.filter(esPaso).length).toBe(4);
    expect(puntuables(n)).toBe(1);
  });
});
