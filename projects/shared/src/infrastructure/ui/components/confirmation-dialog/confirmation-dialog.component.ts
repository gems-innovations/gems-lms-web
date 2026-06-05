import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibButtonComponent } from '../lib-button/lib-button';

export type ConfirmationType = 'warning' | 'danger' | 'info' | 'success';

@Component({
  selector: 'lib-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, LibButtonComponent],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  @Input() type: ConfirmationType = 'warning';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() isLoading = false;
  @Input() showIcon = true;
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    if (!this.isLoading) {
      this.confirmed.emit();
    }
  }

  onCancel(): void {
    if (!this.isLoading) {
      this.cancelled.emit();
    }
  }

  get iconClass(): string {
    return `confirmation-dialog__icon--${this.type}`;
  }

  get confirmButtonVariant(): 'primary' | 'danger' {
    return this.type === 'danger' ? 'danger' : 'primary';
  }
}
