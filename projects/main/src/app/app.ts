import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthSessionService } from 'auth';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<a class="skip-link" href="#main-content">Ir al contenido principal</a><div id="main-content" tabindex="-1"><router-outlet /></div><app-command-palette />@if (session.user()) { <button class="app-tour-button" type="button" (click)="onboarding.start()" title="Ver guía de la plataforma" aria-label="Ver guía de la plataforma">?</button> }',
  styles: ['.skip-link{position:fixed;top:.75rem;left:.75rem;z-index:2000;padding:.65rem 1rem;border-radius:.5rem;background:#fff;color:#111827;font-weight:700;box-shadow:0 4px 18px rgba(0,0,0,.25);transform:translateY(-160%);transition:transform .15s}.skip-link:focus{transform:translateY(0)}#main-content:focus{outline:none}.app-tour-button{position:fixed;right:1rem;bottom:1rem;z-index:1000;width:2.5rem;height:2.5rem;border:0;border-radius:50%;background:var(--color-primario,#2563eb);color:#fff;font-size:1.2rem;font-weight:700;box-shadow:0 5px 16px rgba(37,99,235,.35);cursor:pointer}.app-tour-button:focus-visible{outline:3px solid var(--color-primario,#2563eb);outline-offset:3px}'],
})
export class App {
  readonly session = inject(AuthSessionService);
  readonly onboarding = inject(OnboardingService);

  constructor() {
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.onboarding.maybeStart());
  }
}
