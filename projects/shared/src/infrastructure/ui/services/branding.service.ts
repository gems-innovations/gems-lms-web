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
    root.style.setProperty('--brand-primary', config.colorPrimary);
    root.style.setProperty('--brand-secondary', config.colorSecondary ?? '#1E1B4B');

    // Derived tones (lighten/darken via opacity layers)
    root.style.setProperty('--brand-primary-10', config.colorPrimary + '1a'); // 10% opacity
    root.style.setProperty('--brand-primary-20', config.colorPrimary + '33'); // 20% opacity

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
    root.style.removeProperty('--brand-primary');
    root.style.removeProperty('--brand-secondary');
    root.style.removeProperty('--brand-primary-10');
    root.style.removeProperty('--brand-primary-20');
    root.classList.remove('light-mode');
  }
}
