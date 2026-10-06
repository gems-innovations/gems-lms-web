import { TestBed } from '@angular/core/testing';
import { I18nService } from 'shared/core';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  beforeEach(() => localStorage.removeItem('gems-language'));
  afterEach(() => TestBed.inject(I18nService).set('es'));

  it('shows Spanish by default and switches language at once, falling back to Spanish', () => {
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    const i18n = TestBed.inject(I18nService);
    expect(pipe.transform('Inicio')).toBe('Inicio');
    i18n.set('en');
    expect(pipe.transform('Inicio')).toBe('Home');
    expect(document.documentElement.lang).toBe('en');
    expect(pipe.transform('Texto aún sin traducir')).toBe('Texto aún sin traducir');
    i18n.set('pt');
    expect(pipe.transform('Cerrar sesión')).toBe('Sair');
    expect(localStorage.getItem('gems-language')).toBe('pt');
  });
});
