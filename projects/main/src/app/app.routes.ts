import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService, EUserRole } from 'auth';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginRedirectGuard } from './guards/login-redirect.guard';

export const routes: Routes = [
  // ── Root redirect ──────────────────────────────────────────────────────
  { path: '', redirectTo: 'auth/signin', pathMatch: 'full' },

  {
    path: 'certificates/verify/:code',
    title: 'Verificar certificado',
    loadComponent: () => import('education').then(m => m.CertificateVerificationContainer)
  },

  // ── Auth ───────────────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [loginRedirectGuard],
    loadChildren: () => import('auth').then(m => m.routes)
  },

  // ── Own account: change password (forced after signing in with a temporary one) ──
  {
    path: 'account/password',
    title: 'Cambiar contraseña',
    canActivate: [authGuard],
    data: { mode: 'change' },
    loadComponent: () => import('auth').then(m => m.PasswordContainer)
  },
  {
    path: 'account/profile',
    title: 'Mi perfil',
    canActivate: [authGuard, () => {
      const role = inject(AuthSessionService).role();
      const destination = role === EUserRole.STUDENT ? '/learn/profile'
        : role === EUserRole.INSTRUCTOR ? '/instructor/profile' : '/admin/profile';
      return inject(Router).parseUrl(destination);
    }],
    loadComponent: () => import('auth').then(m => m.ProfileContainer)
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

  {
    path: 'not-found',
    title: 'Página no encontrada',
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)
  },

  { path: '**', redirectTo: 'not-found' }
];
