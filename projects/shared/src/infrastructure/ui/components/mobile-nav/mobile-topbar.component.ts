import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Barra superior fija (solo celular) con el botón que abre el menú lateral como drawer. */
@Component({
  selector: 'lib-mobile-topbar',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <header class="mtopbar">
      <button
        type="button"
        class="mtopbar__menu"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="controls()"
        [attr.aria-label]="'Abrir menú' | t"
        (click)="menuToggle.emit()"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>
      <img class="mtopbar__logo" src="/logo-144.png" width="28" height="28" alt="" aria-hidden="true" />
      <span class="mtopbar__title">{{ title() }}</span>
    </header>
  `,
  styleUrl: './mobile-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTopbarComponent {
  readonly title = input<string>('GEMS LMS');
  readonly expanded = input<boolean>(false);
  /** id del drawer controlado (aria-controls). */
  readonly controls = input<string>('');
  readonly menuToggle = output<void>();
}
