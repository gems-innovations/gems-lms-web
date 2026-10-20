import { TAPS } from './taps.data';
import { orderFeed, topicOf } from './taps.logic';
import { planoSeed, questionEscena, visualSide } from './taps.escena';
import { ITap, ITapRun } from './taps.types';

/**
 * Modo cine: el generador (scripts/generar-taps.mjs → asignarCine) reparte plano de cámara, hora, clima, fauna, transición,
 * personaje y encuadre simulando el feed. Aquí se comprueba con las funciones REALES del feed (taps.logic.ts) que alguien que
 * desliza 15 Taps seguidos nunca ve dos iguales, en «Para ti» (nuevo y con el gancho ya jugado) y en cada categoría sola.
 */
describe('Taps · modo cine: variedad al deslizar', () => {
  const ordenes = (): [string, ITap[]][] => [
    ['para ti', orderFeed(TAPS, {})],
    ['para ti (gancho jugado)', orderFeed(TAPS, { hookDone: true })],
    ...['minecraft', 'logica', 'cultura'].map(k => [`tema ${k}`, orderFeed(TAPS, { topic: k }).filter(t => topicOf(t) === k)] as [string, ITap[]]),
  ];

  it('cada Tap trae plano de cámara y transición', () => {
    for (const t of TAPS) {
      expect(t.scene.camara).withContext(t.id).toBeTruthy();
      expect(['corte', 'barrido', 'zoom', 'fundido']).withContext(t.id).toContain(t.scene.transicion!);
    }
  });

  it('dos Taps seguidos nunca repiten plano y nunca se ven iguales', () => {
    for (const [nombre, orden] of ordenes()) {
      for (let i = 1; i < orden.length; i++) {
        const a = orden[i - 1], b = orden[i], donde = `${nombre}: ${a.id} → ${b.id}`;
        expect(b.scene.camara).withContext(donde).not.toBe(a.scene.camara);
        if (a.theme === b.theme) {
          expect(b.scene.host).withContext(donde + ' (personaje)').not.toBe(a.scene.host);
          const igual = a.scene.world === b.scene.world && (a.scene.hora ?? '') === (b.scene.hora ?? '') && (a.scene.clima ?? '') === (b.scene.clima ?? '');
          expect(igual).withContext(donde + ' (mismo lugar, hora y clima)').toBeFalse();
        }
      }
    }
  });

  it('en los 15 primeros de cada orden hay al menos 6 planos, 3 horas del día y las 4 transiciones', () => {
    for (const [nombre, orden] of ordenes()) {
      const quince = orden.slice(0, 15);
      expect(new Set(quince.map(t => t.scene.camara)).size).withContext(nombre).toBeGreaterThanOrEqual(6);
      expect(new Set(quince.map(t => t.scene.hora).filter(Boolean)).size).withContext(nombre).toBeGreaterThanOrEqual(3);
      expect(new Set(quince.map(t => t.scene.transicion)).size).withContext(nombre).toBe(4);
    }
  });

  it('hay escenas de pregunta en los tres temas (al menos 20)', () => {
    const con = TAPS.flatMap(t => t.questions.filter(q => q.escena).map(() => topicOf(t)));
    expect(con.length).toBeGreaterThanOrEqual(20);
    for (const k of ['minecraft', 'logica', 'cultura']) expect(con.filter(x => x === k).length).withContext(k).toBeGreaterThanOrEqual(5);
  });
});

describe('Taps · escena de la pregunta', () => {
  const tap = TAPS.find(t => t.questions.some(q => q.escena))!;
  const k = tap.questions.findIndex(q => q.escena);
  const run = (over: Partial<ITapRun> = {}): ITapRun => ({ tapId: tap.id, index: k, chosen: null, score: 0, answers: [], finished: false, ...over });

  it('se ve mientras se piensa y tras responder, solo con escenario', () => {
    expect(questionEscena(tap, run(), true, false)).toEqual(tap.questions[k].escena!);
    expect(questionEscena(tap, run({ chosen: 0 }), true, false)).toBeTruthy();
    expect(questionEscena(tap, run(), false, false)).withContext('sin motor no hay quién la dibuje').toBeNull();
  });

  it('le cede el sitio al objeto que explica y no se ve en el resultado', () => {
    expect(questionEscena(tap, run({ chosen: 1 }), true, true)).toBeNull();
    expect(questionEscena(tap, run({ finished: true }), true, false)).toBeNull();
  });

  it('la semilla del plano es estable por Tap (servidor y navegador iguales) y distinta entre Taps', () => {
    expect(planoSeed('mc-gancho')).toBe(planoSeed('mc-gancho'));
    expect(new Set(TAPS.map(t => planoSeed(t.id))).size).toBeGreaterThan(TAPS.length * 0.8);
  });

  it('el objeto que explica sigue yendo al lado contrario al personaje', () => {
    expect(visualSide({ shot: 'cerca-izquierda' })).toBe('der');
    expect(visualSide({ shot: 'centro' })).toBe('izq');
  });
});
