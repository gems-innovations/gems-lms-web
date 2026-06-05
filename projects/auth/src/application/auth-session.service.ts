import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserState } from '../domain/state/user.state';
import { EUserRole, getRoleHomePath, IUser } from '../domain/model/user.model';
import { UserService } from '../infrastructure/services/user.service';
import { IBrandingConfig } from 'shared';

const STORAGE_KEY = 'gems_session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userState   = inject(UserState);
  private readonly userService = inject(UserService);
  private readonly platformId  = inject(PLATFORM_ID);
  private readonly isBrowser   = isPlatformBrowser(this.platformId);

  // ── Exposed signals ───────────────────────────────────────────────────────
  readonly user            = this.userState.currentUser;
  readonly isAuthenticated = computed(() => !!this.user());
  readonly role            = computed(() => this.user()?.role ?? null);
  readonly institutionId   = computed(() => this.user()?.institutionId ?? null);

  readonly isSuperAdmin       = computed(() => this.role() === EUserRole.SUPER_ADMIN);
  readonly isAdminOrAbove     = computed(() =>
    this.role() === EUserRole.SUPER_ADMIN || this.role() === EUserRole.ADMIN
  );
  readonly isInstructorOrAbove = computed(() =>
    this.isAdminOrAbove() || this.role() === EUserRole.INSTRUCTOR
  );
  readonly isStudent = computed(() => this.role() === EUserRole.STUDENT);

  // ── Session management ───────────────────────────────────────────────────
  saveSession(user: IUser): void {
    this.userState.setCurrentUser(user);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    this.userState.clearCurrentUser();
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Call once during app init (APP_INITIALIZER) to restore persisted session. */
  restoreSession(): void {
    if (!this.isBrowser) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as IUser;
      // Rehydrate Date objects
      parsed.createdAt = new Date(parsed.createdAt);
      parsed.updatedAt = new Date(parsed.updatedAt);
      this.userState.setCurrentUser(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  getHomeRoute(): string {
    const role = this.role();
    return role ? getRoleHomePath(role) : '/auth/signin';
  }

  /** Returns the branding config for the current user's institution, or null. */
  getInstitutionBranding(): IBrandingConfig | null {
    const id = this.institutionId();
    return id ? this.userService.getInstitutionBranding(id) : null;
  }
}
