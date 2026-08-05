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
    canActivate: [loginRedirectGuard],
    loadChildren: () => import('auth').then(m => m.routes)
  },

  // ── Admin panel ────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard([
      EUserRole.SUPER_ADMIN, EUserRole.ADMIN, EUserRole.INSTRUCTOR
    ])],
    loadChildren: () => import('admin').then(m => m.routes)
  },

  // ── Course authoring (admin/instructor) ──────────────────────────────────
  {
    path: 'education',
    canActivate: [authGuard, roleGuard([
      EUserRole.SUPER_ADMIN, EUserRole.ADMIN, EUserRole.INSTRUCTOR
    ])],
    loadComponent: () => import('education').then(m => m.EducationLayout),
    children: [
      {
        path: '',
        outlet: 'sidebar',
        loadComponent: () => import('education').then(m => m.EducationSidebarContainer)
      },
      {
        path: '',
        loadChildren: () => import('education').then(m => m.educationChildRoutes)
      }
    ]
  },

  // ── Student zone (StudentLayout) ─────────────────────────────────────────
  {
    path: 'learn',
    canActivate: [authGuard],
    loadComponent: () => import('education').then(m => m.StudentLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('education').then(m => m.studentChildRoutes)
      }
    ]
  },

  // ── Panel del instructor (layout y sidebar propios) ──────────────────────
  {
    path: 'instructor',
    canActivate: [authGuard, roleGuard([EUserRole.SUPER_ADMIN, EUserRole.ADMIN, EUserRole.INSTRUCTOR])],
    loadChildren: () => import('instructor').then(m => m.instructorRoutes)
  },

  { path: '**', redirectTo: 'auth/signin' }
];
