import { Injectable, inject, signal } from '@angular/core';
import { BrandingService } from 'shared/core';

export type ThemePreference = 'institution' | 'dark' | 'light';
export interface DisplayPreferences { theme: ThemePreference; compact: boolean; reducedMotion: boolean; }

const KEY = 'gems-display-preferences';
const DEFAULTS: DisplayPreferences = { theme: 'institution', compact: false, reducedMotion: false };

@Injectable({ providedIn: 'root' })
export class DisplayPreferencesService {
  private readonly branding = inject(BrandingService);
  readonly preferences = signal<DisplayPreferences>(this.read());

  constructor() { this.apply(); }

  update(change: Partial<DisplayPreferences>): void {
    this.preferences.update(current => ({ ...current, ...change }));
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(this.preferences()));
    this.apply();
  }

  private read(): DisplayPreferences {
    if (typeof localStorage === 'undefined') return DEFAULTS;
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
    catch { return DEFAULTS; }
  }

  private apply(): void {
    if (typeof document === 'undefined') return;
    const { theme, compact, reducedMotion } = this.preferences();
    const root = document.documentElement;
    this.branding.setThemePreference(theme);
    root.classList.toggle('compact-mode', compact);
    root.classList.toggle('reduce-motion', reducedMotion);
  }
}
