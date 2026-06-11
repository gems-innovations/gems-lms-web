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
    root.style.removeProperty('--color-secundario');
    root.style.removeProperty('--color-primario-trans-10');
    root.style.removeProperty('--color-primario-trans-20');
    root.classList.remove('light-mode');
  }
}
