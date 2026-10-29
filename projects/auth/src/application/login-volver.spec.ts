import { volverDespuesDeEntrar } from './login.usecase';

describe('volverDespuesDeEntrar', () => {
  it('acepta solo rutas de Taps del mismo sitio', () => {
    for (const ok of ['/t/mc-gancho', '/taps', '/taps/explorar', '/taps/explorar?tema=minecraft&q=volc%C3%A1n']) expect(volverDespuesDeEntrar(ok)).toBe(ok);
  });

  it('rechaza otros dominios, esquemas y rutas', () => {
    for (const no of [null, undefined, 3, '', 'https://malo.test', '//malo.test', '/\\malo.test', 'javascript:alert(1)', '/admin', '/t/', '/t/a/b', '/taps/../admin', '/tapsx']) {
      expect(volverDespuesDeEntrar(no)).toBeNull();
    }
  });
});
