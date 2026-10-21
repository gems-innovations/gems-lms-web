import { dayKey, emptyInterest, markCompleted } from './taps.interest';
import {
  META_DIA, PARTIDAS_VIGENCIA_MS, REGRESO_MS, bestStreak, emptySesion, greeting, hasProgress, parseRuns, parseSesion,
  rematchText, sessionBucket, sessionGoal, sessionLabel, sessionSummary, sessionTapsBucket, storeRun,
} from './taps.sesion';
import { ITap, ITapRun } from './taps.types';

const HORA = 3600 * 1000, DIA = 24 * HORA;
/** Mediodía local: sumar o restar horas no cruza de día por accidente. */
const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime();

const mk = (id: string, topic = 'mc'): ITap => ({
  id, theme: 'minecraft', title: id, kicker: '', topic, scene: { world: 'pradera', host: 'leo' }, backdrop: ['#000', '#111'],
  questions: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, q: '¿?', options: ['a', 'b'], answer: 0, why: '.' })),
  results: [{ min: 0, title: 'A', line: 'a' }],
});
const run = (id: string, over: Partial<ITapRun> = {}): ITapRun => ({ tapId: id, index: 1, chosen: null, score: 1, answers: [true], finished: false, ...over });

describe('sessionGoal (meta del día: 3 Taps)', () => {
  it('cuenta los Taps completados hoy: 0, 1, 3 y más de 3', () => {
    let i = emptyInterest();
    expect(sessionGoal(i, NOW)).toEqual({ hechos: 0, meta: META_DIA, cumplida: false });
    i = markCompleted(i, mk('a'), NOW - HORA);
    expect(sessionGoal(i, NOW)).toEqual({ hechos: 1, meta: 3, cumplida: false });
    i = markCompleted(markCompleted(i, mk('b'), NOW - 30_000), mk('c'), NOW);
    expect(sessionGoal(i, NOW)).toEqual({ hechos: 3, meta: 3, cumplida: true });
    i = markCompleted(i, mk('d'), NOW);
    expect(sessionGoal(i, NOW).hechos).toBe(4);
    expect(sessionGoal(i, NOW).cumplida).toBeTrue();
  });

  it('repetir el mismo Tap hoy no suma dos veces', () => {
    const i = markCompleted(markCompleted(emptyInterest(), mk('a'), NOW - HORA), mk('a'), NOW);
    expect(sessionGoal(i, NOW).hechos).toBe(1);
  });

  it('al cambiar de día la meta vuelve a 0 (lo de ayer no cuenta)', () => {
    const i = markCompleted(markCompleted(markCompleted(emptyInterest(), mk('a'), NOW), mk('b'), NOW), mk('c'), NOW);
    expect(sessionGoal(i, NOW).cumplida).toBeTrue();
    expect(sessionGoal(i, NOW + DIA)).toEqual({ hechos: 0, meta: 3, cumplida: false });
  });
});

describe('racha y resumen', () => {
  it('bestStreak encuentra la racha más larga aunque ya se haya cortado', () => {
    expect(bestStreak([])).toBe(0);
    expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'])).toBe(3);
    expect(bestStreak(['2026-10-31', '2026-11-01'])).toBe(2);       // cruza de mes
  });

  it('sessionSummary: sin progreso la barra muestra la marca; con 1 Tap, racha 1 y hoy 1/3', () => {
    expect(hasProgress(sessionSummary(emptyInterest(), NOW))).toBeFalse();
    const r = sessionSummary(markCompleted(emptyInterest(), mk('a'), NOW), NOW);
    expect(r).toEqual(jasmine.objectContaining({ racha: 1, rachaHoy: true }));
    expect(r.meta.hechos).toBe(1);
    expect(hasProgress(r)).toBeTrue();
  });
});

