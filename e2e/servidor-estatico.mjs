// Sirve el build estático de producción (dist/main/browser) como lo hace nginx en el contenedor (deploy/nginx.conf),
// para correr la suite de humo contra lo mismo que se despliega:
// - páginas prerenderizadas (<ruta>/index.html) y, para lo demás, la shell index.csr.html (o index.html en builds
//   sin prerender);
// - la portada de un subdominio de institución (unal.localhost) recibe la shell, como el `map $host` de nginx;
// - /taps?t=<id> entrega el HTML prerenderizado de /t/<id>;
// - un archivo con extensión que no existe es 404; /healthz responde «ok»;
// - la misma Content-Security-Policy (deploy/csp.conf o, si no existe, la de nginx.conf) con el origen del API.
//
// Uso:  npx ng build main --configuration production,static && node e2e/servidor-estatico.mjs
// Variables: PORT (4300), STATIC_DIR (dist/main/browser), API_BASE_URL (http://localhost:8080/api/v1).
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT ?? 4300);
const root = resolve(process.env.STATIC_DIR ?? 'dist/main/browser');
const apiOrigin = new URL(process.env.API_BASE_URL ?? 'http://localhost:8080/api/v1').origin;

if (!existsSync(join(root, 'index.html')) && !existsSync(join(root, 'index.csr.html'))) {
  console.error(`No hay build en ${root}. Corre antes: npx ng build main --configuration production,static`);
  process.exit(1);
}
const SHELL = existsSync(join(root, 'index.csr.html')) ? '/index.csr.html' : '/index.html';

/** CSP de producción: la de deploy/csp.conf o, en versiones anteriores, la primera de deploy/nginx.conf. */
function cspDeNginx() {
  for (const f of ['deploy/csp.conf', 'deploy/nginx.conf']) {
    if (!existsSync(resolve(f))) continue;
    const m = readFileSync(resolve(f), 'utf8').match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/);
    if (m) return m[1].replaceAll('__API_ORIGIN__', apiOrigin);
  }
  return null;
}
const csp = cspDeNginx();

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm', '.xml': 'application/xml',
};
const SIN_CACHE = /^\/(config\.js|ngsw\.json|safety-worker\.js|manifest\.webmanifest|ngsw-worker\.js)$/;
const RESERVADOS = /^(www|lms|api|app|admin|auth|edu|mail|static|assets|cdn|dev|qa|pdn|prod|staging|test|preview)\./;
const INSTITUCION = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]\.(gemsinnovations\.com|localhost)$/;

/** Archivo existente dentro de la raíz (o null). */
function archivo(ruta) {
  const p = normalize(join(root, decodeURIComponent(ruta)));
  if (!p.startsWith(root)) return null;
  return existsSync(p) && statSync(p).isFile() ? p : null;
}

/** La misma elección de archivo que deploy/nginx.conf. */
function resolver(url, host) {
  const ruta = url.pathname;
  if (ruta === '/') {
    const institucion = INSTITUCION.test(host) && !RESERVADOS.test(host);
    return archivo(institucion ? SHELL : '/index.html') ?? archivo(SHELL);
  }
  if (ruta === '/taps') {
    const t = url.searchParams.get('t');
    if (t && /^[a-z0-9-]{1,40}$/.test(t) && archivo(`/t/${t}/index.html`)) return archivo(`/t/${t}/index.html`);
    return archivo('/taps/index.html') ?? archivo(SHELL);
  }
  const directo = archivo(ruta) ?? archivo(join(ruta, 'index.html'));
  if (directo) return directo;
  return /\.[a-z0-9]+$/i.test(ruta) ? null : archivo(SHELL);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  const host = (req.headers.host ?? '').split(':')[0].toLowerCase();
  const p = resolver(url, host);
  if (!p) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
  const tipo = TIPOS[extname(p).toLowerCase()] ?? 'application/octet-stream';
  const cabeceras = { 'content-type': tipo, 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' };
  if (tipo.startsWith('text/html')) {
    cabeceras['cache-control'] = 'no-cache';
    if (csp) cabeceras['content-security-policy'] = csp;
  } else if (SIN_CACHE.test(url.pathname)) {
    cabeceras['cache-control'] = 'no-store';
  }
  res.writeHead(200, cabeceras);
  createReadStream(p).pipe(res);
  // Sin host: atiende localhost y los subdominios de prueba (unal.localhost), por IPv4 e IPv6.
}).listen(port, () => {
  console.log(`Build estático en http://localhost:${port} (${root}); CSP ${csp ? 'aplicada' : 'no encontrada'}`);
});
