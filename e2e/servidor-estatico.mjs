// Sirve el build estático de producción (dist/main/browser) como lo hace nginx en el contenedor, para correr la suite
// de humo contra lo mismo que se despliega: rutas de la SPA con respaldo a index.html, 404 para archivos que no
// existen, /healthz y la misma Content-Security-Policy de deploy/nginx.conf (con el origen del API sustituido).
//
// Uso:  npx ng build main --configuration production,static && node e2e/servidor-estatico.mjs
// Variables: PORT (4300), STATIC_DIR (dist/main/browser), API_BASE_URL (http://localhost:8080/api/v1).
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT ?? 4300);
const root = resolve(process.env.STATIC_DIR ?? 'dist/main/browser');
const apiOrigin = new URL(process.env.API_BASE_URL ?? 'http://localhost:8080/api/v1').origin;

if (!existsSync(join(root, 'index.html'))) {
  console.error(`No hay build en ${root}. Corre antes: npx ng build main --configuration production,static`);
  process.exit(1);
}

/** CSP del bloque server de nginx (la primera que aparece), igual que en producción. */
function cspDeNginx() {
  const conf = readFileSync(resolve('deploy/nginx.conf'), 'utf8');
  const m = conf.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/);
  return m ? m[1].replaceAll('__API_ORIGIN__', apiOrigin) : null;
}
const csp = cspDeNginx();

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm', '.xml': 'application/xml',
};
const SIN_CACHE = /^\/(config\.js|ngsw\.json|safety-worker\.js|manifest\.webmanifest|index\.html|ngsw-worker\.js)$/;

function archivo(ruta) {
  const p = normalize(join(root, decodeURIComponent(ruta)));
  if (!p.startsWith(root)) return null;
  if (existsSync(p) && statSync(p).isFile()) return p;
  const indice = join(p, 'index.html');
  if (existsSync(indice)) return indice;
  return null;
}

createServer((req, res) => {
  const ruta = new URL(req.url ?? '/', 'http://x').pathname;
  if (ruta === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  let p = archivo(ruta);
  // Como el try_files de nginx: un archivo con extensión que no existe es 404; una ruta de la app, index.html.
  if (!p && !/\.[a-z0-9]+$/i.test(ruta)) p = join(root, 'index.html');
  if (!p) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
  const tipo = TIPOS[extname(p).toLowerCase()] ?? 'application/octet-stream';
  const cabeceras = { 'content-type': tipo, 'x-content-type-options': 'nosniff' };
  if (tipo.startsWith('text/html')) {
    Object.assign(cabeceras, { 'cache-control': 'no-store', 'x-frame-options': 'DENY' });
    if (csp) cabeceras['content-security-policy'] = csp;
  } else if (SIN_CACHE.test(ruta)) {
    cabeceras['cache-control'] = 'no-store';
  }
  res.writeHead(200, cabeceras);
  createReadStream(p).pipe(res);
  // Sin host: atiende localhost y los subdominios de prueba (unal.localhost), por IPv4 e IPv6.
}).listen(port, () => {
  console.log(`Build estático en http://localhost:${port} (${root}); CSP de nginx ${csp ? 'aplicada' : 'no encontrada'}`);
});
