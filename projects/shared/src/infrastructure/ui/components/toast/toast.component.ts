import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon, LucideCircleCheck, LucideCircleX, LucideTriangleAlert, LucideInfo, LucideX } from '@lucide/angular';


export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'lib-toast',
  imports: [LucideDynamicIcon, LucideX],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  message = input.required<string>();
  type = input<ToastType>('success');
  duration = input<number>(3000);
  isVisible = input<boolean>(true);
  
  close = output<void>();

  getIcon() {
    const icons = {
      success: LucideCircleCheck,
      error: LucideCircleX,
      warning: LucideTriangleAlert,
      info: LucideInfo
    };
    return icons[this.type()];
  }

  handleClose(): void {
    this.close.emit();
  }
}
