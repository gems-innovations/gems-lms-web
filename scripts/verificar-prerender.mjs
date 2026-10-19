// Falla si el HTML prerenderizado hornea datos del API de la máquina que compila (ver app.routes.server.ts).
// El prerender solo debe llevar contenido estático y esqueletos: el catálogo se pide en el navegador.
//
// Uso (tras `ng build main --configuration production,static`):  node scripts/verificar-prerender.mjs [carpeta]
// Por defecto revisa dist/main/browser. Se corre en CI (.github/workflows/ci.yml).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
// La portada debe traer el texto estático de valor, el esqueleto del catálogo y los enlaces a las otras puertas públicas.
const portada = readFileSync(join(raiz, 'index.html'), 'utf8');
for (const esperado of ['Retos cortos que', 'Cursos gratis', 'card--skeleton', 'href="/taps"', 'href="/retos"', 'href="/instituciones"', 'href="/auth/signin"']) {
  if (!portada.includes(esperado)) { fallos++; console.error(`FALLO index.html: falta «${esperado}»`); }
}
// Y se juega desde el primer fotograma: UN Tap ya pintado con su pregunta y sus opciones (el script de index.html marca
// la respuesta antes de hidratar gracias a data-ans). Uno solo: la portada no debe cargar con el HTML de todo el feed.
const tapsEnPortada = portada.match(/\sdata-tap="/g)?.length ?? 0;
if (tapsEnPortada !== 1) { fallos++; console.error(`FALLO index.html: debe traer exactamente 1 Tap jugable y trae ${tapsEnPortada}`); }
if (!/class="tap__q"[^>]*>[^<]{3,}/.test(portada)) { fallos++; console.error('FALLO index.html: el Tap no trae su pregunta en el HTML'); }
if ((portada.match(/class="tap__opt[ "]/g)?.length ?? 0) < 2 || !/data-ans="\d"/.test(portada)) {
  fallos++; console.error('FALLO index.html: el Tap no trae sus opciones jugables (tap__opt y data-ans)');
}
// Los enlaces compartidos con ids antiguos deben conservar su tarjeta: título propio, no el genérico de la shell.
for (const id of ['primeros-pasos', 'redstone', 'nether']) {
  const f = join(raiz, 't', id, 'index.html');
  const html = existsSync(f) ? readFileSync(f, 'utf8') : '';
  if (!/<title>Tap/.test(html)) { fallos++; console.error(`FALLO t/${id}/index.html: no está prerenderizado con su título (enlaces viejos sin tarjeta)`); }
}

if (fallos) { console.error(`\n${fallos} problema(s): el prerender no debe depender del API (ver scripts/verificar-prerender.mjs).`); process.exit(1); }
console.log(`Prerender limpio: ${archivos.length} página(s) HTML revisadas en ${raiz}.`);
