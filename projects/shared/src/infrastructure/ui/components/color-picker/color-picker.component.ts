import {
  Component, input, forwardRef, signal, ChangeDetectionStrategy
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true
    }
  ]
})
export class ColorPickerComponent implements ControlValueAccessor {
  readonly label = input<string>('Color');
  readonly hint  = input<string | undefined>(undefined);

  protected readonly value    = signal('#6C63FF');
  protected readonly hexInput = signal('#6C63FF');
  protected readonly disabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void         = () => {};

  // ControlValueAccessor
  writeValue(v: string): void {
    if (v) { this.value.set(v); this.hexInput.set(v); }
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void         { this.onTouched = fn; }
  setDisabledState(d: boolean): void              { this.disabled.set(d); }

  onColorChange(val: string): void {
    this.value.set(val);
    this.hexInput.set(val);
    this.onChange(val);
    this.onTouched();
  }

  onHexInput(val: string): void {
    this.hexInput.set(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      this.value.set(val);
      this.onChange(val);
    }
    this.onTouched();
  }
}
