import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'auth-login-layout',
  imports: [RouterOutlet],
  templateUrl: './login-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login-layout.scss'
})
export class LoginLayout { }