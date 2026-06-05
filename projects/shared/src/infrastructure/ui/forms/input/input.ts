import { Component, input, ElementRef, Renderer2, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl, AbstractControl } from '@angular/forms';
import { subformComponentProviders, createForm, FormType } from 'ngx-sub-form';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: subformComponentProviders(InputComponent),
  templateUrl: './input.html',
  styleUrl: './input.scss'
})
export class InputComponent {
  public type = input<'input' | 'email' | 'password'>('input');
  public icon = input<string>();
  public label = input<string>();
  public placeholder = input<string>('');
  public patternKey = input<string>('');
  public style = input<'default' | 'dark'>('default');
  public control = input<AbstractControl | null>(null);

  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  public readonly uniqueId = crypto.randomUUID();

  private readonly errorMessages: Record<string, (error: any) => string> = {
    required: () => 'Este campo es obligatorio.',
    email: () => 'Por favor, introduce un correo válido.',
    pattern: () => 'El formato no es válido.',
    minlength: (error) => `Mínimo ${error.requiredLength} caracteres.`,
    maxlength: (error) => `Máximo ${error.requiredLength} caracteres.`,
    min: (error) => `El valor debe ser mayor o igual a ${error.min}.`,
  };

  public form = createForm<string, { value: string }>(this, {
    formType: FormType.SUB,
    formControls: {
      value: new UntypedFormControl(null),
    },
    toFormGroup: (value: string): { value: string } => {
      return { value };
    },
    fromFormGroup: (formValue: { value: string }): string => {
      return formValue.value;
    },
  });

  handleKeypress(key: string): boolean {
    const pattern = new RegExp(this.patternKey());
    return pattern.test(key);
  }

  handleFocus(target: EventTarget | null): void {
    this.toggleLabelFocus(true);
  }

  handleBlur(): void {
    this.toggleLabelFocus(false);
    const ctrl = this.control();
    if (ctrl) {
      ctrl.markAsTouched();
      this.toggleLabelError(Boolean(ctrl.invalid && ctrl.touched));
    }
  }

  get errorMessage(): string {
    const ctrl = this.control();
    if (!ctrl?.errors || !ctrl?.touched) {
      return '';
    }

    const errorKey = Object.keys(ctrl.errors)[0];
    const errorHandler = this.errorMessages[errorKey];

    if (errorHandler) {
      return errorHandler(ctrl.errors[errorKey]);
    }

    return 'El valor introducido no es válido.';
  }

  private toggleLabelFocus(toggle: boolean): void {
    const classes = 'input__label--focus';
    this.toggleLabelClass(toggle, classes);
  }

  private toggleLabelError(toggle: boolean): void {
    const classes = 'input__label--error';
    this.toggleLabelClass(toggle, classes);
  }

  private toggleLabelClass(toggle: boolean, classes: string): void {
    const label = this.elementRef?.nativeElement?.querySelector('.input__label');

    if (!label) { return; }

    toggle
      ? this.renderer.addClass(label, classes)
      : this.renderer.removeClass(label, classes);
  }
}