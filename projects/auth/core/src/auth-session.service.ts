import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';
import { UserState } from './user.state';
import { EUserRole, getRoleHomePath, IUser } from './user.model';
import { environment, IBrandingConfig, BrandingService } from 'shared/core';

const STORAGE_KEY = 'gems_session';

interface IStoredSession {
  user: IUser;
  token: string;
  branding?: IBrandingConfig | null;
  institutionName?: string | null;
  mustChangePassword?: boolean;
}

interface IInstitutionBrandingResponse {
  name?: string | null;
  branding?: {
    colorPrimary?: string | null;
    colorSecondary?: string | null;
    logoUrl?: string | null;
    darkMode?: boolean | null;
  } | null;
}

/** Reads a claim from a JWT payload without verifying it (the API does that). */
function tokenClaim(token: string, claim: string): unknown {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload))[claim];
  } catch {
    return undefined;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userState  = inject(UserState);
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);

  private readonly _token    = signal<string | null>(null);
  private readonly _branding = signal<IBrandingConfig | null>(null);
  private readonly brandingService = inject(BrandingService);
  private readonly _mustChangePassword = signal(false);

  readonly user            = this.userState.currentUser;
  readonly token           = computed(() => this._token());
  readonly isAuthenticated = computed(() => !!this.user() && !!this._token());
  readonly role            = computed(() => this.user()?.role ?? null);
  readonly institutionId   = computed(() => this.user()?.institutionId ?? null);
  /** Signed in with a temporary password: the app only allows changing it. */
  readonly mustChangePassword = this._mustChangePassword.asReadonly();

  readonly isSuperAdmin        = computed(() => this.role() === EUserRole.SUPER_ADMIN);
  readonly isAdminOrAbove      = computed(() =>
    this.role() === EUserRole.SUPER_ADMIN || this.role() === EUserRole.ADMIN
  );
  readonly isInstructorOrAbove = computed(() =>
    this.isAdminOrAbove() || this.role() === EUserRole.INSTRUCTOR
  );
  readonly isStudent = computed(() => this.role() === EUserRole.STUDENT);

  saveSession(user: IUser, token: string, mustChangePassword = false): void {
    this.userState.setCurrentUser(user);
    this._token.set(token);
    this._mustChangePassword.set(mustChangePassword);
    this.persist();
  }

  /** Token renovado por el API (p. ej. tras editar el propio perfil). */
  replaceToken(token: string): void {
    this._token.set(token);
    this.persist();
  }

  passwordChanged(): void {
    this._mustChangePassword.set(false);
    this.persist();
  }

  updateUser(user: IUser): void {
    this.userState.setCurrentUser(user);
    this.persist();
  }

  clearSession(): void {
    this.userState.clearCurrentUser();
    this._token.set(null);
    this._branding.set(null);
    this.brandingService.setInstitutionName(null);
    this._mustChangePassword.set(false);
    if (this.isBrowser) localStorage.removeItem(STORAGE_KEY);
  }

  restoreSession(): void {
    if (!this.isBrowser) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as IStoredSession;
      if (!parsed.token || !parsed.user) throw new Error('Invalid session');
      // Tokens issued before the API added the institutionId claim get 403 everywhere.
      if (parsed.user.institutionId && !tokenClaim(parsed.token, 'institutionId')) throw new Error('Outdated token');
      parsed.user.createdAt = new Date(parsed.user.createdAt);
      parsed.user.updatedAt = new Date(parsed.user.updatedAt);
      this.userState.setCurrentUser(parsed.user);
      this._token.set(parsed.token);
      this._branding.set(parsed.branding ?? null);
      this.brandingService.setInstitutionName(parsed.institutionName);
      this._mustChangePassword.set(parsed.mustChangePassword === true);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  getHomeRoute(): string {
    return this.role() ? getRoleHomePath(this.role()!) : '/auth/signin';
  }

  getInstitutionBranding(): IBrandingConfig | null {
    return this._branding();
  }

  /**
   * Fetches the branding of the user's institution and caches it in the session.
   * Never fails: a missing institution or a network error simply leaves the default theme.
   */
  loadInstitutionBranding(): Observable<IBrandingConfig | null> {
    const id = this.institutionId();
    if (!id) return of(null);
    return this.http
      .get<IInstitutionBrandingResponse>(`${environment.apiUrls.admin.institutions}/${encodeURIComponent(id)}`)
      .pipe(
        map(inst => {
          this.brandingService.setInstitutionName(inst.name);
          const b = inst.branding;
          if (!b?.colorPrimary) return null;
          return {
            colorPrimary: b.colorPrimary,
            colorSecondary: b.colorSecondary ?? undefined,
            logoUrl: b.logoUrl ?? undefined,
            darkMode: b.darkMode ?? undefined
          } satisfies IBrandingConfig;
        }),
        catchError(() => of(null)),
        tap(branding => {
          this._branding.set(branding);
          this.persist();
        })
      );
  }

  private persist(): void {
    if (!this.isBrowser) return;
    const user = this.user();
    const token = this._token();
    if (!user || !token) return;
    const session: IStoredSession = {
      user, token, branding: this._branding(), institutionName: this.brandingService.institutionName(), mustChangePassword: this._mustChangePassword()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}
