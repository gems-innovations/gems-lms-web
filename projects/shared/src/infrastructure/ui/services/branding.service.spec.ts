import { TestBed } from '@angular/core/testing';
import { BrandingService } from './branding.service';

describe('BrandingService', () => {
  let service: BrandingService;
  const root = document.documentElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrandingService);
  });

  afterEach(() => service.reset());

  it('uses dark text over a light institutional color', () => {
    service.apply({ colorPrimary: '#7B6FF0' });
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#0F1021');
  });

  it('uses white text over a dark institutional color', () => {
    service.apply({ colorPrimary: '#111827' });
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#FFFFFF');
  });

  it('adjusts a mid-tone brand only for interactive surfaces', () => {
    service.apply({ colorPrimary: '#6C63FF' });
    expect(root.style.getPropertyValue('--color-primario')).toBe('#6C63FF');
    expect(root.style.getPropertyValue('--color-primario-accion')).not.toBe('#6C63FF');
    expect(root.style.getPropertyValue('--color-sobre-primario')).toBe('#0F1021');
  });
});
