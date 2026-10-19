import { Component, ChangeDetectionStrategy, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import {
  Event as RouterEvent, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router, RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService, DisplayPreferencesService } from 'auth/core';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { OnboardingService } from './onboarding.service';
import { GuestSaveBarComponent } from './public/guest-save-bar.component';
import { isGuestUser } from './public/guest-access.service';
import { AppStatusService } from './app-status.service';
import { ToastContainerComponent } from 'shared';
// Solo se usan dentro de @defer (app.html): shared/loading queda fuera del bundle inicial.
import { ConnectionStatusComponent, RouteProgressComponent } from 'shared/loading';
import { arranqueFallido, ocultarArranque } from './arranque';

/**
 * Modo ligero: en equipos modestos (≤ 2 GB) o con ahorro de datos se quitan los efectos caros, como el desenfoque
 * de los iconos de vidrio (ver _movimiento.scss). Va aquí y no en 'shared' para no arrastrar más código al bundle inicial.
 */
function aplicarModoLigero(): void {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const ligero = nav.connection?.saveData === true || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
  document.documentElement.classList.toggle('modo-ligero', ligero);
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent, GuestSaveBarComponent, ToastContainerComponent, RouteProgressComponent, ConnectionStatusComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(AuthSessionService);
  readonly onboarding = inject(OnboardingService);
  readonly appStatus = inject(AppStatusService);

  /** Páginas públicas (landing, cursos gratis, legales): sin botón de guía, que tapa el CTA fijo del celular. */
  readonly publicPage = signal(true);
  /** En Taps los controles van arriba: el aviso de conexión baja para no taparlos. */
  readonly tapsPage = signal(false);
  /** Hay un cambio de página en curso (barra delgada arriba si tarda). */
  readonly navigating = signal(false);
  /** El invitado no tiene guía de la plataforma (solo ve su curso). */
  readonly isGuest = computed(() => isGuestUser(this.session.user()));

  constructor() {
    inject(DisplayPreferencesService);
    afterNextRender(() => aplicarModoLigero());
    const injector = inject(Injector);
    let first = true;
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe((e: RouterEvent) => {
      if (e instanceof NavigationStart) { this.navigating.set(true); return; }
      if (!(e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationSkipped || e instanceof NavigationError)) return;
      this.navigating.set(false);
      if (first) {
        first = false;
        // La primera página ya está en el DOM: se funde la pantalla de arranque tras su primer pintado.
        if (e instanceof NavigationError) arranqueFallido();
        else afterNextRender(() => ocultarArranque(), { injector });
      }
    });
    inject(Router).events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      this.publicPage.set(/^\/($|[#?]|cursos\/|instituciones|terminos|privacidad|taps|t\/)/.test(e.urlAfterRedirects));
      this.tapsPage.set(/^\/(taps|t\/)/.test(e.urlAfterRedirects));
      this.onboarding.maybeStart();
    });
  }
}
