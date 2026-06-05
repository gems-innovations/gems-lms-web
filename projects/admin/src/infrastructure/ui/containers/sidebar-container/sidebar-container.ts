import { Component, computed, inject } from '@angular/core';
import { SidebarComponent, NavigationItem, UserProfile } from 'shared';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';

@Component({
  selector: 'adm-sidebar-container',
  imports: [SidebarComponent],
  templateUrl: './sidebar-container.html'
})
export class SidebarContainer {
  private readonly authSession = inject(AuthSessionService);
  private readonly logoutUseCase = inject(LogoutUseCase);

  private readonly user = this.authSession.user;
  private readonly role = this.authSession.role;

  /** Build the navigation items based on the logged-in role. */
  readonly menuItems = computed<NavigationItem[]>(() => {
    const role = this.role();

    if (role === EUserRole.SUPER_ADMIN) {
      return [
        { id: 'institutions', label: 'Instituciones', icon: 'institutions', route: '/admin/institutions' }
      ];
    }

    if (role === EUserRole.ADMIN) {
      return [
        { id: 'dashboard',  label: 'Mi Institución', icon: 'dashboard', route: '/admin/dashboard' },
        { id: 'users',      label: 'Usuarios',        icon: 'users',     route: '/admin/users' }
      ];
    }

    if (role === EUserRole.INSTRUCTOR) {
      return [
        { id: 'dashboard', label: 'Mi Institución', icon: 'dashboard', route: '/admin/dashboard' }
      ];
    }

    return [];
  });

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

  onLogout(): void {
    this.logoutUseCase.logout();
  }

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
