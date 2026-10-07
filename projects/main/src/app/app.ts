import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { DisplayPreferencesService } from 'auth/core';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { OnboardingService } from './onboarding.service';
import { GuestSaveBarComponent } from './public/guest-save-bar.component';
import { isGuestUser } from './public/guest-access.service';
import { AppStatusService } from './app-status.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent, GuestSaveBarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(AuthSessionService);
  private readonly display = inject(DisplayPreferencesService);
  readonly onboarding = inject(OnboardingService);
  readonly appStatus = inject(AppStatusService);

  /** Páginas públicas (landing, cursos gratis, legales): sin botón de guía, que tapa el CTA fijo del celular. */
  readonly publicPage = signal(true);
  /** El invitado no tiene guía de la plataforma (solo ve su curso). */
  readonly isGuest = computed(() => isGuestUser(this.session.user()));

  constructor() {
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(e => {
      this.publicPage.set(/^\/($|[#?]|cursos\/|instituciones|terminos|privacidad)/.test(e.urlAfterRedirects));
      this.onboarding.maybeStart();
    });
  }
}
