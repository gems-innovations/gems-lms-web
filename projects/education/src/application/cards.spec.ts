import { cardProblem, cleanCard, emptyCard, estimateMinutes } from './cards';
import { ICardQuestion } from '../domain/model/course.model';

describe('cartas del profesor', () => {
  it('una carta en blanco de cada tipo avisa qué falta', () => {
    for (const k of ['idea', 'question', 'steps', 'image'] as const) expect(cardProblem(emptyCard(k))).toBeTruthy();
  });

  it('una pregunta completa no tiene problemas', () => {
    const q: ICardQuestion = { kind: 'question', label: 'x', question: '¿2+2?', options: ['3', '4'], answer: 1, why: 'Porque sí.' };
    expect(cardProblem(q)).toBeNull();
  });

  it('la respuesta correcta debe tener texto', () => {
    const q: ICardQuestion = { kind: 'question', label: 'x', question: '¿?', options: ['a', 'b', ''], answer: 2, why: 'w' };
    expect(cardProblem(q)).toContain('correcta');
  });

  it('al limpiar se quitan las opciones vacías y la respuesta sigue apuntando a la misma', () => {
    const q: ICardQuestion = { kind: 'question', label: 'x', question: ' ¿? ', options: ['a', '', 'c'], answer: 2, why: ' w ' };
    const c = cleanCard(q) as ICardQuestion;
    expect(c.options).toEqual(['a', 'c']);
    expect(c.answer).toBe(1);
    expect(c.why).toBe('w');
  });

  it('las imágenes exigen https y descripción', () => {
    expect(cardProblem({ kind: 'image', label: 'x', title: 't', url: 'http://a/b.png', alt: 'd' })).toBeTruthy();
    expect(cardProblem({ kind: 'image', label: 'x', title: 't', url: 'https://a/b.png', alt: 'd' })).toBeNull();
  });

  it('estima al menos un minuto', () => {
    expect(estimateMinutes([emptyCard('idea')])).toBe(1);
    expect(estimateMinutes(Array(9).fill(emptyCard('idea')))).toBe(6);
  });
});
