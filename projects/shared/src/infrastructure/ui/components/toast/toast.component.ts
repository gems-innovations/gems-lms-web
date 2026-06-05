import { Component, input, output } from '@angular/core';


export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'lib-toast',
  imports: [],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  message = input.required<string>();
  type = input<ToastType>('success');
  duration = input<number>(3000);
  isVisible = input<boolean>(true);
  
  close = output<void>();

  getIcon(): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[this.type()];
  }

  handleClose(): void {
    this.close.emit();
  }
}
