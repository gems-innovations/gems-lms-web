import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { SidebarComponent, NavigationItem, UserProfile } from 'shared';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';

@Component({
  selector: 'edu-sidebar-container',
  imports: [SidebarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './education-sidebar-container.html'
})
export class EducationSidebarContainer {
  private readonly authSession   = inject(AuthSessionService);
  private readonly logoutUseCase = inject(LogoutUseCase);

  private readonly user = this.authSession.user;
  private readonly role = this.authSession.role;

  /**
   * Education sidebar items vary by role:
   * - INSTRUCTOR / ADMIN / SUPER_ADMIN: course authoring + learning paths
   * - STUDENT: only the student home (they are routed to /learn, not /education)
   */
  readonly menuItems = computed<NavigationItem[]>(() => {
    const role = this.role();

    if (role === EUserRole.STUDENT) {
      return [
        { id: 'home',    label: 'Inicio',   icon: 'home',    route: '/learn/home' },
        { id: 'catalog', label: 'Catálogo', icon: 'courses', route: '/learn/catalog' }
      ];
    }

    const items: NavigationItem[] = [
      { id: 'courses',        label: 'Cursos',               icon: 'courses',        route: '/education/courses' },
      { id: 'learning-paths', label: 'Rutas de Aprendizaje', icon: 'learning-paths', route: '/education/learning-paths' },
      { id: 'instructor',     label: 'Panel Instructor',     icon: 'home',           route: '/education/instructor' }
    ];

    if (role === EUserRole.ADMIN || role === EUserRole.SUPER_ADMIN) {
      items.push({ id: 'enrollments', label: 'Matrículas', icon: 'home', route: '/education/enrollments' });
    }

    items.push({ id: 'preview', label: 'Vista Estudiante', icon: 'home', route: '/learn/home' });

    return items;
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
