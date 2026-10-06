import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { LANGUAGES, TLanguage, TRANSLATIONS } from './translations';

const KEY = 'gems-language';

/** Idioma de la interfaz: español por defecto, inglés o portugués. Se recuerda por dispositivo. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly _lang = signal<TLanguage>(this.initial());

  readonly lang = this._lang.asReadonly();
  readonly languages = LANGUAGES;
  /** Locale para fechas y números (es-CO, en-US, pt-BR). */
  readonly locale = computed(() => LANGUAGES.find(l => l.code === this._lang())?.locale ?? 'es-CO');

  constructor() {
    this.document.documentElement.lang = this._lang();
  }

  set(lang: TLanguage): void {
    if (!LANGUAGES.some(l => l.code === lang)) return;
    this._lang.set(lang);
    this.document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento: dura la sesión */ }
  }

  /** Texto en el idioma actual; {nombre} se reemplaza con params. */
  t(text: string, params?: Record<string, string | number>): string {
    const lang = this._lang();
    let out = lang === 'es' ? text : TRANSLATIONS[lang][text] ?? text;
    if (params) for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  }

  private initial(): TLanguage {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
      if (saved === 'es' || saved === 'en' || saved === 'pt') return saved;
    } catch { /* sin almacenamiento */ }
    return 'es';
  }
}
