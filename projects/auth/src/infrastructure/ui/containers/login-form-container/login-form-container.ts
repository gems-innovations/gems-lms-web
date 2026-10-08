import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LoginForm } from '../../forms/login-form/login-form';
import { LoginUseCase } from '../../../../application/login.usecase';
import { ILoginCredentials } from '../../../../domain/model/login-credentials.model';

@Component({
  selector: 'auth-login-form-container',
  imports: [LoginForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-form-container.html'
})
export class LoginFormContainer {
  private readonly loginUseCase = inject(LoginUseCase);

  readonly isLoading = this.loginUseCase.isLoading;
  readonly error     = this.loginUseCase.error;

  login(credentials: ILoginCredentials): void {
    this.loginUseCase.login(credentials);
  }
}
