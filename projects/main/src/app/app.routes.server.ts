import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { TAPS } from './taps/taps.data';

/**
 * Cómo se entrega cada ruta. Producción es estática (nginx, `--configuration production,static`): no hay Node que
 * renderice en cada visita, así que las páginas públicas se PRERENDERIZAN en el build y nginx sirve ese HTML por ruta
 * (deploy/nginx.conf). Lo demás recibe la «shell» (index.csr.html) y se pinta en el navegador.
 *
 * Las mismas reglas valen para `npm run serve:ssr:main` (outputMode server): ahí también se prerenderizan.
 */
export const serverRoutes: ServerRoute[] = [
  // Páginas públicas del gancho: el HTML llega con el contenido y los metadatos para compartir (og:, canonical).
  // La portada depende del host: en el subdominio de una institución nginx entrega la shell, no este HTML.
  { path: '',               renderMode: RenderMode.Prerender },
  { path: 'retos',          renderMode: RenderMode.Prerender },
  { path: 'bloques',        renderMode: RenderMode.Prerender },
  { path: 'instituciones',  renderMode: RenderMode.Prerender },
  { path: 'terminos',       renderMode: RenderMode.Prerender },
  { path: 'privacidad',     renderMode: RenderMode.Prerender },
  // El feed de Taps: la primera pregunta llega ya pintada; el motor 3D solo se carga en el navegador.
  { path: 'taps',           renderMode: RenderMode.Prerender },
  // Un Tap compartido (/t/mc-nether-1): su propia tarjeta (título, descripción con la primera pregunta, imagen) y ese Tap
  // primero. Se prerenderizan los 53 del banco (~81 KB c/u: el feed solo pinta el Tap pedido y el siguiente, no los 53).
  // Un id que no se prerenderizó (un Tap nuevo) recibe la shell y se pinta en el navegador.
  {
    path: 't/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => TAPS.map(tap => ({ id: tap.id })),
    fallback: PrerenderFallback.Client,
  },
  { path: 'not-found',      renderMode: RenderMode.Prerender },

  // Cursos abiertos: el catálogo vive en el API y cambia sin desplegar; sin SSR se pintan en el navegador
  // (con los metadatos genéricos de index.html). Prerenderizarlos exigiría el API durante el build.
  { path: 'cursos/:id',     renderMode: RenderMode.Client },

  // Todo lo demás (zonas con sesión, auth, enlaces con token): solo en el navegador.
  { path: '**',             renderMode: RenderMode.Client },
];
