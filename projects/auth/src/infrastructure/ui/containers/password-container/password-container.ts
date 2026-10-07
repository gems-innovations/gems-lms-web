import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LibButtonComponent, LibInputComponent } from 'shared';
import { TranslatePipe } from 'shared';
import { PASSWORD_HINT, PASSWORD_RULE, PasswordUseCase } from '../../../../application/password.usecase';

export type TPasswordMode = 'change' | 'forgot' | 'reset';

/**
 * One screen for the three password flows; the route says which one (`data.mode`).
 * - change: signed-in user (forced after signing in with a temporary password).
 * - forgot: asks for the e-mail and sends a reset link.
 * - reset:  sets a new password with the link's `token` query parameter.
 */
@Component({
  selector: 'auth-password-container',
  imports: [TranslatePipe, RouterLink, LibInputComponent, LibButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-container.html',
  styleUrl: './password-container.scss'
})
export class PasswordContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly uc  = inject(PasswordUseCase);

  protected readonly hint = PASSWORD_HINT;
  protected readonly mode = signal<TPasswordMode>('forgot');
  protected readonly token = signal('');

  protected readonly email           = signal('');
  protected readonly currentPassword = signal('');
  protected readonly newPassword     = signal('');
  protected readonly confirmation    = signal('');

  protected readonly newPasswordValid = computed(() => PASSWORD_RULE.test(this.newPassword()));
  protected readonly matches          = computed(() => this.newPassword() === this.confirmation());

  protected readonly canSubmit = computed(() => {
    if (this.uc.isLoading()) return false;
    switch (this.mode()) {
      case 'forgot': return /^\S+@\S+\.\S+$/.test(this.email().trim());
      case 'reset':  return !!this.token() && this.newPasswordValid() && this.matches();
      case 'change': return !!this.currentPassword() && this.newPasswordValid() && this.matches();
    }
  });

  protected readonly title = computed(() => ({
    change: this.uc.mustChangePassword() ? 'Crea tu contraseña' : 'Cambiar contraseña',
    forgot: 'Recupera tu contraseña',
    reset: 'Nueva contraseña'
  })[this.mode()]);

  ngOnInit(): void {
    this.uc.reset();
    this.mode.set((this.route.snapshot.data['mode'] as TPasswordMode) ?? 'forgot');
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  protected submit(): void {
    if (!this.canSubmit()) return;
    switch (this.mode()) {
      case 'forgot': this.uc.requestReset(this.email()); break;
      case 'reset':  this.uc.resetPassword(this.token(), this.newPassword()); break;
      case 'change': this.uc.changePassword(this.currentPassword(), this.newPassword()); break;
    }
  }
}
