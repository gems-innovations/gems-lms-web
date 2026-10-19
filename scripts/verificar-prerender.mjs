// Falla si el HTML prerenderizado hornea datos del API de la máquina que compila (ver app.routes.server.ts).
// El prerender solo debe llevar contenido estático y esqueletos: el catálogo se pide en el navegador.
//
// Uso (tras `ng build main --configuration production,static`):  node scripts/verificar-prerender.mjs [carpeta]
// Por defecto revisa dist/main/browser. Se corre en CI (.github/workflows/ci.yml).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const raiz = resolve(process.argv[2] ?? 'dist/main/browser');

const PROHIBIDO = [
  { re: /No pudimos cargar/i, que: 'texto de error del catálogo (el prerender pidió el API y falló)' },
  { re: /\/cursos\/\d+/, que: 'enlace a un curso con id numérico (id del ambiente que compiló)' },
  { re: /\/api\/v1\/public\//, que: 'respuesta del API en la caché de transferencia (ng-state)' },
  { re: /Muy pronto publicamos los primeros cursos/, que: 'estado vacío del catálogo (se pintó con una lista vacía)' },
];

function htmls(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return htmls(p);
    return n.endsWith('.html') ? [p] : [];
  });
}

const archivos = htmls(raiz);
if (!archivos.some(f => f.endsWith('index.html') && relative(raiz, f) === 'index.html')) {
  console.error(`No hay build prerenderizado en ${raiz}. Corre antes: npx ng build main --configuration production,static`);
  process.exit(2);
}

let fallos = 0;
for (const f of archivos) {
  const html = readFileSync(f, 'utf8');
  for (const { re, que } of PROHIBIDO) {
    const m = html.match(re);
    if (m) { fallos++; console.error(`FALLO ${relative(raiz, f)}: «${m[0]}» -> ${que}`); }
  }
}
// La portada debe traer el texto estático de valor y los enlaces a las otras páginas públicas.
const portada = readFileSync(join(raiz, 'index.html'), 'utf8');
for (const esperado of ['Aprende lo que necesitas', 'Cursos gratis', 'card--skeleton', 'href="/taps"', 'href="/instituciones"']) {
  if (!portada.includes(esperado)) { fallos++; console.error(`FALLO index.html: falta «${esperado}»`); }
}

if (fallos) { console.error(`\n${fallos} problema(s): el prerender no debe depender del API (ver scripts/verificar-prerender.mjs).`); process.exit(1); }
console.log(`Prerender limpio: ${archivos.length} página(s) HTML revisadas en ${raiz}.`);
