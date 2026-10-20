import { TAPS } from './taps.data';
import { visualSide } from './taps.escena';

describe('escenas de los Taps', () => {
  it('el objeto que explica va del lado contrario al personaje', () => {
    expect(visualSide({ shot: 'izquierda' })).toBe('der');
    expect(visualSide({ shot: 'cerca-izquierda' })).toBe('der');
    expect(visualSide({ shot: 'derecha' })).toBe('izq');
    expect(visualSide({ shot: 'centro' })).toBe('izq');
    expect(visualSide({})).toBe('izq');
  });

  it('al deslizar, el personaje no queda siempre en el mismo sitio: varios encuadres, entradas y decorados', () => {
    for (const theme of ['minecraft', 'estudio']) {
      const del = TAPS.filter(t => t.theme === theme);
      expect(new Set(del.map(t => t.scene.shot)).size).withContext(theme).toBeGreaterThanOrEqual(5);
      expect(new Set(del.map(t => t.scene.enter)).size).withContext(theme).toBeGreaterThanOrEqual(3);
      expect(del.filter(t => t.scene.props).length).withContext(theme).toBeGreaterThanOrEqual(theme === 'minecraft' ? 8 : 6);
    }
    // aventura (personajes y fondos del registro): sin decorados, pero rota personaje, fondo, encuadre y entrada
    const av = TAPS.filter(t => t.theme === 'aventura');
    expect(new Set(av.map(t => t.scene.shot)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(av.map(t => t.scene.host)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(av.map(t => t.scene.world)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(TAPS.map(t => t.scene.world)).size).toBeGreaterThanOrEqual(16);
  });

  it('cada Tap trae el color de su suelo para el fondo inmediato', () => {
    for (const t of TAPS) expect(t.ground).withContext(t.id).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('las preguntas con objeto para explicar lo traen completo (objeto y acción)', () => {
    const con = TAPS.flatMap(t => t.questions.filter(q => q.visual));
    expect(con.length).toBeGreaterThanOrEqual(25);
    for (const q of con) {
      expect(q.visual!.objeto).withContext(q.id).toBeTruthy();
      expect(q.visual!.accion).withContext(q.id).toBeTruthy();
    }
  });
});
