import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';
import { UserState } from '../../domain/state/user.state';
import { EUserRole, getRoleHomePath, IUser } from '../../domain/model/user.model';
import { environment, IBrandingConfig } from 'shared';

const STORAGE_KEY = 'gems_session';

interface IStoredSession {
  user: IUser;
  token: string;
  branding?: IBrandingConfig | null;
}

interface IInstitutionBrandingResponse {
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

  readonly user            = this.userState.currentUser;
  readonly token           = computed(() => this._token());
  readonly isAuthenticated = computed(() => !!this.user() && !!this._token());
  readonly role            = computed(() => this.user()?.role ?? null);
  readonly institutionId   = computed(() => this.user()?.institutionId ?? null);

  readonly isSuperAdmin        = computed(() => this.role() === EUserRole.SUPER_ADMIN);
  readonly isAdminOrAbove      = computed(() =>
    this.role() === EUserRole.SUPER_ADMIN || this.role() === EUserRole.ADMIN
  );
  readonly isInstructorOrAbove = computed(() =>
    this.isAdminOrAbove() || this.role() === EUserRole.INSTRUCTOR
  );
  readonly isStudent = computed(() => this.role() === EUserRole.STUDENT);

  saveSession(user: IUser, token: string): void {
    this.userState.setCurrentUser(user);
    this._token.set(token);
    this.persist();
  }

  clearSession(): void {
    this.userState.clearCurrentUser();
    this._token.set(null);
    this._branding.set(null);
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
    const session: IStoredSession = { user, token, branding: this._branding() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}
