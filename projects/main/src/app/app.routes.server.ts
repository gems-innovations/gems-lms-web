import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Parametric routes — rendered on the client (no static params available)
  { path: 'education/courses/:id/edit',       renderMode: RenderMode.Client },
  { path: 'education/learning-paths/:id/edit', renderMode: RenderMode.Client },
  { path: 'learn/courses/:id',                renderMode: RenderMode.Client },
  { path: 'learn/paths/:id',                  renderMode: RenderMode.Client },

  // All other routes — prerender as static HTML
  { path: '**', renderMode: RenderMode.Prerender }
];
