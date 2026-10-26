import { cardProblem } from './cards';
import { CARDS_TEMPLATES } from './cards-templates';

describe('plantillas de cartas', () => {
  it('hay plantillas con ids distintos', () => {
    expect(CARDS_TEMPLATES.length).toBeGreaterThan(5);
    expect(new Set(CARDS_TEMPLATES.map(t => t.id)).size).toBe(CARDS_TEMPLATES.length);
  });

  it('todas las cartas de todas las plantillas están completas', () => {
    for (const t of CARDS_TEMPLATES) {
      t.cards.forEach((c, i) => expect(cardProblem(c)).withContext(`${t.id} carta ${i + 1}`).toBeNull());
    }
  });
});
