import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IUser, EUserRole } from '../../domain/model/user.model';
import { ILoginCredentials } from '../../domain/model/login-credentials.model';
import { IBrandingConfig } from 'shared';

// ── Institution branding map ──────────────────────────────────────────────────
// Mirrors the branding data from the admin InstitutionService so the student
// zone can apply the correct theme without importing the admin library.
const INSTITUTION_BRANDINGS: Record<string, IBrandingConfig> = {
  'inst-1': { colorPrimary: '#6C63FF', colorSecondary: '#1E1B4B', darkMode: true  },
  'inst-2': { colorPrimary: '#FF6B35', colorSecondary: '#1a1a2e', darkMode: false }
};

// ── Mock user registry ────────────────────────────────────────────────────────
// Password for all mock users: "password123"
const MOCK_USERS: IUser[] = [
  {
    id: 'u-super-1',
    email: 'super@gems.lms',
    firstName: 'Super',
    lastName: 'Admin',
    username: 'superadmin',
    role: EUserRole.SUPER_ADMIN,
    institutionId: undefined,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'u-admin-1',
    email: 'admin@unal.edu.co',
    firstName: 'Carlos',
    lastName: 'Ramírez',
    username: 'carlos.ramirez',
    role: EUserRole.ADMIN,
    institutionId: 'inst-1',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 'u-admin-2',
    email: 'admin@pragma.co',
    firstName: 'Lucía',
    lastName: 'Gómez',
    username: 'lucia.gomez',
    role: EUserRole.ADMIN,
    institutionId: 'inst-2',
    isActive: true,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  },
  {
    id: 'u-inst-1',
    email: 'instructor@unal.edu.co',
    firstName: 'Andrés',
    lastName: 'Torres',
    username: 'andres.torres',
    role: EUserRole.INSTRUCTOR,
    institutionId: 'inst-1',
    isActive: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  },
  {
    id: 'u-student-1',
    email: 'estudiante@unal.edu.co',
    firstName: 'María',
    lastName: 'López',
    username: 'maria.lopez',
    role: EUserRole.STUDENT,
    institutionId: 'inst-1',
    isActive: true,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01')
  }
];

const MOCK_PASSWORD = 'password123';

@Injectable({ providedIn: 'root' })
export class UserService {
  /** Simulate login: find user by email, check password. */
  login(credentials: ILoginCredentials): Observable<IUser> {
    const user = MOCK_USERS.find(u => u.email === credentials.email);
    if (!user || credentials.password !== MOCK_PASSWORD) {
      return throwError(() => new Error('Invalid credentials')).pipe(delay(400));
    }
    return of(user).pipe(delay(400));
  }

  /** Return all users for a specific institution. */
  getInstitutionUsers(institutionId: string): Observable<IUser[]> {
    const users = MOCK_USERS.filter(u => u.institutionId === institutionId);
    return of(users).pipe(delay(300));
  }

  /** Create a new user under an institution (mock: push to in-memory array). */
  createUser(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Observable<IUser> {
    const newUser: IUser = {
      ...data,
      id: `u-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    MOCK_USERS.push(newUser);
    return of(newUser).pipe(delay(300));
  }

  /** Toggle active state for a user. */
  toggleUserStatus(userId: string): Observable<IUser> {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return throwError(() => new Error('User not found'));
    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    return of({ ...user }).pipe(delay(200));
  }

  /** Delete a user (mock: remove from array). */
  deleteUser(userId: string): Observable<void> {
    const idx = MOCK_USERS.findIndex(u => u.id === userId);
    if (idx > -1) MOCK_USERS.splice(idx, 1);
    return of(undefined).pipe(delay(200));
  }

  /** Return the branding configuration for a given institution. */
  getInstitutionBranding(institutionId: string): IBrandingConfig | null {
    return INSTITUTION_BRANDINGS[institutionId] ?? null;
  }
}
