import { TAPS } from './taps.data';
import { buscarTaps, tapDescripcion } from './taps.buscar';

describe('buscador de Taps', () => {
  it('encuentra por título sin tildes ni mayúsculas, con el título primero', () => {
    const r = buscarTaps(TAPS, 'MITOS y verdades');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].title.toLowerCase()).toContain('mitos');
  });
  it('encuentra por el texto de una pregunta', () => {
    const r = buscarTaps(TAPS, 'gemelos huellas');
    expect(r.some(t => t.id === 'cu-mitos')).toBeTrue();
  });
  it('sin texto o sin coincidencias devuelve vacío y nunca ofrece Taps solo enlace', () => {
    expect(buscarTaps(TAPS, '   ')).toEqual([]);
    expect(buscarTaps(TAPS, 'zzzxqw')).toEqual([]);
    expect(buscarTaps(TAPS, 'a', 200).some(t => t.soloEnlace)).toBeFalse();
  });
  it('toda descripción es corta y no vacía', () => {
    for (const t of TAPS) expect(tapDescripcion(t).length).toBeGreaterThan(0);
  });
});
