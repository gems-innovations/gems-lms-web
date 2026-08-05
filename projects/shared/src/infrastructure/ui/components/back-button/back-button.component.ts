import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'lib-back-button',
  standalone: true,
  template: `
    <button type="button" class="back-btn" (click)="back.emit()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ label() }}
    </button>
  `,
  styleUrl: './back-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  readonly label = input.required<string>();
  readonly back  = output<void>();
}
