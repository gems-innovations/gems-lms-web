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

  // Public / pre-renderable routes
  { path: '**', renderMode: RenderMode.Prerender }
];
