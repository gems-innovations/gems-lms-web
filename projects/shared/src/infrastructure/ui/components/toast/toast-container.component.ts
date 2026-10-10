import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ToastComponent } from '../toast/toast.component';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'lib-toast-container',
  imports: [ToastComponent],
  template: `
    <div class="toast-container" aria-live="polite">
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .toast-container {
      position: fixed;
      top: max(var(--spacing-xl), env(safe-area-inset-top));
      right: var(--spacing-xl);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      width: min(500px, calc(100vw - 2 * var(--spacing-xl)));
      pointer-events: none;

      @media (max-width: 767px) {
        right: var(--spacing-lg);
        left: var(--spacing-lg);
        width: auto;
      }
      
      & > * {
        pointer-events: auto;
      }
    }
  `]
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
