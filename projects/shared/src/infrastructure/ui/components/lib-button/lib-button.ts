import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-button',
  templateUrl: './lib-button.html',
  styleUrl: './lib-button.scss'
})
export class LibButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly icon = input<string | undefined>(undefined);
  readonly iconPosition = input<'left' | 'right'>('left');

  readonly clicked = output<Event>();

  protected readonly buttonClasses = computed(() => {
    const classes = ['lib-button', `lib-button--${this.variant()}`, `lib-button--${this.size()}`];

    if (this.fullWidth()) classes.push('lib-button--full-width');
    if (this.disabled()) classes.push('lib-button--disabled');
    if (this.loading()) classes.push('lib-button--loading');

    return classes.join(' ');
  });

  protected onClick(event: Event): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
