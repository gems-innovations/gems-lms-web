import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ToastComponent } from '../toast/toast.component';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'lib-toast-container',
  imports: [ToastComponent],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts$(); track toast.id) {
        <lib-toast
          [message]="toast.message"
          [type]="toast.type"
          [duration]="toast.duration"
          (close)="toastService.remove(toast.id)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .toast-container {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9999;
      pointer-events: none;
      
      & > * {
        pointer-events: auto;
      }
    }
  `]
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
