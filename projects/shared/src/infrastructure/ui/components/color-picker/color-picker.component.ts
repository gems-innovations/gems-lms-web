import { Component, input, linkedSignal, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'lib-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss'
})
export class ColorPickerComponent implements FormValueControl<string> {
  readonly label = input<string>('Color');
  readonly hint = input<string | undefined>(undefined);

  // Estado sincronizado por la directiva [formField] de Signal Forms
  readonly value = model<string>('#6C63FF');
  readonly disabled = input<boolean>(false);
  readonly touch = output<void>();

  // El campo hex refleja el valor del form pero admite escritura parcial
  protected readonly hexInput = linkedSignal(() => this.value());

  protected onColorChange(val: string): void {
    this.value.set(val);
    this.touch.emit();
  }

  protected onHexInput(val: string): void {
    this.hexInput.set(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      this.value.set(val);
    }
    this.touch.emit();
  }
}
