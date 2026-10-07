import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';

type TVerifyState = 'checking' | 'ok' | 'invalid';

/** Opened from the link in the verification e-mail: sends its `token` to the API and shows the result. */
@Component({
  selector: 'auth-verify-email-container',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../password-container/password-container.scss',
  template: `
    <div class="password__wrapper">
      <div class="password">
        <header class="password__header">
          <img src="/logo-144.png" width="144" height="144" alt="GEMS LMS" class="password__logo" />
        </header>

        <div class="password__intro">
          <h1 class="password__title">Confirmar correo</h1>
        </div>

        @switch (state()) {
          @case ('checking') {
            <p class="password__subtitle" role="status">Confirmando tu correo…</p>
          }
          @case ('ok') {
            <div class="password__banner password__banner--ok" role="status">
              Listo, tu correo quedó confirmado. ¡Gracias!
            </div>
            <a routerLink="/learn/my-learning" class="password__link">Seguir estudiando</a>
          }
          @case ('invalid') {
            <div class="password__banner password__banner--error" role="alert">
              El enlace no es válido o ya venció. Si necesitas uno nuevo, escríbenos a info@gemsinnovations.com.
            </div>
            <a routerLink="/auth/signin" class="password__link">Iniciar sesión</a>
          }
        }
      </div>
    </div>
  `
})
export class VerifyEmailContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(UserService);

  protected readonly state = signal<TVerifyState>('checking');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.state.set('invalid');
      return;
    }
    this.users.verifyEmail(token).subscribe({
      next: () => this.state.set('ok'),
      error: () => this.state.set('invalid')
    });
  }
}
