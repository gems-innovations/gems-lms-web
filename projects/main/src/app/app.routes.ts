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
/** Portada del dominio principal: un Tap jugable arriba (la imagen para compartir es la de Taps). */
const PORTADA_SEO: IRouteSeo = {
  description: 'Juega Taps: cinco preguntas cortas con un personaje en vivo y la explicación de cada respuesta. También retos de lógica y cursos gratis. Sin registro.',
  image: TAPS_SEO.image,
  imageAlt: TAPS_SEO.imageAlt,
};
/** Portada en el subdominio de una institución: la de siempre (imagen por defecto de GEMS LMS). */
const INSTITUCION_SEO: IRouteSeo = {
  description: 'Cursos gratis y sin registro: empieza hoy, avanza a tu ritmo y guarda tu progreso cuando quieras. Retos de lógica y quizzes para jugar.',
};
/** El Tap de un enlace compartido (/t/:id); import diferido para no sumar las preguntas al bundle inicial. */
const sharedTap = (id: string | null) => import('./taps/taps.data').then(m => m.findTap(id));
/** Imagen para compartir del tema del Tap (og/taps-<tema>.jpg, de scripts/generar-og-taps.mjs); sin ella, la general de Taps. */
const sharedTapImage = (id: string | null): Promise<Pick<IRouteSeo, 'image' | 'imageAlt'>> => import('./taps/taps.data').then(m => {
  const tap = m.findTap(id);
  const topic = m.TAP_TOPICS.find(t => t.id === (tap && (tap.topic ?? tap.theme)));
  return topic ? { image: `/og/taps-${topic.id}.jpg`, imageAlt: `Taps de GEMS LMS: ${topic.name}, ${topic.blurb.toLowerCase()}` } : {};
});

export const routes: Routes = [
  // ── Público: Taps y cursos gratis sin registro (gancho) e instituciones ──────────
  {
    path: '',
    pathMatch: 'full',
    // Portada de GEMS para todos; en el subdominio de una institución cambian sus colores (TenantService) y, si tiene
    // una landing propia (tenant-landings.ts), se muestra esa. Un host sin institución (o sin API) ve la portada normal:
    // un Tap jugable en el primer pantallazo y, debajo, temas, retos, cursos gratis e instituciones. Con institución (con
    // o sin landing propia) el título y la tarjeta para compartir no hablan de Taps: su portada no cambia.
    title: () => {
      const slug = inject(TenantService).slug();
      return tenantLanding(slug)?.title ?? (slug ? 'Cursos gratis, sin registro' : 'Retos que juegas al instante, gratis y sin registro');
    },
    loadComponent: () => {
      const tenant = inject(TenantService);
      return tenantLanding(tenant.slug())?.load()
        ?? import('./public/landing.component').then(m => m.LandingComponent);
    },
    resolve: { seo: (): IRouteSeo => (inject(TenantService).slug() ? INSTITUCION_SEO : PORTADA_SEO) },
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
    // Reto del día (alias corto para los Shorts): el mismo feed, con el reto de hoy primero. El HTML prerenderizado trae una
    // portada del reto sin opciones (no sabe qué día se abre); al hidratar entra el reto del día de Colombia y se puede jugar.
    path: 'hoy',
    title: 'Reto del día de Taps: el mismo quiz para todos, cambia cada día',
    data: { reto: true, ...seo({ ...TAPS_SEO, description: 'El reto del día de Taps: cinco preguntas y el mismo Tap para todos. Cambia cada día. ¿Me ganas? Gratis y sin registro.' }) },
    loadComponent: () => import('./taps/taps-feed.component').then(m => m.TapsFeedComponent)
  },
  {
    // Enlace para compartir un Tap: ese Tap va primero y su tarjeta lleva su nombre (se prerenderiza uno por Tap).
    path: 't/:id',
    title: (route: ActivatedRouteSnapshot) => sharedTap(route.paramMap.get('id'))
      .then(tap => tap ? (tap.title.trim().endsWith('?') ? `Tap: ${tap.title}` : `Tap de ${tap.title}: ¿cuánto sabes?`) : 'Taps: quizzes que juegas con un personaje en vivo'),
    resolve: {
      seo: (route: ActivatedRouteSnapshot) => Promise.all([sharedTap(route.paramMap.get('id')), sharedTapImage(route.paramMap.get('id'))]).then(([tap, imagen]): IRouteSeo => tap ? {
        ...TAPS_SEO,
        ...imagen,
        description: tap.tipo === 'historia'
          ? `Una historia en ${tap.questions.length} pasos con un personaje en vivo. «${tap.questions[0].q}» Gratis y sin registro.`
          : `${tap.questions.length} preguntas de ${tap.title} con un personaje en vivo. «${tap.questions[0].q}» Gratis y sin registro.`,
      } : TAPS_SEO),
    },
    loadComponent: () => import('./taps/taps-feed.component').then(m => m.TapsFeedComponent)
  },
  {
    // Creador de personajes y Taps (PR-6 del plan de producto/taps/disenador-plan-ux.md): cualquiera crea y prueba sin cuenta;
    // publicar pide cuenta: la hoja del gancho (PR-8) lleva al formulario de /instituciones con `?borrador=<id>` (el borrador local
    // viaja adjunto) u ofrece al estudiante el enlace de su look. Entradas con `?desde=` desde la portada, el feed, /instituciones y /instructor (PR-7). Sigue
    // noindex: el plan no pide indexarla (se llega por las entradas; abrirla a buscadores es decisión del dueño). El diseñador
    // (public/taps-engine/disenador.js) se carga solo en el navegador.
    path: 'crear',
    title: 'Crea tu personaje y tu Tap',
    data: seo({ description: 'Crea y prueba tu personaje para Taps gratis y sin cuenta. Publicar es para docentes e instituciones.', noindex: true }),
    loadComponent: () => import('./taps/tap-disenador.component').then(m => m.TapDisenadorComponent)
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
