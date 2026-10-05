/**
 * Startup core of `shared`: what the app needs before any route loads (configuration, theme and
 * error journal). Kept apart so the initial bundle does not pull the whole UI library.
 */
export { environment } from './environments/environment';
export { BrandingService } from './branding.service';
export type { IBrandingConfig } from './branding.service';
export { ClientErrorJournal } from './client-error-journal.service';
