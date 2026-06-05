import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
export type BadgeSize    = 'sm' | 'md';

@Component({
  selector: 'lib-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="badge"
      [class]="'badge--' + variant() + ' badge--' + size()"
    >
      @if (dot()) { <span class="badge__dot"></span> }
      <ng-content />
    </span>
  `,
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
  readonly size    = input<BadgeSize>('md');
  readonly dot     = input<boolean>(false);
}
