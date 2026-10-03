import { Injectable, computed, inject } from '@angular/core';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { NavigationItem, UserProfile } from '@gems-lms-web/shared';

@Injectable({ providedIn: 'root' })
export class AdminSidebarUseCase {
  private readonly authSession   = inject(AuthSessionService);
  private readonly logoutUseCase = inject(LogoutUseCase);

  private readonly user = this.authSession.user;
  private readonly role = this.authSession.role;

  readonly menuItems = computed<NavigationItem[]>(() => {
    const role = this.role();

    if (role === EUserRole.SUPER_ADMIN) {
      return [
        { id: 'institutions', label: 'Instituciones', icon: 'institutions', route: '/admin/institutions' },
        { id: 'audit', label: 'Auditoría', icon: 'stats', route: '/admin/audit' }
      ];
    }
    if (role === EUserRole.ADMIN) {
      return [
        { id: 'dashboard',   label: 'Mi Institución', icon: 'dashboard', route: '/admin/dashboard' },
        { id: 'people',      label: 'Personas',        icon: 'users',     route: '/admin/people' },
        { id: 'enrollments', label: 'Matrículas',      icon: 'courses',   route: '/admin/enrollments' },
        { id: 'audit',       label: 'Auditoría',       icon: 'stats',     route: '/admin/audit' }
      ];
    }
    if (role === EUserRole.INSTRUCTOR) {
      return [
        { id: 'dashboard', label: 'Mi Institución', icon: 'dashboard', route: '/admin/dashboard' }
      ];
    }
    return [];
  });

  readonly homeRoute = computed<string>(() => this.menuItems()[0]?.route ?? '/admin/dashboard');

  readonly userProfile = computed<UserProfile | null>(() => {
    const u = this.user();
    if (!u) return null;
    return {
      name:   `${u.firstName} ${u.lastName}`,
      email:  u.email,
      role:   this.getRoleLabel(u.role),
      avatar: u.avatarUrl
    };
  });

  logout(): void { this.logoutUseCase.logout(); }

  private getRoleLabel(role: EUserRole): string {
    const map: Record<EUserRole, string> = {
      [EUserRole.SUPER_ADMIN]: 'Super Admin',
      [EUserRole.ADMIN]:       'Administrador',
      [EUserRole.INSTRUCTOR]:  'Instructor',
      [EUserRole.STUDENT]:     'Estudiante'
    };
    return map[role] ?? role;
  }
}
