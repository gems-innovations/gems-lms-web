import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  ErrorHandler,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, TitleStrategy, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

import { provideMarkdown } from 'ngx-markdown';
import { routes } from './app.routes';
import { AuthSessionService, authInterceptor } from 'auth/core';
import { AppTitleStrategy } from './app-title.strategy';
import { ClientErrorHandler } from './client-error-handler';
import { AnalyticsService } from './analytics.service';
import { TenantService } from './tenant.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ClientErrorHandler },
    provideZonelessChangeDetection(),
    // Cambio de página con fundido nativo del navegador (View Transitions) y scroll al inicio.
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true }), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideMarkdown(),
    // El «?v=» cambia la URL del worker para que los navegadores que ya lo tenían instalado lo reemplacen:
    // el archivo no cambia entre despliegues y el viejo conservaba un connect-src que bloqueaba las portadas.
    // Súbelo si algún día cambian las cabeceras con que se sirve el worker.
    provideServiceWorker('ngsw-worker.js?v=2', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    // Restore persisted session before route guards run
    provideAppInitializer(() => inject(AuthSessionService).restoreSession()),
    provideAppInitializer(() => inject(AnalyticsService).start()),
    // Marca y home de la institución según el subdominio (antes de pintar la primera página).
    provideAppInitializer(() => inject(TenantService).load()),
  ]
};
