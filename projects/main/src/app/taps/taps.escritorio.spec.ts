import { BLOCK_MS, EXPLORE_EVERY, NOVELTY_MS, addSignal, blockTopic, dayKey, emptyInterest, isBlocked, markCompleted, parseInterest, personalize, streakDays, topicProgress, unblockTopic, yourTopics } from './taps.interest';
import { keyAction, typingTarget } from './taps.keys';
import { almostThere, panelCards, panelState } from './taps.panel';
import { startRun, topicOf } from './taps.logic';
import { WHEEL_LOCK_MS, WHEEL_QUIET_MS, WHEEL_THRESHOLD_PX, WheelGate, normalizeDelta } from './taps.wheel';
import { ITap, ITapRun } from './taps.types';

const mk = (id: string, topic: string): ITap => ({
  id, topic, theme: 'minecraft', title: id, kicker: 'Quiz', scene: { world: 'pradera', host: 'leo' }, backdrop: ['#000', '#111'],
  questions: [1, 2, 3, 4, 5].map(n => ({ id: `${id}-${n}`, q: '¿?', options: ['a', 'b', 'c', 'd'], answer: 0, why: 'Porque sí.' })),
  results: [{ min: 0, title: 'Novato', line: '.' }, { min: 3, title: 'Crack', line: '.' }, { min: 5, title: 'Leyenda', line: '.' }],
});
const NOW = new Date(2026, 9, 19, 12).getTime();
const DAY = 24 * 3600 * 1000;
const ids = (list: ITap[]) => list.map(t => t.id);

describe('señales de interés', () => {
  it('suma los puntos de cada señal (completar +3, compartir +5, repetir +3, salir tras error −1)', () => {
    let i = emptyInterest();
    i = addSignal(i, 'mc', 'complete'); i = addSignal(i, 'mc', 'share'); i = addSignal(i, 'mc', 'repeat'); i = addSignal(i, 'mc', 'leave-after-error');
    expect(i.score['mc']).toBe(10);
  });

  it('completar anota el Tap, el día y +3 al tema', () => {
    const i = markCompleted(emptyInterest(), mk('a1', 'mc'), NOW);
    expect(i.score['mc']).toBe(3);
    expect(i.done['a1']).toBe(NOW);
    expect(i.days).toEqual([dayKey(NOW)]);
    expect(markCompleted(i, mk('a2', 'mc'), NOW + 1000).days.length).toBe(1);   // mismo día, una sola marca
  });

  it('«No me interesa» bloquea 30 días y luego vence; se puede deshacer', () => {
    const blocked = blockTopic(emptyInterest(), 'mc', NOW);
    expect(isBlocked(blocked, 'mc', NOW + BLOCK_MS - 1)).toBeTrue();
    expect(isBlocked(blocked, 'mc', NOW + BLOCK_MS + 1)).toBeFalse();
    expect(isBlocked(unblockTopic(blocked, 'mc'), 'mc', NOW)).toBeFalse();
  });

  it('al leer lo guardado se descartan los bloqueos vencidos y los datos rotos vuelven a vacío', () => {
    const saved = JSON.stringify({ ...emptyInterest(), blocked: { viejo: NOW - 1, vigente: NOW + DAY }, score: { mc: 3, malo: 'x' } });
    const read = parseInterest(saved, NOW);
    expect(Object.keys(read.blocked)).toEqual(['vigente']);
    expect(read.score).toEqual({ mc: 3 });
    expect(parseInterest('{no es json', NOW)).toEqual(emptyInterest());
    expect(parseInterest(null, NOW)).toEqual(emptyInterest());
  });

  it('la racha cuenta días seguidos y sigue viva si el último fue ayer', () => {
    const d = (n: number) => dayKey(NOW - n * DAY);
    expect(streakDays([], NOW)).toEqual({ count: 0, today: false });
    expect(streakDays([d(0), d(1), d(2)], NOW)).toEqual({ count: 3, today: true });
    expect(streakDays([d(1), d(2)], NOW)).toEqual({ count: 2, today: false });
    expect(streakDays([d(3)], NOW)).toEqual({ count: 0, today: false });
  });

  it('el avance por tema cuenta los Taps completados de su categoría', () => {
    const taps = [mk('a1', 'mc'), mk('a2', 'mc'), mk('b1', 'lg')];
    const i = markCompleted(emptyInterest(), taps[0], NOW);
    expect(topicProgress(taps, i, 'mc')).toEqual({ done: 1, total: 2 });
    expect(yourTopics(taps, i)).toEqual(['mc']);
  });
});

