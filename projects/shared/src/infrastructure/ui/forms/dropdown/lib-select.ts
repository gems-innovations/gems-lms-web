import { Component, computed, input, model, output, signal } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const ERROR_FALLBACKS: Record<string, string> = {
  required: 'Este campo es obligatorio.'
};

@Component({
  selector: 'lib-select',
  templateUrl: './lib-select.html',
  styleUrl: './lib-select.scss'
})
export class LibSelectComponent implements FormValueControl<string> {
  // Estado sincronizado por la directiva [formField] de Signal Forms
  readonly value = model<string>('');
  readonly touched = input<boolean>(false);
  readonly touch = output<void>();
  readonly errors = input<readonly ValidationError[]>([]);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);

  readonly label = input<string>('');
  readonly placeholder = input<string>('Selecciona una opción');
  readonly helpText = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly icon = input<string | undefined>(undefined);

  protected readonly focused = signal(false);

  protected readonly showError = computed(() => this.touched() && this.errors().length > 0);

  protected readonly errorMessage = computed(() => {
    const [first] = this.errors();
    if (!first) return '';
    return first.message ?? ERROR_FALLBACKS[first.kind] ?? 'El valor seleccionado no es válido.';
  });

  protected readonly selectId = computed(
    () => `lib-select-${this.label().toLowerCase().replace(/\s+/g, '-')}`
  );

  protected onChange(value: string): void {
    this.value.set(value);
  }

  protected onFocus(): void {
    this.focused.set(true);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.touch.emit();
  }
}
