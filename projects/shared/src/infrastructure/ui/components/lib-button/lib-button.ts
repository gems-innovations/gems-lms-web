import { Component, Input, Output, EventEmitter } from '@angular/core';


export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [],
  templateUrl: './lib-button.html',
  styleUrl: './lib-button.scss'
})
export class LibButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  
  @Output() clicked = new EventEmitter<Event>();

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }

  get buttonClasses(): string {
    const classes = ['lib-button'];
    
    classes.push(`lib-button--${this.variant}`);
    classes.push(`lib-button--${this.size}`);
    
    if (this.fullWidth) classes.push('lib-button--full-width');
    if (this.disabled) classes.push('lib-button--disabled');
    if (this.loading) classes.push('lib-button--loading');
    
    return classes.join(' ');
  }
}
