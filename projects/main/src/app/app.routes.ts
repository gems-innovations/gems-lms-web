import { ActivatedRouteSnapshot, Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService, EUserRole } from 'auth/core';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginRedirectGuard } from './guards/login-redirect.guard';
import { guestGateGuard } from './public/guest-gate';
import { TenantService } from './tenant.service';
import { tenantLanding } from './tenant-landings';
import { IRouteSeo } from './seo.service';

/** Metadatos de una página pública (descripción, imagen de la tarjeta al compartir); ver SeoService. */
const seo = (value: IRouteSeo) => ({ seo: value });
const TAPS_SEO: IRouteSeo = {
  description: 'Taps de GEMS: quizzes que juegas con un personaje en vivo. Responde, mira cómo reacciona y gana tu título. Gratis y sin registro.',
  image: '/og/taps.png',
  imageAlt: 'Un Tap de GEMS: una pregunta de Minecraft con el personaje en vivo',
};
/** El Tap de un enlace compartido (/t/:id); import diferido para no sumar las preguntas al bundle inicial. */
const sharedTap = (id: string | null) => import('./taps/taps.data').then(m => m.TAPS.find(t => t.id === id) ?? null);

export const routes: Routes = [
  // ── Público: cursos gratis sin registro (gancho) e instituciones ──────────
  {
    path: '',
    pathMatch: 'full',
    // Portada de GEMS para todos; en el subdominio de una institución cambian sus colores (TenantService) y, si tiene
    // una landing propia (tenant-landings.ts), se muestra esa. Un host sin institución (o sin API) ve la portada normal.
    title: () => tenantLanding(inject(TenantService).slug())?.title ?? 'Cursos gratis, sin registro',
    loadComponent: () => {
      const tenant = inject(TenantService);
      return tenantLanding(tenant.slug())?.load()
        ?? import('./public/landing.component').then(m => m.LandingComponent);
    },
    data: seo({ description: 'Cursos gratis y sin registro: empieza hoy, avanza a tu ritmo y guarda tu progreso cuando quieras. Retos de lógica y quizzes para jugar.' })
  },
  {
    path: 'cursos/:id',
    title: 'Curso gratis',
    loadComponent: () => import('./public/public-course.component').then(m => m.PublicCourseComponent)
  },
  {
    path: 'retos',
    title: 'Retos de lógica con su explicación',
    data: seo({ description: 'Retos de lógica cortos, cada uno con su explicación. Pon a prueba tu cabeza gratis y sin registro.' }),
    loadComponent: () => import('./public/retos.component').then(m => m.RetosComponent)
  },
  {
    path: 'bloques',
    title: 'Quiz de Bloques: preguntas del juego con su explicación',
    data: { set: 'bloques', ...seo({ description: 'Quiz de Bloques: preguntas de Minecraft con su explicación. ¿Cuánto sabes del juego? Gratis y sin registro.' }) },
    loadComponent: () => import('./public/retos.component').then(m => m.RetosComponent)
  },
  {
    path: 'taps',
    title: 'Taps: quizzes que juegas con un personaje en vivo',
    data: seo(TAPS_SEO),
    loadComponent: () => import('./taps/taps-feed.component').then(m => m.TapsFeedComponent)
  },
  {
    // Enlace para compartir un Tap: ese Tap va primero y su tarjeta lleva su nombre (se prerenderiza uno por Tap).
    path: 't/:id',
    title: (route: ActivatedRouteSnapshot) => sharedTap(route.paramMap.get('id'))
      .then(tap => tap ? `Tap de ${tap.title}: ¿cuánto sabes?` : 'Taps: quizzes que juegas con un personaje en vivo'),
    resolve: {
      seo: (route: ActivatedRouteSnapshot) => sharedTap(route.paramMap.get('id')).then((tap): IRouteSeo => tap ? {
        ...TAPS_SEO,
        description: `${tap.questions.length} preguntas de ${tap.title} con un personaje en vivo. «${tap.questions[0].q}» Gratis y sin registro.`,
      } : TAPS_SEO),
    },
    loadComponent: () => import('./taps/taps-feed.component').then(m => m.TapsFeedComponent)
  },
  {
    path: 'instituciones',
    title: 'GEMS para tu institución',
    data: seo({ description: 'GEMS LMS para colegios, universidades y empresas: cursos, evaluaciones, certificados y seguimiento con tu marca.' }),
    loadComponent: () => import('./public/institutions.component').then(m => m.InstitutionsComponent)
  },
  {
    path: 'terminos',
    title: 'Términos de uso',
    data: { doc: 'terminos', ...seo({ description: 'Términos de uso de GEMS LMS.' }) },
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
    data: { doc: 'privacidad', ...seo({ description: 'Cómo GEMS LMS trata y protege tus datos personales.' }) },
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
    data: seo({ description: 'Esta página no existe o se movió.', noindex: true }),
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)
  },

  { path: '**', redirectTo: 'not-found' }
];
