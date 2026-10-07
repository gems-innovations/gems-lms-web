import { Component, input } from '@angular/core';
import { IBranding } from '../../../../domain/model/institution.model';
import { LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'adm-institution-branding-panel',
  imports: [LucideMoon, LucideSun],
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
          @if (branding().darkMode) { <svg lucideMoon [size]="16" aria-hidden="true"></svg> Modo oscuro }
          @else { <svg lucideSun [size]="16" aria-hidden="true"></svg> Modo claro }
        </div>
      </div>
    </section>
  `,
  styleUrl: './institution-branding-panel.scss'
})
export class InstitutionBrandingPanel {
  readonly branding = input.required<IBranding>();
}
