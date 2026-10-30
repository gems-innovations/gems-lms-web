import { Injectable, computed, inject } from '@angular/core';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { NavigationItem, UserProfile } from 'shared';

/** Menú del admin de institución; también en /education para que al entrar a Cursos no se pierda el resto del panel. */
export const INSTITUTION_ADMIN_MENU: readonly NavigationItem[] = [
  { id: 'dashboard',   label: 'Mi Institución', icon: 'dashboard', route: '/admin/dashboard' },
  { id: 'people',      label: 'Personas',       icon: 'users',     route: '/admin/people' },
  { id: 'courses',     label: 'Cursos',         icon: 'courses',   route: '/education/courses' },
  { id: 'enrollments', label: 'Matrículas',     icon: 'courses',   route: '/admin/enrollments' },
  { id: 'periods',     label: 'Períodos',       icon: 'learning-paths', route: '/admin/periods' },
  { id: 'reports',     label: 'Reportes',       icon: 'stats',     route: '/admin/reports' },
  { id: 'home',        label: 'Portada',        icon: 'institutions', route: '/admin/home' },
  { id: 'audit',       label: 'Auditoría',      icon: 'audit',     route: '/admin/audit' }
];

@Injectable({ providedIn: 'root' })
export class EducationSidebarUseCase {
  private readonly authSession   = inject(AuthSessionService);
  private readonly logoutUseCase = inject(LogoutUseCase);

  private readonly user = this.authSession.user;
  private readonly role = this.authSession.role;

  readonly menuItems = computed<NavigationItem[]>(() => {
    const role = this.role();

    if (role === EUserRole.STUDENT) {
      return [
        { id: 'home',    label: 'Inicio',   icon: 'home',    route: '/learn/home' },
        { id: 'catalog', label: 'Catálogo', icon: 'courses', route: '/learn/catalog' }
      ];
    }

    if (role === EUserRole.ADMIN) return [...INSTITUTION_ADMIN_MENU];

    const items: NavigationItem[] = [
      { id: 'courses',        label: 'Cursos',               icon: 'courses',        route: '/education/courses' },
      { id: 'learning-paths', label: 'Rutas de Aprendizaje', icon: 'learning-paths', route: '/education/learning-paths' },
    ];

    if (role === EUserRole.SUPER_ADMIN) {
      items.push({ id: 'enrollments', label: 'Matrículas', icon: 'home', route: '/education/enrollments' });
    }

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
