import { TAPS } from './taps.data';
import { catalogoCurso, prepararTap } from './taps-en-curso';

const preguntas = Array.from({ length: 5 }, (_, i) => ({ question: `¿Pregunta ${i}?`, options: ['a', 'b', 'c', 'd'], answer: i % 4, why: 'Porque sí.' }));

describe('Taps en un curso', () => {
  const base = TAPS.find(t => t.tipo !== 'historia')!;
  afterEach(() => { for (let i = TAPS.length - 1; i >= 0; i--) if (TAPS[i].id.startsWith('curso-')) TAPS.splice(i, 1); });

  it('el catálogo trae los Taps de quiz del banco con su tema, sin historias', () => {
    const lista = catalogoCurso();
    expect(lista.some(t => t.id === base.id)).toBeTrue();
    expect(lista.every(t => TAPS.find(x => x.id === t.id)?.tipo !== 'historia')).toBeTrue();
    expect(lista.every(t => !!t.topic)).toBeTrue();
  });

  it('sin preguntas propias se juega el Tap del banco tal cual', () => {
    expect(prepararTap(base.id, 'Lo que sea', undefined, '12')).toBe(base.id);
    expect(prepararTap('no-existe', 'X', preguntas, '12')).toBeNull();
  });

  it('con preguntas propias arma un Tap «solo enlace» con el escenario del base y lo reemplaza al editarlo', () => {
    const id = prepararTap(base.id, 'Mi Tap', preguntas, '12')!;
    expect(id).toBe('curso-12');
    expect(id).toMatch(/^[a-z0-9-]{1,60}$/);                         // formato que la API acepta (ranking y comentarios)
    const tap = TAPS.find(t => t.id === id)!;
    expect(tap.soloEnlace).toBeTrue();
    expect(tap.scene).toEqual(base.scene);
    expect(tap.title).toBe('Mi Tap');
    expect(tap.questions.map(q => q.answer)).toEqual([0, 1, 2, 3, 0]);
    prepararTap(base.id, 'Mi Tap 2', preguntas, '12');
    expect(TAPS.filter(t => t.id === 'curso-12').length).toBe(1);
    expect(TAPS.find(t => t.id === 'curso-12')!.title).toBe('Mi Tap 2');
  });
});
