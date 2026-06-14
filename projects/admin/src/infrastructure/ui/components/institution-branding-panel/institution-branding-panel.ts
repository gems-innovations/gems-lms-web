import { Component, input } from '@angular/core';
import { IBranding } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-branding-panel',
  template: `
    <section class="ibrand">
      <h3 class="ibrand__title">Marca &amp; Personalización</h3>
      <div class="ibrand__preview">
        <div class="ibrand__color-row">
          <div
            class="ibrand__swatch"
            [style.background]="branding().colorPrimary"
            [title]="branding().colorPrimary"
          ></div>
          <div class="ibrand__color-info">
            <span class="ibrand__color-label">Color principal</span>
            <code class="ibrand__color-hex">{{ branding().colorPrimary }}</code>
          </div>
        </div>
        @if (branding().colorSecondary) {
          <div class="ibrand__color-row">
            <div
              class="ibrand__swatch"
              [style.background]="branding().colorSecondary"
              [title]="branding().colorSecondary!"
            ></div>
            <div class="ibrand__color-info">
              <span class="ibrand__color-label">Color secundario</span>
              <code class="ibrand__color-hex">{{ branding().colorSecondary }}</code>
            </div>
          </div>
        }
        <div class="ibrand__mode-badge" [class.ibrand__mode-badge--dark]="branding().darkMode">
          {{ branding().darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro' }}
        </div>
      </div>
    </section>
  `,
  styleUrl: './institution-branding-panel.scss'
})
export class InstitutionBrandingPanel {
  readonly branding = input.required<IBranding>();
}
