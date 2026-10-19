import { drawShareCard, shareGrid, shareText, shareUrl, SHARE_BRAND_URL } from './taps.share';
import { ITap, ITapRun } from './taps.types';

const tap: ITap = {
  id: 'redstone', theme: 'minecraft', title: 'Redstone', kicker: 'Quiz', scene: { world: 'cueva', host: 'sofi' }, backdrop: ['#000', '#333'],
  questions: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, q: '¿Pregunta?', options: ['1', '2'], answer: 0, why: 'Por eso.' })),
  results: [{ min: 0, title: 'Aprendiz de antorchas', line: '' }, { min: 4, title: 'Maquinista de pistones', line: '' }],
};
const run: ITapRun = { tapId: 'redstone', index: 4, chosen: 0, score: 4, answers: [true, false, true, true, true], finished: true };

describe('compartir un Tap', () => {
  it('el enlace abre el mismo Tap en /t/<id>', () => {
    expect(shareUrl('https://lms.gemsinnovations.com', 'redstone')).toBe('https://lms.gemsinnovations.com/t/redstone');
    expect(shareUrl('http://localhost:4200/', 'a b')).toBe('http://localhost:4200/t/a%20b');
  });

  it('la cuadrícula no revela respuestas: solo verde o rojo por pregunta', () => {
    expect(shareGrid([true, false, true], 5)).toBe('\u{1F7E9}\u{1F7E5}\u{1F7E9}⬜⬜');
  });

  it('el texto lleva marca, cuadrícula, puntaje, título y el reto, sin preguntas ni respuestas', () => {
    const text = shareText(tap, run, 'https://lms.gemsinnovations.com/t/redstone');
    expect(text).toContain('GEMS LMS');
    expect(text).toContain('4/5 · Maquinista de pistones');
    expect(text).toContain('¿Me ganas?');
    expect(text.endsWith('https://lms.gemsinnovations.com/t/redstone')).toBeTrue();
    expect(text).not.toContain('Por eso');
    expect(text).not.toContain('¿Pregunta?');
  });

  it('sin url no la repite (el menú de compartir la recibe aparte)', () => {
    expect(shareText(tap, run)).not.toContain('http');
  });

  it('la tarjeta es 9:16 (1080×1920) con la dirección de la marca', () => {
    const canvas = drawShareCard({ tapTitle: 'Redstone', title: 'Maquinista de pistones', score: 4, total: 5, answers: run.answers, backdrop: ['#000', '#333'] });
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(SHARE_BRAND_URL).toBe('lms.gemsinnovations.com/taps');
  });
});
