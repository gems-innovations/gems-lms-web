import { HOOK_TAP_IDS, TAPS } from './taps.data';
import { emptyInterest, markCompleted, personalize } from './taps.interest';
import { orderFeed, topicOf } from './taps.logic';
import { barajarOpciones, conDosOpciones, crearAzar, mezclarFeed, opcionesBarajables, penalizacion, semillaDe, temasDistintos } from './taps.mezcla';
import { ITap, ITapQuestion } from './taps.types';

const HORA = 3600 * 1000, DIA = 24 * HORA;
const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime();
const ids = (list: readonly ITap[]) => list.map(t => t.id);

const mk = (id: string, topic = 'mc', extra: Partial<ITap> = {}): ITap => ({
  id, theme: 'minecraft', title: id, kicker: '', topic, scene: { world: 'pradera', host: 'leo' }, backdrop: ['#000', '#111'],
  questions: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, q: '¿?', options: ['a', 'b', 'c', 'd'], answer: i % 4, why: '.' })),
  results: [{ min: 0, title: 'A', line: 'a' }], ...extra,
});

/** Un banco sintético parecido al real: 3 temas, subtemas, niveles y un par de Taps de 2 opciones. */
function banco(): ITap[] {
  const niveles = ['facil', 'media', 'dificil'] as const;
  const out: ITap[] = [];
  for (const [topic, n] of [['mc', 12], ['lg', 9], ['cu', 9]] as const) {
    for (let i = 0; i < n; i++) out.push(mk(`${topic}-${i}`, topic, { hook: i === 0, level: niveles[i % 3], subtopic: `s${i % 3}` }));
  }
  out[3].questions[1] = { ...out[3].questions[1], options: ['Sí', 'No'], answer: 0 };
  out[4].questions[2] = { ...out[4].questions[2], options: ['Sí', 'No'], answer: 1 };
  return out;
}

const sinRepetirTema = (list: readonly ITap[]) => list.every((t, i) => i === 0 || topicOf(t) !== topicOf(list[i - 1]));
const sinTresDificiles = (list: readonly ITap[]) => list.every((t, i) => i < 2 || !(t.level === 'dificil' && list[i - 1].level === 'dificil' && list[i - 2].level === 'dificil'));

describe('crearAzar y semillaDe', () => {
  it('la misma semilla da la misma serie; otra semilla, otra', () => {
    const a = crearAzar('x'), b = crearAzar('x'), c = crearAzar('y');
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    expect(sa.every(v => v >= 0 && v < 1)).toBeTrue();
  });
  it('la semilla del día junta dispositivo y fecha de Colombia', () => {
    expect(semillaDe('abc', '2026-10-19')).toBe('abc|2026-10-19');
    expect(semillaDe('abc', '2026-10-20')).not.toBe(semillaDe('abc', '2026-10-19'));
  });
});

