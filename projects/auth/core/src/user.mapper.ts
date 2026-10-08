import { EUserRole, IUser } from './user.model';

// ── API contract (ms-auth) ────────────────────────────────────────────────────

export interface IUserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;            // 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  institutionId: string | null;
  avatarUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  temporaryPassword?: string | null;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

export function toUserRole(apiRole: string): EUserRole {
  return apiRole.toLowerCase() as EUserRole;
}

export function toApiRole(role: EUserRole): string {
  return role.toUpperCase();
}

export function mapUser(r: IUserResponse): IUser {
  return {
    id: String(r.userId),
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    username: r.username,
    role: toUserRole(r.role),
    institutionId: r.institutionId ?? undefined,
    isActive: r.active,
    avatarUrl: r.avatarUrl ?? undefined,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt)
  };
}
