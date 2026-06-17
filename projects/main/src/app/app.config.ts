import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';

import { provideMarkdown } from 'ngx-markdown';
import { routes } from './app.routes';
import { AuthSessionService } from 'auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(),
    provideMarkdown(),
    // Restore persisted session before route guards run
    provideAppInitializer(() => inject(AuthSessionService).restoreSession()),
  ]
};
