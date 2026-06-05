import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TModalSize = 'small' | 'medium' | 'large' | 'full';

@Component({
  selector: 'lib-modal-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-base.component.html',
  styleUrl: './modal-base.component.scss'
})
export class ModalBaseComponent {
  // Inputs
  isOpen = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  size = input<TModalSize>('medium');
  showFooter = input<boolean>(true);
  closeOnOverlayClick = input<boolean>(true);

  // Outputs
  close = output<void>();

  // Computed
  modalSizeClass = computed(() => `modal-container--${this.size()}`);

  onOverlayClick(): void {
    if (this.closeOnOverlayClick()) {
      this.close.emit();
    }
  }

  onCloseClick(): void {
    this.close.emit();
  }

  onContainerClick(event: MouseEvent): void {
    // Prevent overlay click when clicking inside modal
    event.stopPropagation();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }
}
