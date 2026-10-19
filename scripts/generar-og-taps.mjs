#!/usr/bin/env node
/**
 * Imágenes para compartir de los Taps (Open Graph / Twitter, 1200×630, JPEG ~40 kB): una por tema, con el zorro de GEMS LMS y el
 * nombre del tema. Salen de `projects/main/public/og/taps-<tema>.jpg` y las usa `app.routes.ts` en `/t/:id`.
 *
 * Los temas se leen de TAP_TOPICS (projects/main/src/app/taps/taps.data.ts): un tema nuevo allí genera su imagen
 * al correr `npm run og:generar`. Usa Chromium de Playwright (ya es dependencia de desarrollo; no suma nada al
 * bundle ni al build de producción). Las PNG resultantes se versionan: el build de Docker no necesita Chromium.
 *
 * Uso: npm run og:generar          (escribe las imágenes)
 *      npm run og:verificar        (falla si falta la imagen de algún tema)
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publico = join(raiz, 'projects/main/public');
const salida = join(publico, 'og');
const soloVerificar = process.argv.includes('--check');

/** Lee los temas (id, nombre, línea, color) del catálogo TAP_TOPICS sin compilar TypeScript. */
function leerTemas() {
  const fuente = readFileSync(join(raiz, 'projects/main/src/app/taps/taps.data.ts'), 'utf8');
  const bloque = /export const TAP_TOPICS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(fuente)?.[1] ?? '';
  const temas = [...bloque.matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*blurb:\s*'([^']+)',\s*color:\s*'(#[0-9a-fA-F]{6})'\s*\}/g)]
    .map(m => ({ id: m[1], nombre: m[2], linea: m[3], color: m[4] }));
  if (!temas.length) throw new Error('No se pudieron leer los temas de TAP_TOPICS (¿cambió su formato?).');
  return temas;
}

const temas = leerTemas();
const archivo = t => join(salida, `taps-${t.id}.jpg`);

if (soloVerificar) {
  const faltan = temas.filter(t => !existsSync(archivo(t)));
  if (faltan.length) { console.error(`Faltan imágenes og/taps-<tema>.jpg: ${faltan.map(t => t.id).join(', ')}. Corre: npm run og:generar`); process.exit(1); }
  console.log(`Imágenes de Taps presentes: ${temas.map(t => t.id).join(', ')}`);
  process.exit(0);
}

const b64 = ruta => readFileSync(join(publico, ruta)).toString('base64');
const fuentes = `
  @font-face{font-family:Jakarta;font-weight:200 800;src:url(data:font/woff2;base64,${b64('fonts/plus-jakarta-sans-latin-var.woff2')}) format('woff2')}
  @font-face{font-family:Rubik;font-weight:700;src:url(data:font/woff2;base64,${b64('fonts/rubik-latin-700-normal.woff2')}) format('woff2')}
  @font-face{font-family:Pixel;font-weight:400;src:url(data:font/woff2;base64,${b64('fonts/press-start-2p-latin-400-normal.woff2')}) format('woff2')}`;
const logo = `data:image/png;base64,${b64('logo-512.png')}`;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const html = t => `<!doctype html><meta charset="utf-8"><style>${fuentes}
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;font-family:Jakarta,sans-serif;color:#fff;
    background:radial-gradient(900px 560px at 88% 12%, ${t.color}66, transparent 70%), linear-gradient(135deg,#10142a 0%,#1b2347 100%);
    display:grid;grid-template-columns:420px 1fr;align-items:center;padding:0 76px;gap:24px}
  .logo{width:340px;height:340px;justify-self:center}
  .marca{font-size:28px;font-weight:800;letter-spacing:.04em;color:${t.color};text-transform:uppercase}
  h1{margin-top:14px;font-family:${t.id === 'minecraft' ? 'Pixel' : 'Rubik'},Jakarta,sans-serif;font-size:${t.id === 'minecraft' ? 56 : 92}px;line-height:1.05;font-weight:${t.id === 'minecraft' ? 400 : 700}}
  .linea{margin-top:18px;font-size:38px;font-weight:600;opacity:.9}
  .pie{margin-top:40px;display:inline-block;padding:14px 26px;border-radius:999px;background:rgba(255,255,255,.12);border:2px solid ${t.color};font-size:27px;font-weight:700}
  .barra{position:absolute;left:0;right:0;bottom:0;height:12px;background:${t.color}}
</style>
<img class="logo" src="${logo}" alt="">
<div><div class="marca">Taps de GEMS LMS</div><h1>${esc(t.nombre)}</h1><p class="linea">${esc(t.linea)}</p>
<span class="pie">Gratis y sin registro · ¿Cuánto sabes?</span></div><div class="barra"></div>`;

mkdirSync(salida, { recursive: true });
const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const t of temas) {
    await pagina.setContent(html(t));
    await pagina.evaluate(() => document.fonts.ready);
    const png = await pagina.screenshot({ type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    writeFileSync(archivo(t), png);
    console.log(`og/taps-${t.id}.jpg  ${(statSync(archivo(t)).size / 1024).toFixed(1)} kB`);
  }
} finally {
  await navegador.close();
}
