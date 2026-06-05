import { Routes } from '@angular/router';
import { EUserRole } from 'auth';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginRedirectGuard } from './guards/login-redirect.guard';

export const routes: Routes = [
  // ── Root redirect ──────────────────────────────────────────────────────
  { path: '', redirectTo: 'auth/signin', pathMatch: 'full' },

  // ── Auth ───────────────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [loginRedirectGuard], // already logged in? → go to role home
    loadChildren: () => import('auth').then(m => m.routes)
  },

  // ── Admin panel (super_admin + admin + instructor for preview) ─────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard([
      EUserRole.SUPER_ADMIN, EUserRole.ADMIN, EUserRole.INSTRUCTOR
    ])],
    loadChildren: () => import('admin').then(m => m.routes)
  },

  // ── Course authoring (instructor and above) ────────────────────────────
  {
    path: 'education',
    canActivate: [authGuard, roleGuard([
      EUserRole.SUPER_ADMIN, EUserRole.ADMIN, EUserRole.INSTRUCTOR
    ])],
    loadChildren: () => import('education').then(m => m.routes)
  },

  // ── Student learning zone (all authenticated roles) ────────────────────
  {
    path: 'learn',
    canActivate: [authGuard],
    loadChildren: () => import('education').then(m => m.studentRoutes)
  },

  { path: '**', redirectTo: 'auth/signin' }
];
