import { NgClass } from '@angular/common';
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'lib-modal',
  imports: [NgClass],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  public open = input.required<boolean>();
  public clickClose = output<boolean>();

  public closeModal() {
    this.clickClose.emit(false);
  }
}
