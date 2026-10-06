import { Component, effect, input, output, signal } from '@angular/core';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { LibButtonComponent, LibInputComponent } from 'shared';
import { TranslatePipe } from 'shared';
import { ILoginCredentials } from '../../../../domain/model/login-credentials.model';

@Component({
  selector: 'auth-login-form',
  imports: [TranslatePipe, FormField, RouterLink, LibInputComponent, LibButtonComponent],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss'
})
export class LoginForm {
  readonly disabled = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly credentials = input<ILoginCredentials | undefined>();

  readonly onSubmit = output<ILoginCredentials>();

  private readonly model = signal<ILoginCredentials>({ email: '', password: '' });

  readonly loginForm = form(this.model, p => {
    required(p.email, { message: 'Este campo es obligatorio.' });
    email(p.email, { message: 'Por favor, introduce un correo válido.' });
    required(p.password, { message: 'Este campo es obligatorio.' });
    minLength(p.password, 8, { message: 'Mínimo 8 caracteres.' });
  });

  constructor() {
    effect(() => {
      const value = this.credentials();
      if (value) {
        this.model.set({ ...value });
      }
    });
  }

  submit(): void {
    if (this.loginForm().valid()) {
      this.onSubmit.emit(this.model());
    } else {
      this.loginForm().markAsTouched();
    }
  }
}
