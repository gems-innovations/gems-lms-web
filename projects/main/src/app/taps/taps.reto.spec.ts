import { TAPS } from './taps.data';
import { topicOf } from './taps.logic';
import { RETO_INICIO, RETO_ROTACION, RETO_ROTACIONES, dailyTap, fechaColombia, parseReto, retoLabel, retoShareText, retoUrl, temaDelDia } from './taps.reto';
import {
  avanceColeccion, coleccionDe, colecciones, emptyColecciones, gradoDe, parseColecciones, registrarPuntaje, sembrarInsignias,
} from './taps.coleccion';
import {
  IPausaSesion, PAUSA_HUECO_MAX_MS, PAUSA_INACTIVA_MS, nuevaPausa, parsePausa, pauseSummary, reanudarPausa, registrarActividad,
  shouldSuggestPause,
} from './taps.sesion';
import { TAPS_RETO_CALENDARIO } from './taps.banco.generated';
import { rematchGoal } from './taps.panel';

const DIA = 86_400_000;
/** Fecha AAAA-MM-DD sumando días a una fecha. */
const mas = (fecha: string, n: number) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * DIA).toISOString().slice(0, 10);

describe('Reto del día (dailyTap)', () => {
  it('usa la fecha de Colombia (UTC-5): cambia a la medianoche de Colombia, no a la del navegador', () => {
    expect(fechaColombia(Date.parse('2026-10-20T04:59:00Z'))).toBe('2026-10-19');
    expect(fechaColombia(Date.parse('2026-10-20T05:00:00Z'))).toBe('2026-10-20');
  });

  it('es determinista: el mismo día da el mismo Tap (dos navegadores, mismo resultado) y cambia al día siguiente', () => {
    const a = dailyTap(TAPS, '2026-10-21'), b = dailyTap([...TAPS].reverse(), '2026-10-21');
    expect(a?.tap.id).toBe(b?.tap.id);
    expect(dailyTap(TAPS, '2026-10-22')?.tap.id).not.toBe(a?.tap.id);
  });

  it('numera desde el reto #1 y rota el tema: lun Minecraft, mar Lógica, mié Cultura… (y dom Tecnología desde el día 427)', () => {
    expect(dailyTap(TAPS, RETO_INICIO)?.numero).toBe(1);
    expect(dailyTap(TAPS, mas(RETO_INICIO, 41))?.numero).toBe(42);
    for (const d of [0, 1, 2, 3, 4, 5, 6, 427, 428, 433, 440]) {
      const r = dailyTap(TAPS, mas(RETO_INICIO, d))!;
      expect(r.tema).withContext(`día ${d}`).toBe(temaDelDia(d));
      expect(topicOf(r.tap)).withContext(`día ${d}`).toBe(temaDelDia(d));
    }
    expect(RETO_ROTACION.slice(0, 3)).toEqual(['minecraft', 'logica', 'cultura']);
    expect(RETO_ROTACION[6]).toBe('tecnologia');
    // los días ya fijados conservan la rotación con la que se fijaron (el domingo era Minecraft)
    expect(temaDelDia(6)).toBe('minecraft');
    expect(temaDelDia(433)).toBe('tecnologia');
    expect(RETO_ROTACIONES[1].desde % 7).toBe(0);
    expect(dailyTap(TAPS, mas(RETO_INICIO, 6))!.tema).toBe('minecraft');
    expect(dailyTap(TAPS, mas(RETO_INICIO, 433))!.tema).toBe('tecnologia');
  });

  it('solo elige Taps del banco (los que acepta el ranking), nunca uno de gancho, y no repite un Tap del tema hasta agotarlos', () => {
    const ids = new Set(TAPS.map(t => t.id)), vistos = new Map<string, string[]>();
    for (let d = 0; d < 7 * 30; d++) {
      const r = dailyTap(TAPS, mas(RETO_INICIO, d))!;
      expect(ids.has(r.tap.id)).toBeTrue();
      expect(r.tap.hook).toBeFalsy();
      vistos.set(r.tema, [...(vistos.get(r.tema) ?? []), r.tap.id]);
    }
    // Los días ya fijados recorren los Taps que había al fijarlos antes de repetir; los agregados después entran en los días
    // que se suman al final del calendario (lo comprueba generar-taps.test.mjs con el calendario completo).
    for (const [tema, lista] of vistos) {
      const n = new Set(lista).size;
      expect(new Set(lista.slice(0, n)).size).withContext(tema).toBe(n);
    }
  });

  it('sigue el calendario fijo y versionado, que intercala subtemas (nunca dos días del mismo tema con el mismo subtema)', () => {
    const sub = new Map(TAPS.map(t => [t.id, `${topicOf(t)}/${t.subtopic}`]));
    const ultimo = new Map<string, string>();
    TAPS_RETO_CALENDARIO.dias.forEach((id, d) => {
      expect(dailyTap(TAPS, mas(RETO_INICIO, d))!.tap.id).withContext(String(d)).toBe(id);
      const [tema, s] = sub.get(id)!.split('/');
      expect(ultimo.get(tema)).withContext(`día ${d}`).not.toBe(s);
      ultimo.set(tema, s);
    });
  });

  it('más allá del calendario hay un respaldo determinista con la misma rotación, y el número nunca baja de 1', () => {
    const fuera = mas(RETO_INICIO, TAPS_RETO_CALENDARIO.dias.length + 3);
    const r = dailyTap(TAPS, fuera)!;
    expect(r.tap.id).toBe(dailyTap([...TAPS].reverse(), fuera)!.tap.id);
    expect(topicOf(r.tap)).toBe(temaDelDia(TAPS_RETO_CALENDARIO.dias.length + 3));
    expect(r.tap.hook).toBeFalsy();
    expect(dailyTap(TAPS, '2026-01-01')!.numero).toBe(1);
  });

  it('un calendario que nombra un Tap que ya no existe cae al respaldo (nunca inventa un id)', () => {
    const r = dailyTap(TAPS, RETO_INICIO, { inicio: RETO_INICIO, dias: ['tap-retirado'] })!;
    expect(TAPS.some(t => t.id === r.tap.id)).toBeTrue();
    expect(topicOf(r.tap)).toBe('minecraft');
  });

  it('se comparte con /hoy (tarjeta neutra), no con el enlace del Tap', () => {
    expect(retoUrl('https://lms.gemsinnovations.com/')).toBe('https://lms.gemsinnovations.com/hoy');
  });

  it('el intento guardado solo vale el mismo día', () => {
    const raw = JSON.stringify({ fecha: '2026-10-21', numero: 3, tapId: 'lg-zorgs', answers: [true, false, true, true, true] });
    expect(parseReto(raw, '2026-10-21')?.answers.length).toBe(5);
    expect(parseReto(raw, '2026-10-22')).toBeNull();
    expect(parseReto('{roto', '2026-10-21')).toBeNull();
    expect(parseReto(JSON.stringify({ fecha: '2026-10-21', numero: 3, tapId: 'x', answers: [] }), '2026-10-21')).toBeNull();
  });

  it('el texto para compartir lleva el número y la cuadrícula, sin el título del Tap ni respuestas', () => {
    const tap = dailyTap(TAPS, '2026-10-21')!.tap;
    const text = retoShareText(3, 'Cultura general', [true, false, true, true, true], 5, 'https://x/t/' + tap.id);
    expect(text).toContain(retoLabel(3));
    expect(text).toContain('4/5');
    expect(text).not.toContain(tap.title);
    for (const q of tap.questions) {
      expect(text).not.toContain(q.q);
      expect(text).not.toContain(q.options[q.answer]);
    }
  });
});

