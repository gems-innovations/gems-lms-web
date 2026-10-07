/**
 * Startup core of `shared`: what the app needs before any route loads (configuration, theme and
 * error journal). Kept apart so the initial bundle does not pull the whole UI library.
 */
export { environment } from './environments/environment';
export { BrandingService } from './branding.service';
export type { IBrandingConfig } from './branding.service';
export { ClientErrorJournal } from './client-error-journal.service';
export { I18nService } from './i18n/i18n.service';
export { LANGUAGES } from './i18n/translations';
export type { TLanguage } from './i18n/translations';
