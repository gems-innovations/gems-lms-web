import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { subformComponentProviders, createForm, FormType } from 'ngx-sub-form';
import { InputComponent, ButtonComponent } from 'shared';
import { ILoginCredentials } from '../../../../domain/model/login-credentials.model';

@Component({
  selector: 'auth-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  providers: subformComponentProviders(LoginForm),
  templateUrl: './login-form.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login-form.scss'
})
export class LoginForm {
  private input$    = new Subject<ILoginCredentials | undefined>();
  private disabled$ = new Subject<boolean>();

  public onSubmit    = output<ILoginCredentials>();
  public modelUpdate = output<ILoginCredentials>();

  public disabled      = input<boolean>(false);
  public isLoading     = input<boolean>(false);
  public errorMessage  = input<string | null>(null);
  public credentials   = input<ILoginCredentials | undefined>();

  public form = createForm<ILoginCredentials>(this, {
    formType: FormType.ROOT,
    input$: this.input$,
    output$: new Subject<ILoginCredentials>(),
    disabled$: this.disabled$,
    formControls: {
      email:    new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required, Validators.minLength(8)])
    }
  });

  constructor() {
    this.input$.next(this.credentials());
    this.disabled$.next(this.disabled());
  }

  submit(): void {
    if (this.form.formGroup.valid) {
      const value = this.form.formGroup.value as ILoginCredentials;
      this.onSubmit.emit(value);
      this.modelUpdate.emit(value);
    }
  }

  getControl(name: string) {
    return this.form.formGroup.get(name);
  }
}
