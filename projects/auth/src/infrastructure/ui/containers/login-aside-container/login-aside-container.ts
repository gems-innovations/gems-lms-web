import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LoginAside } from '../../components/login-aside/login-aside';

@Component({
  selector: 'auth-login-aside-container',
  imports: [LoginAside],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './login-aside-container.html'
})
export class LoginAsideContainer { }
