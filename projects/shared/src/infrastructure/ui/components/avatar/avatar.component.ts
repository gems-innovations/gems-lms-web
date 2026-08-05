import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-avatar',
  standalone: true,
  template: `
    <span class="avatar" [class]="'avatar--' + size()" [title]="name()">
      @if (imageUrl()) {
        <img class="avatar__img" [src]="imageUrl()" [alt]="name()" />
      } @else {
        <span class="avatar__initials">{{ initials() }}</span>
      }
    </span>
  `,
  styleUrl: './avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly name     = input.required<string>();
  readonly imageUrl = input<string | null | undefined>(undefined);
  readonly size     = input<AvatarSize>('md');

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const last  = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + last).toUpperCase();
  });
}