describe('personalize (orden «Para ti» que aprende suavemente)', () => {
  const feed = [
    mk('m1', 'mc'), mk('l1', 'lg'), mk('m2', 'mc'), mk('c1', 'cu'), mk('m3', 'mc'), mk('l2', 'lg'), mk('m4', 'mc'), mk('c2', 'cu'), mk('l3', 'lg'), mk('m5', 'mc'),
  ];

  it('sin señales no cambia nada', () => {
    expect(ids(personalize(feed, 1, emptyInterest(), NOW))).toEqual(ids(feed));
  });

  it('no toca las primeras posiciones y conserva todos los Taps', () => {
    const i = addSignal(addSignal(emptyInterest(), 'lg', 'share'), 'lg', 'share');
    const out = personalize(feed, 2, i, NOW);
    expect(ids(out.slice(0, 2))).toEqual(['m1', 'l1']);
    expect(ids(out).sort()).toEqual(ids(feed).sort());
  });

  it('el tema que más se juega aparece más, pero no domina ni rompe «máximo 2 seguidos»', () => {
    let i = emptyInterest();
    for (let k = 0; k < 6; k++) i = addSignal(i, 'lg', 'complete');
    i = addSignal(addSignal(i, 'mc', 'complete'), 'cu', 'complete');
    const many = [...feed, ...feed.map(t => ({ ...t, id: t.id + 'x' })), ...feed.map(t => ({ ...t, id: t.id + 'y' }))];
    const out = personalize(many, 1, i, NOW);
    const firstTwelve = out.slice(1, 13).map(topicOf);
    expect(firstTwelve.filter(t => t === 'lg').length).toBeGreaterThan(firstTwelve.filter(t => t === 'cu').length);
    expect(firstTwelve.filter(t => t === 'lg').length).toBeLessThan(12);
    for (let k = 2; k < 13; k++) expect(new Set([out[k - 2], out[k - 1], out[k]].map(topicOf)).size).toBeGreaterThan(1);
  });

  it('los temas bloqueados van al final', () => {
    const out = personalize(feed, 1, blockTopic(addSignal(emptyInterest(), 'mc', 'complete'), 'lg', NOW), NOW);
    const lastLg = out.map(topicOf).lastIndexOf('lg'), firstLg = out.map(topicOf).indexOf('lg');
    expect(out.slice(firstLg).every(t => topicOf(t) === 'lg')).toBeTrue();
    expect(lastLg).toBe(out.length - 1);
  });

  it('un Tap completado hace menos de 14 días pasa al final de su tema', () => {
    const i = { ...addSignal(emptyInterest(), 'mc', 'complete'), done: { m2: NOW - DAY } };
    const mc = personalize(feed, 1, i, NOW).filter(t => topicOf(t) === 'mc').map(t => t.id);
    expect(mc[mc.length - 1]).toBe('m2');
    const vencido = { ...i, done: { m2: NOW - NOVELTY_MS - DAY } };
    expect(personalize(feed, 1, vencido, NOW).filter(t => topicOf(t) === 'mc').map(t => t.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
  });

  it(`1 de cada ${EXPLORE_EVERY} posiciones es de un tema sin explorar`, () => {
    const many = Array.from({ length: 30 }, (_, k) => mk('t' + k, ['mc', 'lg', 'cu'][k % 3]));
    let i = emptyInterest();
    for (let k = 0; k < 8; k++) { i = addSignal(i, 'mc', 'complete'); i = addSignal(i, 'lg', 'complete'); }
    const out = personalize(many, 0, i, NOW);
    expect(topicOf(out[EXPLORE_EVERY - 1])).toBe('cu');
  });
});

describe('rueda: un gesto = un Tap', () => {
  it(`cambia de Tap al pasar de ${WHEEL_THRESHOLD_PX} px acumulados`, () => {
    const g = new WheelGate();
    expect(g.push({ deltaY: 20 }, 0)).toBe(0);
    expect(g.push({ deltaY: 20 }, 10)).toBe(0);
    expect(g.push({ deltaY: 20 }, 20)).toBe(1);
    expect(new WheelGate().push({ deltaY: -60 }, 0)).toBe(-1);
  });

  it('la inercia del trackpad no salta varios Taps: bloquea 600 ms y hasta 120 ms sin eventos', () => {
    const g = new WheelGate();
    expect(g.push({ deltaY: 80 }, 0)).toBe(1);
    for (let t = 16; t < 1000; t += 16) expect(g.push({ deltaY: 80 }, t)).toBe(0);   // inercia continua: nunca se libera
    expect(g.push({ deltaY: 80 }, 992 + WHEEL_QUIET_MS + 1)).toBe(1);               // tras el silencio, un gesto nuevo vale
    expect(g.push({ deltaY: 80 }, 1200)).toBe(0);                                    // y vuelve a bloquear
  });

  it('pasados 600 ms y en silencio, el siguiente gesto vale', () => {
    const g = new WheelGate();
    g.push({ deltaY: 80 }, 0);
    expect(g.push({ deltaY: 80 }, WHEEL_LOCK_MS - 10)).toBe(0);
    expect(g.push({ deltaY: 80 }, WHEEL_LOCK_MS + 500)).toBe(1);
  });

  it('ignora Ctrl + rueda (zoom), el movimiento horizontal y normaliza líneas y páginas', () => {
    const g = new WheelGate();
    expect(g.push({ deltaY: 200, ctrlKey: true }, 0)).toBe(0);
    expect(g.push({ deltaY: 10, deltaX: 200 }, 10)).toBe(0);
    expect(normalizeDelta(3, 1, 800)).toBe(48);
    expect(normalizeDelta(1, 2, 800)).toBe(800);
    expect(g.push({ deltaY: 4, deltaMode: 1 }, 20)).toBe(1);
  });

  it('un gesto nuevo tras una pausa larga empieza de cero', () => {
    const g = new WheelGate();
    g.push({ deltaY: 40 }, 0);
    expect(g.push({ deltaY: 40 }, 1000)).toBe(0);
  });
});

describe('atajos de teclado', () => {
  it('1-4 y A-D responden; J/K y las flechas cambian de Tap', () => {
    expect(keyAction({ key: '3' }, true)).toEqual({ kind: 'option', index: 2 });
    expect(keyAction({ key: 'D' }, true)).toEqual({ kind: 'option', index: 3 });
    expect(keyAction({ key: 'j' }, true)).toEqual({ kind: 'step', dir: 1 });
    expect(keyAction({ key: 'ArrowUp' }, true)).toEqual({ kind: 'step', dir: -1 });
    expect(keyAction({ key: 'PageDown' }, true)).toEqual({ kind: 'step', dir: 1 });
  });

  it('con los atajos apagados solo quedan las flechas, Esc y Enter (WCAG 2.1.4)', () => {
    expect(keyAction({ key: '1' }, false)).toBeNull();
    expect(keyAction({ key: 'r' }, false)).toBeNull();
    expect(keyAction({ key: ' ' }, false)).toBeNull();
    expect(keyAction({ key: 'ArrowDown' }, false)).toEqual({ kind: 'step', dir: 1 });
    expect(keyAction({ key: 'Escape' }, false)).toEqual({ kind: 'escape' });
    expect(keyAction({ key: 'Enter' }, false)).toEqual({ kind: 'continue' });
  });

  it('«[» se alcanza con AltGr (Ctrl + Alt) en teclados en español, pero ninguna otra letra con Ctrl + Alt', () => {
    expect(keyAction({ key: '[', ctrlKey: true, altKey: true }, true)).toEqual({ kind: 'menu' });
    expect(keyAction({ key: '[', ctrlKey: true, altKey: true, metaKey: true }, true)).toBeNull();
    expect(keyAction({ key: '[', altKey: true }, true)).toBeNull();
    expect(keyAction({ key: 'r', ctrlKey: true, altKey: true }, true)).toBeNull();
  });

  it('Ctrl, Alt o Meta nunca activan un atajo', () => {
    expect(keyAction({ key: 'r', ctrlKey: true }, true)).toBeNull();
    expect(keyAction({ key: '1', metaKey: true }, true)).toBeNull();
    expect(keyAction({ key: 'ArrowDown', altKey: true }, true)).toBeNull();
  });

  it('M, R, T, F, [ y ? tienen su acción y Espacio sigue', () => {
    const kinds = ['m', 'r', 't', 'f', '[', '?', ' '].map(key => keyAction({ key }, true)?.kind);
    expect(kinds).toEqual(['sound', 'challenge', 'topics', 'focus', 'menu', 'help', 'continue']);
  });

  it('no se activan al escribir ni dentro de un diálogo', () => {
    const input = document.createElement('input'), dialog = document.createElement('dialog'), button = document.createElement('button');
    dialog.appendChild(button);
    expect(typingTarget(input)).toBeTrue();
    expect(typingTarget(button)).toBeTrue();
    expect(typingTarget(document.createElement('div'))).toBeFalse();
    expect(typingTarget(null)).toBeFalse();
  });
});

describe('panel contextual (solo lo que el cliente sabe)', () => {
  const tap = mk('a1', 'mc'), next = mk('a2', 'mc');
  const ctx = (run: ITapRun, extra = {}) => ({ tap, run, next, interest: emptyInterest(), now: NOW, topicName: 'Minecraft', topicColor: '#5fbf3a', ...extra });
  const base = startRun(tap);

  it('estados: pregunta, acierto, fallo y resultado', () => {
    expect(panelState(base)).toBe('pregunta');
    expect(panelState({ ...base, chosen: 0, answers: [true] })).toBe('acierto');
    expect(panelState({ ...base, chosen: 1, answers: [false] })).toBe('fallo');
    expect(panelState({ ...base, finished: true })).toBe('resultado');
  });

  it('nunca pasa de 3 tarjetas y nunca inventa datos de servidor', () => {
    for (const run of [base, { ...base, chosen: 0, answers: [true] }, { ...base, chosen: 1, answers: [false] }, { ...base, finished: true }]) {
      const cards = panelCards(ctx(run), [tap, next]);
      expect(cards.length).toBeLessThanOrEqual(3);
      expect(cards.map(c => c.title).join(' ')).not.toMatch(/ranking|respondieron|percentil|en vivo/i);
    }
  });

  it('antes de jugar: racha en cero, avance del tema y el siguiente Tap', () => {
    const cards = panelCards(ctx(base), [tap, next]);
    expect(cards.map(c => c.id)).toEqual(['racha', 'avance', 'siguiente']);
    expect(cards[0].body).toContain('Juega 1 Tap');
    expect(cards[2].next?.title).toBe('a2');
  });

  it('tras fallar muestra la explicación ampliada solo si el banco la trae', () => {
    const fail = { ...base, chosen: 1, answers: [false] };
    expect(panelCards(ctx(fail), [tap, next]).map(c => c.id)).toEqual(['este-tap', 'siguiente']);
    const withMore = { ...tap, questions: [{ ...tap.questions[0], more: 'Explicación más larga.' }, ...tap.questions.slice(1)] };
    const cards = panelCards({ ...ctx(fail), tap: withMore }, [withMore, next]);
    expect(cards[0]).toEqual(jasmine.objectContaining({ id: 'por-que', body: 'Explicación más larga.' }));
  });

  it('en el resultado la única llamada a la acción es «Jugar el siguiente»', () => {
    const cards = panelCards(ctx({ ...base, finished: true, score: 4, answers: [true, true, true, true, false] }), [tap, next]);
    expect(cards.filter(c => c.cta).length).toBe(1);
    expect(cards.find(c => c.cta)?.cta?.label).toBe('Jugar el siguiente');
  });

  it('«casi lo logras» solo si de verdad se puede alcanzar con las preguntas que quedan', () => {
    const run = (score: number, index: number): ITapRun => ({ ...base, score, index, chosen: 0, answers: Array(index + 1).fill(true) });
    expect(almostThere(tap, run(2, 2))).toBe('1 acierto más y eres «Crack»');
    expect(almostThere(tap, run(0, 4))).toBeNull();
    expect(almostThere(tap, run(5, 4))).toBeNull();
  });
});
