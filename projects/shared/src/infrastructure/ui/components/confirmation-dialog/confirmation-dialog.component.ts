import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LibButtonComponent } from '../lib-button/lib-button';

export type ConfirmationType = 'warning' | 'danger' | 'info' | 'success';

@Component({
  selector: 'lib-confirmation-dialog',
  standalone: true,
  imports: [LibButtonComponent],
  templateUrl: './confirmation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  readonly type = input<ConfirmationType>('warning');
  readonly title = input('');
  readonly message = input('');
  readonly confirmText = input('Confirmar');
  readonly cancelText = input('Cancelar');
  readonly isLoading = input(false);
  readonly showIcon = input(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly iconClass = computed(() => `confirmation-dialog__icon--${this.type()}`);
  protected readonly confirmButtonVariant = computed<'primary' | 'danger'>(() => this.type() === 'danger' ? 'danger' : 'primary');

  protected onConfirm(): void {
    if (!this.isLoading()) this.confirmed.emit();
  }

  protected onCancel(): void {
    if (!this.isLoading()) this.cancelled.emit();
  }
}