describe('mezclarFeed', () => {
  const feed = banco();

  it('es determinista por semilla y conserva todos los Taps sin repetir', () => {
    const a = mezclarFeed(feed, { semilla: 'd1|2026-10-19' }), b = mezclarFeed(feed, { semilla: 'd1|2026-10-19' });
    expect(ids(a)).toEqual(ids(b));
    expect(a.length).toBe(feed.length);
    expect(new Set(ids(a)).size).toBe(feed.length);
  });

  it('dos personas, o dos días, ven filas distintas', () => {
    const uno = mezclarFeed(feed, { semilla: semillaDe('d1', '2026-10-19'), fijos: 1 });
    const otro = mezclarFeed(feed, { semilla: semillaDe('d2', '2026-10-19'), fijos: 1 });
    const manana = mezclarFeed(feed, { semilla: semillaDe('d1', '2026-10-20'), fijos: 1 });
    expect(ids(uno)).not.toEqual(ids(otro));
    expect(ids(uno)).not.toEqual(ids(manana));
  });

  it('las posiciones fijas no se mueven (gancho de alguien nuevo, Tap del enlace, lo ya respondido)', () => {
    for (const fijos of [1, 3]) {
      const out = mezclarFeed(feed, { semilla: 's', fijos });
      expect(ids(out).slice(0, fijos)).toEqual(ids(feed).slice(0, fijos));
    }
  });

  it('nunca dos seguidos del mismo tema ni del mismo subtema, ni tres difíciles seguidos, en muchas semillas', () => {
    for (let s = 0; s < 40; s++) {
      const out = mezclarFeed(orderFeed(feed, {}), { semilla: 'semilla-' + s, fijos: 1 });
      expect(sinRepetirTema(out)).withContext('tema, semilla ' + s).toBeTrue();
      expect(out.every((t, i) => i === 0 || topicOf(t) !== topicOf(out[i - 1]) || t.subtopic !== out[i - 1].subtopic)).withContext('subtema ' + s).toBeTrue();
      // en el banco sintético un tercio es difícil: al final de la cola puede no quedar otra cosa (la elección es voraz)
      expect(sinTresDificiles(out.slice(0, -3))).withContext('dificultad ' + s).toBeTrue();
    }
  });

  it('los Taps con preguntas de 2 opciones no van pegados', () => {
    for (let s = 0; s < 40; s++) {
      const out = mezclarFeed(orderFeed(feed, {}), { semilla: 'f' + s, fijos: 1 });
      expect(out.every((t, i) => i === 0 || !(conDosOpciones(t) && conDosOpciones(out[i - 1])))).withContext('semilla ' + s).toBeTrue();
    }
    expect(feed.filter(conDosOpciones).length).toBe(2);
  });

  it('lo jugado hace poco va al fondo (generaliza freshHead); lo fijo no', () => {
    const lista = ['a', 'b', 'c', 'd', 'e'].map(id => mk(id));
    let i = markCompleted(markCompleted(emptyInterest(), lista[0], NOW - DIA), lista[1], NOW - DIA);
    const reciente = (t: ITap) => (i.done[t.id] ?? 0) > NOW - 14 * DIA;
    expect(ids(mezclarFeed(lista, { semilla: 's', reciente })).slice(-2).sort()).toEqual(['a', 'b']);
    expect(ids(mezclarFeed(lista, { semilla: 's', reciente, fijos: 1 }))[0]).toBe('a');
    expect(ids(mezclarFeed(lista, { semilla: 's', reciente, fijos: 1 }))[4]).toBe('b');
    // pasados 14 días vuelve a contar como nuevo
    i = markCompleted(emptyInterest(), lista[0], NOW - 15 * DIA);
    expect(ids(mezclarFeed(lista, { semilla: 's', reciente })).slice(-1)).not.toEqual(['a']);
  });

  it('los grupos salen en orden (?tema= primero, bloqueados al final) y lo reciente va al fondo de su grupo', () => {
    const lista = orderFeed(feed, {});
    const reciente = (t: ITap) => t.id === 'lg-2';
    const out = mezclarFeed(lista, { semilla: 's', reciente, grupo: t => (topicOf(t) === 'lg' ? 0 : topicOf(t) === 'cu' ? 2 : 1) });
    expect(out.slice(0, 9).every(t => topicOf(t) === 'lg')).toBeTrue();
    expect(out[8].id).toBe('lg-2');
    expect(out.slice(9, 21).every(t => topicOf(t) === 'mc')).toBeTrue();
    expect(out.slice(21).every(t => topicOf(t) === 'cu')).toBeTrue();
  });

  it('penalizacion: tema repetido pesa más que todo lo demás', () => {
    const a = mk('a', 'mc', { subtopic: 'x', level: 'dificil' }), b = mk('b', 'mc', { subtopic: 'x', level: 'dificil' });
    const c = mk('c', 'lg', { level: 'facil' });
    expect(penalizacion([], a)).toBe(0);
    expect(penalizacion([a], b)).toBeGreaterThan(penalizacion([a], c) + 100);
    expect(penalizacion([a, b], mk('d', 'cu', { level: 'dificil' }))).toBeGreaterThanOrEqual(60);
  });
});

