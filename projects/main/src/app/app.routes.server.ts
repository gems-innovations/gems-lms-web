import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Auth-gated routes — must render on client (no session available during SSR)
  { path: 'education/**',          renderMode: RenderMode.Client },
  { path: 'learn/**',              renderMode: RenderMode.Client },
  { path: 'admin/**',              renderMode: RenderMode.Client },
  { path: 'instructor/**',         renderMode: RenderMode.Client },
  { path: 'account/**',            renderMode: RenderMode.Client },
  { path: 'certificates/**',       renderMode: RenderMode.Client },
  // The reset link carries its token in the query string, read in the browser.
  { path: 'auth/reset-password',   renderMode: RenderMode.Client },
  { path: 'auth/verify-email',     renderMode: RenderMode.Client },
  // The e-mail link carries a signed token in the query string, read in the browser.
  { path: 'correo/preferencias',   renderMode: RenderMode.Client },

  // Páginas públicas del gancho: se renderizan en el servidor en cada visita (catálogo vivo y buscadores).
  { path: '',                     renderMode: RenderMode.Server },
  { path: 'cursos/:id',           renderMode: RenderMode.Server },
  { path: 'instituciones',        renderMode: RenderMode.Server },
  { path: 'terminos',             renderMode: RenderMode.Server },
  { path: 'privacidad',           renderMode: RenderMode.Server },
  { path: 'solicitudes',          renderMode: RenderMode.Client },

  // Public / pre-renderable routes
  { path: '**', renderMode: RenderMode.Prerender }
];
