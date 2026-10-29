import { Component, input, output, computed, effect, inject, Injector, afterNextRender, ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

export type TModalSize = 'small' | 'medium' | 'large' | 'full';

@Component({
  selector: 'lib-modal-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-base.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private opener: HTMLElement | null = null;

  constructor() {
    // Al abrir, el foco entra al diálogo (así Escape y Tab funcionan); al cerrar, vuelve a quien lo abrió.
    effect(() => {
      if (this.isOpen()) {
        this.opener = this.doc.activeElement as HTMLElement | null;
        afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.modal-overlay')?.focus(), { injector: this.injector });
      } else if (this.opener) {
        if (this.opener.isConnected) this.opener.focus();
        this.opener = null;
      }
    });
  }

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
