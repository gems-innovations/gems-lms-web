import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { BrandingService } from 'shared';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private readonly authSession    = inject(AuthSessionService);
  private readonly router         = inject(Router);
  private readonly brandingService = inject(BrandingService);

  logout(): void {
    this.authSession.clearSession();
    this.brandingService.reset();
    this.router.navigate(['/auth/signin']);
  }
}
