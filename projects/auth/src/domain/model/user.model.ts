// ============================================================================
// GEMS LMS — User Domain Model
// ============================================================================

export enum EUserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  INSTRUCTOR  = 'instructor',
  STUDENT     = 'student'
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: EUserRole;
  /** The institution this user belongs to. null/undefined for super_admin only. */
  institutionId?: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getFullName(user: IUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function getRoleLabel(role: EUserRole): string {
  const labels: Record<EUserRole, string> = {
    [EUserRole.SUPER_ADMIN]: 'Super Admin',
    [EUserRole.ADMIN]:       'Administrador',
    [EUserRole.INSTRUCTOR]:  'Instructor',
    [EUserRole.STUDENT]:     'Estudiante'
  };
  return labels[role];
}

export function getRoleHomePath(role: EUserRole): string {
  switch (role) {
    case EUserRole.SUPER_ADMIN: return '/admin/institutions';
    case EUserRole.ADMIN:       return '/admin/dashboard';
    case EUserRole.INSTRUCTOR:  return '/education/courses';
    case EUserRole.STUDENT:     return '/learn/home';
  }
}
