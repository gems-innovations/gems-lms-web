import { TestBed } from '@angular/core/testing';
import { BrandingService } from 'shared/core';

describe('BrandingService', () => {
  let service: BrandingService;
  const root = document.documentElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrandingService);
  });

  afterEach(() => {
    service.setThemePreference('institution');
    service.reset();
  });

  it('keeps an explicit light preference while branding changes or resets', () => {
    service.setThemePreference('light');
    service.apply({ colorPrimary: '#111827', darkMode: true });
    expect(root.classList.contains('light-mode')).toBeTrue();
    service.reset();
    expect(root.classList.contains('light-mode')).toBeTrue();
  });

  it('keeps an explicit dark preference over light institution branding', () => {
    service.setThemePreference('dark');
    service.apply({ colorPrimary: '#7B6FF0', darkMode: false });
    expect(root.classList.contains('light-mode')).toBeFalse();
    service.reset();
    expect(root.classList.contains('light-mode')).toBeFalse();
  });

  it('follows the institution only when that mode is selected', () => {
    service.setThemePreference('institution');
    service.apply({ colorPrimary: '#7B6FF0', darkMode: false });
    expect(root.classList.contains('light-mode')).toBeTrue();
    service.apply({ colorPrimary: '#7B6FF0', darkMode: true });
    expect(root.classList.contains('light-mode')).toBeFalse();
  });

  it('keeps white text legible by darkening a light institutional color on actions', () => {
    service.apply({ colorPrimary: '#7B6FF0' });
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#FFFFFF');
    expect(root.style.getPropertyValue('--color-primario-accion')).not.toBe('#7B6FF0');
  });

  it('uses white text over a dark institutional color', () => {
    service.apply({ colorPrimary: '#111827' });
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#FFFFFF');
  });

  it('adjusts a mid-tone brand only for interactive surfaces', () => {
    service.apply({ colorPrimary: '#6C63FF' });
    expect(root.style.getPropertyValue('--color-primario')).toBe('#6C63FF');
    expect(root.style.getPropertyValue('--color-primario-accion')).not.toBe('#6C63FF');
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#FFFFFF');
  });
});
