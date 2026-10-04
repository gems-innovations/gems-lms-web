import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService, getRoleHomePath } from 'auth';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly session = inject(AuthSessionService);

  readonly homePath = this.session.user()
    ? getRoleHomePath(this.session.user()!.role)
    : '/auth/signin';
}
