import { Component, Input, Output, forwardRef, ChangeDetectionStrategy } from '@angular/core';

import { 
  ControlValueAccessor, 
  NG_VALUE_ACCESSOR, 
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';

export type InputType = 'text' | 'email' | 'url' | 'number' | 'tel' | 'password' | 'color';

@Component({
  selector: 'lib-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LibInputComponent),
      multi: true
    }
  ],
  templateUrl: './lib-input.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './lib-input.scss'
})
export class LibInputComponent implements ControlValueAccessor {
  @Input() type: InputType = 'text';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() errorMessage = '';
  @Input() helpText = '';
  @Input() icon?: string;
  @Input() maxLength?: number;
  @Input() minLength?: number;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;

  public control = new FormControl('');
  public focused = false;
  public touched = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.control.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
    this.control.valueChanges.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }

  onFocus(): void {
    this.focused = true;
  }

  onBlur(): void {
    this.focused = false;
    this.touched = true;
    this.onTouched();
  }

  get showError(): boolean {
    return this.touched && !!this.errorMessage;
  }

  get inputId(): string {
    return `lib-input-${this.label.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
