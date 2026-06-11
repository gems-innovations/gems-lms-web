import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__text">
        @if (eyebrow()) {
          <span class="page-header__eyebrow">{{ eyebrow() }}</span>
        }
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
}
