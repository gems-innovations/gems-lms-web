import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from 'shared/core';

/**
 * Traduce un texto escrito en español: {{ 'Inicio' | t }}. Impuro para seguir el cambio de idioma
 * al instante; la búsqueda es una lectura de diccionario.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(text: string | null | undefined, params?: Record<string, string | number>): string {
    return text ? this.i18n.t(text, params) : '';
  }
}