describe('Colecciones por subtema', () => {
  const cols = colecciones(TAPS);

  it('cada Tap está en una sola colección y ninguna colección tiene 1 sola casilla', () => {
    const todos = cols.flatMap(c => c.tapIds);
    const enColecciones = TAPS.filter(t => !t.soloEnlace).length;      // un Tap solo enlace no forma colección
    expect(todos.length).toBe(enColecciones);
    expect(new Set(todos).size).toBe(enColecciones);
    expect(cols.every(c => c.tapIds.length >= 2)).toBeTrue();
    expect(coleccionDe(cols, 'mc-mascotas')?.nombre).toBe('Mobs');
  });

  it('bronce al completar, plata con 80 % o más y oro con todo perfecto; el «casi» dice lo que de verdad falta', () => {
    const mobs = coleccionDe(cols, 'mc-mascotas')!, n = mobs.tapIds.length;
    const con = (score: number, hechos = n) => Object.fromEntries(mobs.tapIds.slice(0, hechos).map(id => [id, score]));
    const a0 = avanceColeccion(mobs, TAPS, con(5, n - 1), {});
    expect(a0.grado).toBeNull();
    expect(a0.casi).toBe('Te falta 1 Tap para la insignia de bronce');
    const bronce = avanceColeccion(mobs, TAPS, con(3), {});
    expect(bronce.grado).toBe('bronce');
    expect(bronce.casi).toContain('Para plata');
    expect(avanceColeccion(mobs, TAPS, con(4), {}).grado).toBe('plata');
    const oro = avanceColeccion(mobs, TAPS, con(5), {});
    expect(oro.grado).toBe('oro');
    expect(oro.casi).toBeNull();
    expect(gradoDe([])).toBeNull();
  });

  it('registrarPuntaje guarda el mejor puntaje y avisa solo cuando la insignia es nueva o sube', () => {
    const series = coleccionDe(cols, 'lg-codigo-1')!;                     // una colección de 2 Taps
    expect(series.tapIds.length).toBe(2);
    const [t1, t2] = series.tapIds.map(id => TAPS.find(t => t.id === id)!);
    let g = emptyColecciones();
    let r = registrarPuntaje(g, t1, 3, cols, TAPS, { [t1.id]: 1 });
    expect(r.nueva).toBeNull();
    g = r.guardada;
    r = registrarPuntaje(g, t2, 3, cols, TAPS, { [t1.id]: 1, [t2.id]: 1 });
    expect(r.nueva?.grado).toBe('bronce');
    g = r.guardada;
    r = registrarPuntaje(g, t2, 1, cols, TAPS, { [t1.id]: 1, [t2.id]: 1 });
    expect(r.nueva).toBeNull();
    expect(r.guardada.mejores[t2.id]).toBe(3);                         // se queda el mejor
    r = registrarPuntaje(r.guardada, t1, 5, cols, TAPS, { [t1.id]: 1, [t2.id]: 1 });
    expect(r.nueva?.grado).toBe('plata');                               // 8 de 10
    expect(parseColecciones(JSON.stringify(r.guardada))).toEqual(r.guardada);
    expect(parseColecciones('nada')).toEqual(emptyColecciones());
  });
});

