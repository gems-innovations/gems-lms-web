import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { basename, join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/**
 * API (api-gateway) URL from the environment: used while rendering on the server and handed to
 * the browser through /config.js (read by index.html before the app starts).
 */
const apiBaseUrl = process.env['API_BASE_URL'];
if (apiBaseUrl) {
  (globalThis as { API_BASE_URL?: string }).API_BASE_URL = apiBaseUrl;
}
const angularApp = new AngularNodeAppEngine();
const apiOrigin = (() => {
  try { return new URL(apiBaseUrl || 'http://localhost:8080/api/v1').origin; }
  catch { return ''; }
})();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  // Uploaded images, videos and files are served by the API origin; course videos embed YouTube or Vimeo.
  const connectSources = ["'self'", apiOrigin].filter(Boolean).join(' ');
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://gc.zgo.at; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: ${apiOrigin}; media-src 'self' blob: ${apiOrigin}; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; font-src 'self' data:; connect-src ${connectSources} https://infogems.goatcounter.com`,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  next();
});

app.get('/config.js', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!apiBaseUrl) {
    res.sendFile(join(browserDistFolder, 'config.js'), { maxAge: 0 });
    return;
  }
  res.type('application/javascript').set('Cache-Control', 'no-store')
    .send(`globalThis.API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: 0,
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      const file = basename(path);
      if (/[-.][A-Z0-9_-]{8,}\.(?:css|js)$/i.test(file)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (['ngsw.json', 'ngsw-worker.js', 'manifest.webmanifest'].includes(file)) {
        res.setHeader('Cache-Control', 'no-cache');
        // El service worker re-pide las imágenes externas con el connect-src de su propia respuesta.
        if (file === 'ngsw-worker.js') {
          res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; connect-src 'self' https:");
        }
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
