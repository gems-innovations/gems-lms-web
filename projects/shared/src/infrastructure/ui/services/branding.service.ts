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
    const actionColor = this.accessibleAction(config.colorPrimary);
    root.style.setProperty('--color-primario', config.colorPrimary);
    root.style.setProperty('--color-primario-accion', actionColor.background);
    root.style.setProperty('--color-sobre-primario', actionColor.foreground);
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
    root.style.removeProperty('--color-primario-accion');
    root.style.removeProperty('--color-sobre-primario');
    root.style.removeProperty('--color-secundario');
    root.style.removeProperty('--color-primario-trans-10');
    root.style.removeProperty('--color-primario-trans-20');
    root.classList.remove('light-mode');
  }

  private accessibleAction(color: string): { background: string; foreground: '#0F1021' | '#FFFFFF' } {
    const hex = color.trim().replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map(value => value + value).join('') : hex;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return { background: '#4F46E5', foreground: '#FFFFFF' };

    const rgb = [0, 2, 4].map(index => Number.parseInt(normalized.slice(index, index + 2), 16));
    const dark: [number, number, number] = [15, 16, 33];
    const white: [number, number, number] = [255, 255, 255];
    const candidates = ([
      { foreground: '#0F1021' as const, rgb: dark, target: white },
      { foreground: '#FFFFFF' as const, rgb: white, target: dark },
    ]).map(candidate => {
      for (let step = 0; step <= 20; step++) {
        const ratio = step / 20;
        const background = rgb.map((channel, index) => Math.round(channel + (candidate.target[index] - channel) * ratio));
        if (this.contrast(background, candidate.rgb) >= 4.5) return { ...candidate, background, step };
      }
      return { ...candidate, background: rgb, step: 21 };
    }).sort((a, b) => a.step - b.step)[0];

    return {
      background: `#${candidates.background.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`,
      foreground: candidates.foreground,
    };
  }

  private contrast(first: number[], second: number[]): number {
    const luminance = (rgb: number[]): number => {
      const channels = rgb.map(value => value / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
}