describe('mezclarFeed con el banco real', () => {
  const base = orderFeed(TAPS, {});
  const semillas = Array.from({ length: 50 }, (_, i) => semillaDe('dispositivo-' + i, '2026-10-19'));

  it('cumple las restricciones del feed en 50 dispositivos distintos y el gancho sigue primero', () => {
    for (const semilla of semillas) {
      const out = mezclarFeed(base, { semilla, fijos: 1 });
      expect(out[0].id).toBe(base[0].id);
      expect(out.length).toBe(base.length);
      expect(sinRepetirTema(out)).withContext(semilla).toBeTrue();
      expect(out.every((t, i) => i === 0 || topicOf(t) !== topicOf(out[i - 1]) || t.subtopic !== out[i - 1].subtopic)).withContext(semilla).toBeTrue();
      expect(sinTresDificiles(out)).withContext(semilla).toBeTrue();
    }
  });

  it('los primeros 10 Taps traen los 3 temas, para todos los dispositivos', () => {
    const conteos = semillas.map(semilla => temasDistintos(mezclarFeed(base, { semilla, fijos: 1 }), 10));
    expect(Math.min(...conteos)).toBe(3);
  });

  it('50 dispositivos dan 50 filas distintas y la misma semilla la misma', () => {
    const filas = new Set(semillas.map(semilla => ids(mezclarFeed(base, { semilla, fijos: 1 })).join()));
    expect(filas.size).toBe(semillas.length);
    expect(ids(mezclarFeed(base, { semilla: semillas[0] }))).toEqual(ids(mezclarFeed(base, { semilla: semillas[0] })));
  });

  it('se lleva bien con «Para ti»: personalizar y mezclar la cola conserva el orden del inicio', () => {
    let i = emptyInterest();
    for (const t of base.slice(0, 4)) i = markCompleted(i, t, NOW - HORA);
    const lista = personalize(base, 3, i, NOW), out = mezclarFeed(lista, { semilla: semillas[1], fijos: 3 });
    expect(ids(out).slice(0, 3)).toEqual(ids(lista).slice(0, 3));
    expect(sinRepetirTema(out.slice(2))).toBeTrue();
  });
});

describe('barajarOpciones', () => {
  const tap = mk('t', 'mc', { hook: true });

  it('baraja con semilla por persona, answer sigue apuntando a la correcta y la primera del gancho no se toca', () => {
    const a = barajarOpciones(tap, 'persona-1', k => k === 0 && !!tap.hook), b = barajarOpciones(tap, 'persona-1', k => k === 0);
    expect(a.questions[0]).toBe(tap.questions[0]);
    expect(a.questions.map(q => q.options)).toEqual(b.questions.map(q => q.options));
    a.questions.forEach((q, k) => {
      expect(q.options[q.answer]).toBe(tap.questions[k].options[tap.questions[k].answer]);
      expect([...q.options].sort()).toEqual([...tap.questions[k].options].sort());
    });
    expect(a.questions.slice(1).some((q, k) => q.options.join() !== tap.questions[k + 1].options.join())).toBeTrue();
    const otra = barajarOpciones(tap, 'persona-2', k => k === 0);
    expect(otra.questions.map(q => q.options.join())).not.toEqual(a.questions.map(q => q.options.join()));
  });

  it('no toca las de 2 opciones ni las que se refieren a otras por posición', () => {
    const vf: ITapQuestion = { id: 'v', q: '', options: ['Verdadero', 'Falso'], answer: 1, why: '' };
    const pos: ITapQuestion = { id: 'p', q: '', options: ['A', 'B', 'A y B', 'Ninguna'], answer: 2, why: '' };
    const ok: ITapQuestion = { id: 'o', q: '', options: ['Carbón', 'Pólvora', 'Hueso', 'Hilo'], answer: 1, why: '' };
    expect(opcionesBarajables(vf)).toBeFalse();
    expect(opcionesBarajables(pos)).toBeFalse();
    expect(opcionesBarajables(ok)).toBeTrue();
    const t = barajarOpciones({ ...tap, questions: [vf, pos] }, 'p');
    expect(t).toBe(t);
    expect(t.questions[0]).toBe(vf);
    expect(t.questions[1]).toBe(pos);
  });

  it('con el banco real: todas las respuestas siguen siendo correctas y la primera pregunta de cada gancho queda igual', () => {
    for (const t of TAPS) {
      const b = barajarOpciones(t, 'persona-x', k => k === 0 && !!t.hook);
      b.questions.forEach((q, k) => expect(q.options[q.answer]).withContext(t.id + '/' + q.id).toBe(t.questions[k].options[t.questions[k].answer]));
      if (HOOK_TAP_IDS.includes(t.id)) expect(b.questions[0]).toBe(t.questions[0]);
    }
  });
});
