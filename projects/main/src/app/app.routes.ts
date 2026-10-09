import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService, EUserRole } from 'auth/core';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginRedirectGuard } from './guards/login-redirect.guard';
import { guestGateGuard } from './public/guest-gate';

export const routes: Routes = [
  // ── Público: cursos gratis sin registro (gancho) e instituciones ──────────
  {
    path: '',
    pathMatch: 'full',
    title: 'Cursos gratis, sin registro',
    loadComponent: () => import('./public/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'cursos/:id',
    title: 'Curso gratis',
    loadComponent: () => import('./public/public-course.component').then(m => m.PublicCourseComponent)
  },
  {
    path: 'instituciones',
    title: 'GEMS para tu institución',
    loadComponent: () => import('./public/institutions.component').then(m => m.InstitutionsComponent)
  },
  {
    path: 'terminos',
    title: 'Términos de uso',
    data: { doc: 'terminos' },
    loadComponent: () => import('./public/legal-page.component').then(m => m.LegalPageComponent)
  },
  {
    path: 'correo/preferencias',
    title: 'Tus correos de GEMS',
    loadComponent: () => import('./public/email-preferences-page.component').then(m => m.EmailPreferencesPageComponent)
  },
  {
    path: 'privacidad',
    title: 'Privacidad y datos personales',
    data: { doc: 'privacidad' },
    loadComponent: () => import('./public/legal-page.component').then(m => m.LegalPageComponent)
  },
  {
    path: 'solicitudes',
    title: 'Solicitudes de instituciones',
    canActivate: [authGuard, roleGuard([EUserRole.SUPER_ADMIN])],
    loadComponent: () => import('./public/institution-requests.component').then(m => m.InstitutionRequestsComponent)
  },

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
    canActivateChild: [guestGateGuard],
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
