import { Injectable, inject, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface IBrandingConfig {
  colorPrimary: string;
  colorSecondary?: string;
  logoUrl?: string;
  darkMode?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly document = inject(DOCUMENT);

  private readonly _config = signal<IBrandingConfig | null>(null);
  readonly config = computed(() => this._config());
  // Dark is the global default — isDark is true unless institution explicitly opts into light.
  readonly isDark = computed(() => this._config()?.darkMode !== false);

  apply(config: IBrandingConfig): void {
    this._config.set(config);
    const root = this.document.documentElement;
    // Sobrescribe los tokens del design system: todo componente que consuma
    // var(--color-primario) queda rebrandeado sin lógica adicional.
    root.style.setProperty('--color-primario', config.colorPrimary);
    root.style.setProperty('--color-sobre-primario', this.readableText(config.colorPrimary));
    root.style.setProperty('--color-secundario', config.colorSecondary ?? '#1E1B4B');

    // Derived tones (lighten/darken via opacity layers)
    root.style.setProperty('--color-primario-trans-10', config.colorPrimary + '1a'); // 10% opacity
    root.style.setProperty('--color-primario-trans-20', config.colorPrimary + '33'); // 20% opacity

    // Dark is the global default. Only add 'light-mode' when the institution
    // explicitly prefers a light theme (darkMode === false).
    if (config.darkMode === false) {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
  }

  reset(): void {
    this._config.set(null);
    const root = this.document.documentElement;
    root.style.removeProperty('--color-primario');
    root.style.removeProperty('--color-sobre-primario');
    root.style.removeProperty('--color-secundario');
    root.style.removeProperty('--color-primario-trans-10');
    root.style.removeProperty('--color-primario-trans-20');
    root.classList.remove('light-mode');
  }

  private readableText(color: string): '#0F1021' | '#FFFFFF' {
    const hex = color.trim().replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map(value => value + value).join('') : hex;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#FFFFFF';
    const channels = [0, 2, 4].map(index => Number.parseInt(normalized.slice(index, index + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    const darkContrast = (luminance + 0.05) / 0.055;
    const lightContrast = 1.05 / (luminance + 0.05);
    return darkContrast >= lightContrast ? '#0F1021' : '#FFFFFF';
  }
}
