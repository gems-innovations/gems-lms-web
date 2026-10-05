/**
 * Startup core of `auth`: session, roles, display preferences and the HTTP interceptor. Kept apart
 * so guards and the root app do not pull the login and user-management screens.
 */
export { EUserRole, getFullName, getRoleLabel, getRoleHomePath } from './user.model';
export type { IUser } from './user.model';
export type { IUserState } from './user.state';
export { UserState } from './user.state';
export { AuthSessionService } from './auth-session.service';
export { DisplayPreferencesService } from './display-preferences.service';
export type { ThemePreference } from './display-preferences.service';
export { authInterceptor } from './auth.interceptor';