describe('Insignias ya ganadas al cargar (sembrarInsignias)', () => {
  it('anota las que el avance guardado ya merece, sin bajar ninguna: así no se celebran otra vez', () => {
    const cols = colecciones(TAPS), series = coleccionDe(cols, 'lg-series-1')!;
    const mejores = Object.fromEntries(series.tapIds.map(id => [id, 5]));
    const g = sembrarInsignias({ mejores, insignias: {} }, cols, TAPS, {});
    expect(g.insignias[series.id]).toBe('oro');
    const otra = TAPS.find(t => t.id === series.tapIds[0])!;
    expect(registrarPuntaje(g, otra, 5, cols, TAPS, {}).nueva).toBeNull();
    expect(sembrarInsignias({ mejores: {}, insignias: { [series.id]: 'plata' } }, cols, TAPS, {}).insignias[series.id]).toBe('plata');
  });
});

describe('Revancha honesta (rematchGoal)', () => {
  const tap = TAPS.find(t => t.id === 'mc-gancho')!;                  // títulos con 0, 2, 4 y 5 aciertos
  it('con 3/5 o 4/5 y a 1 acierto del siguiente título, sí; con 5/5 o 0-2/5, no', () => {
    expect(rematchGoal(tap, 4)?.title).toBe('Leyenda del servidor');
    expect(rematchGoal(tap, 3)?.title).toBe('Crack de bloques');
    for (const s of [0, 1, 2, 5]) expect(rematchGoal(tap, s)).withContext(String(s)).toBeNull();
  });
});

