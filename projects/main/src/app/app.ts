import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthSessionService } from 'auth';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { OnboardingService } from './onboarding.service';
import { AppStatusService } from './app-status.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(AuthSessionService);
  readonly onboarding = inject(OnboardingService);
  readonly appStatus = inject(AppStatusService);

  constructor() {
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.onboarding.maybeStart());
  }
}
