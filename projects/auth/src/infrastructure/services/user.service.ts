import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { IUser, EUserRole } from '../../domain/model/user.model';
import { ILoginCredentials } from '../../domain/model/login-credentials.model';
import { environment } from 'shared';

// ── API contracts (ms-auth) ───────────────────────────────────────────────────

interface IUserResponse {
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

interface ILoginResponse extends IUserResponse {
  token: string;
}

export interface ILoginResult {
  user: IUser;
  token: string;
}

export interface ICreatedUser {
  user: IUser;
  /** Returned by the API when the user was created without a password. */
  temporaryPassword?: string;
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

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly urls = environment.apiUrls;

  login(credentials: ILoginCredentials): Observable<ILoginResult> {
    return this.http.post<ILoginResponse>(this.urls.auth.login, credentials).pipe(
      map(r => ({ user: mapUser(r), token: r.token }))
    );
  }

  /** Return every user (super admin views). */
  getAllUsers(): Observable<IUser[]> {
    return this.http.get<IUserResponse[]>(this.urls.users).pipe(map(list => list.map(mapUser)));
  }

  /** Return all users for a specific institution. */
  getInstitutionUsers(institutionId: string): Observable<IUser[]> {
    return this.http
      .get<IUserResponse[]>(`${this.urls.users}/institution/${encodeURIComponent(institutionId)}`)
      .pipe(map(list => list.map(mapUser)));
  }

  /** Create a user. Without a password the API generates a temporary one and returns it. */
  createUser(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Observable<ICreatedUser> {
    const body = {
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username || undefined,
      email: data.email,
      password: data.password || undefined,
      role: toApiRole(data.role),
      institutionId: data.institutionId ?? null
    };
    return this.http.post<IUserResponse>(this.urls.auth.register, body).pipe(
      map(r => ({ user: mapUser(r), temporaryPassword: r.temporaryPassword ?? undefined }))
    );
  }

  /** Toggle active state for a user. */
  toggleUserStatus(userId: string): Observable<IUser> {
    return this.http.put<IUserResponse>(`${this.urls.users}/${userId}/status`, {}).pipe(map(mapUser));
  }

  /** Delete a user (the API deactivates it). */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.urls.users}/${userId}`);
  }
}
