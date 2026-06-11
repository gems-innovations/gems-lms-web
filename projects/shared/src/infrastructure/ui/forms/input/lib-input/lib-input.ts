import { Component, computed, input, model, output, signal } from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

export type InputType = 'text' | 'email' | 'url' | 'number' | 'tel' | 'password' | 'color';

const ERROR_FALLBACKS: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  email: 'Por favor, introduce un correo válido.',
  pattern: 'El formato no es válido.',
  minLength: 'El valor es demasiado corto.',
  maxLength: 'El valor es demasiado largo.',
  min: 'El valor es demasiado pequeño.',
  max: 'El valor es demasiado grande.'
};

@Component({
  selector: 'lib-input',
  templateUrl: './lib-input.html',
  styleUrl: './lib-input.scss'
})
export class LibInputComponent implements FormValueControl<string> {
  // Estado sincronizado por la directiva [formField] de Signal Forms
  readonly value = model<string>('');
  readonly touched = input<boolean>(false);
  readonly touch = output<void>();
  readonly errors = input<readonly ValidationError[]>([]);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);

  readonly type = input<InputType>('text');
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly helpText = input<string>('');
  readonly icon = input<string | undefined>(undefined);
  readonly maxLength = input<number | undefined>(undefined);
  readonly minLength = input<number | undefined>(undefined);
  // min/max llevan el tipo del valor del control (string) según FormValueControl
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly step = input<number | undefined>(undefined);

  protected readonly focused = signal(false);

  protected readonly showError = computed(() => this.touched() && this.errors().length > 0);

  protected readonly errorMessage = computed(() => {
    const [first] = this.errors();
    if (!first) return '';
    return first.message ?? ERROR_FALLBACKS[first.kind] ?? 'El valor introducido no es válido.';
  });

  protected readonly inputId = computed(
    () => `lib-input-${this.label().toLowerCase().replace(/\s+/g, '-')}`
  );

  protected onInput(value: string): void {
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
