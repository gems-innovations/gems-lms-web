import { ChangeDetectionStrategy, Component, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AuthSessionService, getRoleHomePath } from 'auth/core';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly swUpdate = inject(SwUpdate);

  readonly homePath = this.session.user()
    ? getRoleHomePath(this.session.user()!.role)
    : '/auth/signin';

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) afterNextRender(() => void this.retryWithNewVersion());
  }

  /**
   * Quien ya visitó el sitio recibe la app vieja desde el service worker: una ruta publicada después
   * (p. ej. /taps) no existe ahí y acaba aquí. Si hay una versión nueva, se activa y se vuelve a pedir la
   * dirección original una sola vez (marca en sessionStorage para no entrar en bucle).
   */
  private async retryWithNewVersion(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    const target = this.router.lastSuccessfulNavigation()?.initialUrl?.toString();
    if (!target || target.startsWith('/not-found')) return;
    const key = 'nf-update:' + target;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    try {
      // checkForUpdate() da false si la versión nueva ya se descargó antes (queda lista pero sin activar en
      // esta pestaña); por eso se intenta activar siempre: activateUpdate() da true si cambió de versión.
      const found = await this.swUpdate.checkForUpdate();
      const activated = await this.swUpdate.activateUpdate();
      if (found || activated) location.replace(target);
    } catch {
      // Sin red o sin service worker: se queda la página de no encontrado.
    }
  }
}