describe('Pausa sana (tiempo activo)', () => {
  /** Mediodía local: sumar minutos no cruza de día por accidente. */
  const T0 = new Date(2026, 9, 19, 12, 0, 0).getTime(), MIN = 60_000;
  /** Juega `n` minutos con una actividad por minuto (pestaña visible). */
  const jugar = (p: IPausaSesion, desde: number, n: number) => {
    let q = p;
    for (let k = 1; k <= n; k++) q = registrarActividad(q, desde + k * MIN);
    return q;
  };

  it('se sugiere solo a los 30 min de juego activo (no por cantidad de Taps), una sola vez por sesión', () => {
    const p = nuevaPausa(T0);
    expect(shouldSuggestPause(p)).toBeFalse();
    let q = p;
    for (let k = 1; k <= 40; k++) q = registrarActividad(q, T0 + k * 20_000, true);
    expect(q.taps).toBe(40);
    expect(shouldSuggestPause(q)).toBeFalse();
    expect(shouldSuggestPause(jugar(p, T0, 29))).toBeFalse();
    expect(shouldSuggestPause(jugar(p, T0, 30))).toBeTrue();
    expect(shouldSuggestPause({ ...jugar(p, T0, 40), sugerida: true })).toBeFalse();
  });

  it('el tiempo con la pestaña oculta o sin tocar nada no cuenta (cada hueco suma 2 min como mucho)', () => {
    const p = jugar(nuevaPausa(T0), T0, 10);
    expect(p.activoMs).toBe(10 * MIN);
    const quieto = registrarActividad(p, p.ultima + 20 * MIN);          // 20 min sin tocar nada
    expect(quieto.activoMs).toBe(10 * MIN + PAUSA_HUECO_MAX_MS);
    const vuelve = reanudarPausa(p, p.ultima + 25 * MIN);                // estuvo 25 min en otra app
    expect(vuelve.activoMs).toBe(10 * MIN);
    expect(vuelve.ultima).toBe(p.ultima + 25 * MIN);
  });

  it('30 min o más sin actividad, o un día nuevo, reinician la sesión (contador, tiempo y sugerencia)', () => {
    const p = { ...jugar(nuevaPausa(T0), T0, 35), taps: 12, sugerida: true };
    const tarde = registrarActividad(p, p.ultima + PAUSA_INACTIVA_MS);
    expect(tarde.taps).toBe(0);
    expect(tarde.sugerida).toBeFalse();
    expect(tarde.activoMs).toBe(0);
    expect(reanudarPausa(p, p.ultima + PAUSA_INACTIVA_MS).sugerida).toBeFalse();
    const manana = new Date(2026, 9, 20, 0, 5).getTime(), noche = { ...p, ultima: new Date(2026, 9, 19, 23, 59).getTime() };
    expect(registrarActividad(noche, manana).taps).toBe(0);
  });

  it('lo guardado sobrevive a recargar la pestaña y un valor roto vuelve a empezar', () => {
    const p = { ...jugar(nuevaPausa(T0), T0, 5), taps: 7 };
    const leido = parsePausa(JSON.stringify(p), p.ultima + 1000);
    expect(leido.taps).toBe(7);
    expect(leido.activoMs).toBe(5 * MIN);
    expect(parsePausa('{', T0)).toEqual(nuevaPausa(T0));
    expect(parsePausa(JSON.stringify(p), p.ultima + PAUSA_INACTIVA_MS).taps).toBe(0);
  });

  it('el resumen es amable y sin cifras de tiempo', () => {
    expect(pauseSummary(20, 3, 4)).toBe('Hoy: 20 Taps. Llevas 3 insignias y una racha de 4 días.');
    expect(pauseSummary(1, 0, 0)).toBe('Hoy: 1 Tap.');
    expect(pauseSummary(5, 1, 1)).toBe('Hoy: 5 Taps. Llevas 1 insignia y una racha de 1 día.');
    expect(pauseSummary(20, 0, 2)).toBe('Hoy: 20 Taps. Llevas una racha de 2 días.');
  });
});
