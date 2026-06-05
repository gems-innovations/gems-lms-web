import { Component, Input, forwardRef } from '@angular/core';

import { 
  ControlValueAccessor, 
  NG_VALUE_ACCESSOR, 
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'lib-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LibSelectComponent),
      multi: true
    }
  ],
  templateUrl: './lib-select.html',
  styleUrl: './lib-select.scss'
})
export class LibSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() required = false;
  @Input() disabled = false;
  @Input() errorMessage = '';
  @Input() helpText = '';
  @Input() options: SelectOption[] = [];
  @Input() icon?: string;

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

  get selectId(): string {
    return `lib-select-${this.label.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