describe('greeting (saludo al volver)', () => {
  const ayer = markCompleted(emptyInterest(), mk('a'), NOW - DIA);
  const visita = { ...emptySesion(), ultima: NOW - DIA };

  it('no saluda a quien nunca jugó, a quien vuelve antes de 20 h ni a quien llega por primera vez', () => {
    expect(greeting(emptyInterest(), visita, NOW)).toBeNull();
    expect(greeting(ayer, { ...visita, ultima: NOW - REGRESO_MS + 60_000 }, NOW)).toBeNull();
    expect(greeting(ayer, emptySesion(), NOW)).toBeNull();
  });

  it('con la racha viva dice la racha sin presión', () => {
    const dos = markCompleted(ayer, mk('b'), NOW - 2 * DIA);
    expect(greeting(dos, visita, NOW)).toBe('¡Volviste! Racha de 2 días. Hoy hay Taps nuevos');
  });

  it('con la racha cortada no culpa: recuerda la mejor y propone empezar otra', () => {
    let viejo = emptyInterest();
    for (const d of [5, 6, 7, 8]) viejo = markCompleted(viejo, mk(`t${d}`), NOW - d * DIA);
    const text = greeting(viejo, { ...visita, ultima: NOW - 5 * DIA }, NOW)!;
    expect(text).toBe('¡Qué bueno verte! Tu mejor racha: 4 días. Empieza una nueva hoy');
    expect(text).not.toMatch(/perdiste|perder|rompiste|lástima/i);
  });

  it('rematchText: «Ya lo jugaste: 3/5. ¿Revancha?» solo si ya se completó', () => {
    const tap = mk('a');
    expect(rematchText(tap, emptyInterest(), emptySesion())).toBeNull();
    expect(rematchText(tap, markCompleted(emptyInterest(), tap, NOW), { ...emptySesion(), puntajes: { a: 3 } })).toBe('Ya lo jugaste: 3/5. ¿Revancha?');
    expect(rematchText(tap, markCompleted(emptyInterest(), tap, NOW), emptySesion())).toBe('Ya lo jugaste. ¿Revancha?');
  });

  it('parseSesion tolera valores rotos', () => {
    expect(parseSesion('{roto')).toEqual(emptySesion());
    expect(parseSesion(JSON.stringify({ ultima: 'x', celebrada: 'ayer', puntajes: { a: 3, b: -1, c: 'x' } })))
      .toEqual({ ultima: 0, celebrada: null, puntajes: { a: 3 } });
  });
});

describe('partidas guardadas (localStorage, 48 h)', () => {
  const known = new Set(['a', 'b', 'c']);

  it('guarda, lee y descarta lo vencido, lo vacío y lo desconocido', () => {
    let { saved, raw } = storeRun({}, run('a'), NOW - 50 * HORA);
    ({ saved, raw } = storeRun(saved, run('b', { index: 3, answers: [true, false, true], score: 2 }), NOW - HORA));
    const back = parseRuns(raw, NOW, known);
    expect(Object.keys(back)).toEqual(['b']);                       // la de hace 50 h venció
    expect(back['b'].index).toBe(3);
    expect(Object.keys(storeRun(back, run('b', { answers: [], index: 0, score: 0 }), NOW).saved)).toEqual([]);
    expect(parseRuns(JSON.stringify({ v: 2, runs: { zz: { ...run('zz'), t: NOW } } }), NOW, known)).toEqual({});
    expect(parseRuns('no es json', NOW, known)).toEqual({});
  });

  it('acepta el formato anterior de sessionStorage como de ahora', () => {
    const back = parseRuns(JSON.stringify({ a: run('a'), c: { basura: true } }), NOW, known);
    expect(Object.keys(back)).toEqual(['a']);
    expect(back['a'].t).toBe(NOW);
    expect(PARTIDAS_VIGENCIA_MS).toBe(48 * HORA);
  });
});

describe('medición de la sesión', () => {
  it('sessionBucket reparte la duración en tramos', () => {
    expect(sessionBucket(30_000)).toBe('0-1min');
    expect(sessionBucket(90_000)).toBe('1-3min');
    expect(sessionBucket(4 * 60_000)).toBe('3-5min');
    expect(sessionBucket(5 * 60_000)).toBe('5-10min');
    expect(sessionBucket(45 * 60_000)).toBe('10+min');
  });

  it('sessionTapsBucket da el número exacto hasta 9 y luego 10+', () => {
    expect(sessionTapsBucket(0)).toBe('0');
    expect(sessionTapsBucket(4)).toBe('4');
    expect(sessionTapsBucket(12)).toBe('10+');
  });

  it('dayKey y la meta usan el día local', () => {
    expect(dayKey(NOW)).toBe('2026-10-19');
  });
});

describe('arreglos de la revisión', () => {
  it('una partida terminada otro día no se retoma; una de hoy sí; a medias, 48 h', () => {
    const known = new Set(['a', 'b']);
    let { saved } = storeRun({}, run('a', { finished: true, answers: [true, true, true, true, true], index: 4, score: 5 }), NOW - DIA);
    const { raw } = storeRun(saved, run('b'), NOW - DIA);
    expect(Object.keys(parseRuns(raw, NOW, known))).toEqual(['b']);
    expect(Object.keys(parseRuns(raw, NOW - DIA + 60_000, known)).sort()).toEqual(['a', 'b']);
  });

  it('etiqueta completa para lectores de pantalla', () => {
    const r = sessionSummary(markCompleted(emptyInterest(), mk('a'), NOW), NOW);
    expect(sessionLabel(r)).toBe('Racha de 1 día. Hoy 1 de 3 Taps.');
  });
});
