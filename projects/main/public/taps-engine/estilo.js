// Estilo del creador para el diseñador (/crear): catálogo, validación y pintado en el Tap de muestra (canvas).
// Gemelo de src/app/taps/taps.estilo.ts (lo que pinta el feed): mismos ids y mismas reglas; estilo.test.mjs los compara.
// Nada de URLs ni HTML: ids de catálogo, colores #rrggbb y texto corto.

export const MARCOS = Object.freeze({ brillo: 'Brillo que gira', neon: 'Neón', arcoiris: 'Arcoíris', latido: 'Latido', destellos: 'Destellos', pixel: 'Píxel' });
export const PALETAS = Object.freeze({
  oceano: { nombre: 'Océano', colores: ['#1565C0', '#00838F', '#5E35B1', '#2E7D32'] },
  atardecer: { nombre: 'Atardecer', colores: ['#C62828', '#AD1457', '#BF360C', '#6A1B9A'] },
  bosque: { nombre: 'Bosque', colores: ['#33691E', '#00695C', '#795548', '#4E7A27'] },
  dulce: { nombre: 'Dulce', colores: ['#AD1457', '#7B1FA2', '#C2185B', '#0277BD'] },
  noche: { nombre: 'Noche', colores: ['#283593', '#4527A0', '#37474F', '#00695C'] },
  grafito: { nombre: 'Grafito', colores: ['#263238', '#37474F', '#455A64', '#546E7A'] },
});
export const LETRAS = Object.freeze({ redonda: 'Redonda', pixel: 'Píxel' });
/** Familia de cada letra (las @font-face están en disenador.css, con los mismos archivos que el feed). */
export const FAMILIA = Object.freeze({ redonda: "'Tap Redonda'", pixel: "'Tap Pixel'" });
export const PATRONES = Object.freeze({ puntos: 'Puntos', rayas: 'Rayas', cuadricula: 'Cuadrícula', ondas: 'Ondas' });
export const MUSICAS = Object.freeze({
  'pixel-quest-loop': 'Aventura pixelada', 'cave-quiz-crawl': 'Cueva y mina', 'magma-quest-loop': 'Nether', 'village-morning-loop': 'Mañana en la aldea',
  'island-quiz-loop': 'Playa', 'cozy-study-loop': 'Estudio tranquilo', 'puzzle-tick-loop': 'Lógica', 'wonder-loop': 'Asombro', 'orbit-quiz-drift': 'Espacio',
});
export const STICKERS = Object.freeze({
  estrella: { nombre: 'Estrella', d: 'M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z' },
  corazon: { nombre: 'Corazón', d: 'M12 20.5S3 15 3 8.8C3 6 5.2 4 7.7 4c1.8 0 3.3 1 4.3 2.4C13 5 14.5 4 16.3 4 18.8 4 21 6 21 8.8 21 15 12 20.5 12 20.5z' },
  rayo: { nombre: 'Rayo', d: 'M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.2z' },
  llama: { nombre: 'Llama', d: 'M12 2.5c1 3.5 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.4 2.6-5.7.2 1.7 1 2.9 2.2 3.4-.6-3.2-.1-6.2.7-8.7z' },
  corona: { nombre: 'Corona', d: 'M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11.5H5z' },
  trofeo: { nombre: 'Trofeo', d: 'M7 3h10v2h3.5v2.5A4.5 4.5 0 0 1 16.6 12 5 5 0 0 1 13 14.8V18h3.5v3h-9v-3H11v-3.2A5 5 0 0 1 7.4 12 4.5 4.5 0 0 1 3.5 7.5V5H7zm0 4H5.6a2.6 2.6 0 0 0 1.5 2.3zm10 0v2.3a2.6 2.6 0 0 0 1.5-2.3z' },
  cohete: { nombre: 'Cohete', d: 'M12 2c3.3 2.3 5 5.7 5 9.6l2.5 3.4-.8 4-3.6-2.2H8.9L5.3 19l-.8-4L7 11.6C7 7.7 8.7 4.3 12 2zm0 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM10.5 18.5h3L12 22z' },
  bombillo: { nombre: 'Bombillo', d: 'M12 2.5a6.5 6.5 0 0 1 3.8 11.8c-.6.5-.8 1.1-.8 1.8V17H9v-.9c0-.7-.2-1.3-.8-1.8A6.5 6.5 0 0 1 12 2.5zM9 18.5h6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' },
  nota: { nombre: 'Nota musical', d: 'M9 4.5 20 2v13.2a3.3 3.3 0 1 1-2-3V6.6l-7 1.6v9.4a3.3 3.3 0 1 1-2-3z' },
  diana: { nombre: 'Diana', d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 3.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z' },
  medalla: { nombre: 'Medalla', d: 'M6.5 2h4l1.5 4.2L13.5 2h4l-3 7.3a6 6 0 1 1-5 0zM12 11.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z' },
  pregunta: { nombre: 'Pregunta', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zm.2 4.3c-2.2 0-3.8 1.3-3.9 3.4h2.4c.1-.9.7-1.4 1.5-1.4s1.4.5 1.4 1.2c0 1.6-2.7 1.7-2.7 4.4v.6h2.4v-.4c0-1.8 2.8-2 2.8-4.7 0-1.9-1.6-3.1-3.9-3.1zM12 16a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z' },
  exclamacion: { nombre: 'Atención', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zM10.8 6l.3 8.2h1.8l.3-8.2zM12 15.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z' },
  check: { nombre: 'Correcto', d: 'M12 2.5a10 10 0 1 1 0 19 10 10 0 0 1 0-19zm4.4 5.7-5.7 5.9-3-3-1.8 1.8 4.8 4.7 7.5-7.6z' },
  nube: { nombre: 'Nube', d: 'M7.2 19A4.7 4.7 0 0 1 6.6 9.6 6 6 0 0 1 18 8.4 5.3 5.3 0 0 1 17.6 19z' },
  planeta: { nombre: 'Planeta', d: 'M12 5.5a6.5 6.5 0 0 1 6.4 5.3c2.4.6 3.8 1.6 3.6 2.6-.3 1.6-4.8 2-10 .9S2.5 11.4 2.8 9.8c.2-.8 1.5-1.2 3.4-1.1A6.5 6.5 0 0 1 12 5.5zm-6 9.4c1.6.6 3.6 1.1 5.6 1.4 2.2.4 4.3.5 5.9.3a6.5 6.5 0 0 1-11.5-1.7z' },
});
export const MAX_CAPAS = 6;
export const MAX_TEXTO_CAPA = 40;

const HEX = /^#[0-9a-f]{6}$/i;
const esObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, min, max, def) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const color = (v, def) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : def);
const de = (cat, v) => (typeof v === 'string' && Object.hasOwn(cat, v) ? v : undefined);

function fondoValido(v) {
  if (!esObj(v)) return undefined;
  const fuerza = num(v.fuerza, 0.1, 0.7, 0.35);
  if (v.tipo === 'color' && HEX.test(String(v.color))) return { tipo: 'color', color: color(v.color, ''), fuerza };
  if (v.tipo === 'degradado' && HEX.test(String(v.de)) && HEX.test(String(v.a))) return { tipo: 'degradado', de: color(v.de, ''), a: color(v.a, ''), angulo: Math.round(num(v.angulo, 0, 360, 180)), fuerza };
  const id = de(PATRONES, v.id);
  if (v.tipo === 'patron' && id) return { tipo: 'patron', id, color: color(v.color, '#ffffff'), fuerza };
  return undefined;
}
function capaValida(v) {
  if (!esObj(v)) return null;
  const base = { x: num(v.x, 0, 100, 50), y: num(v.y, 0, 100, 50), escala: num(v.escala, 0.5, 2.5, 1), giro: Math.round(num(v.giro, -45, 45, 0)), color: color(v.color, '#ffffff') };
  if (v.tipo === 'sticker') { const id = de(STICKERS, v.id); return id ? { tipo: 'sticker', id, ...base } : null; }
  if (v.tipo === 'texto' && typeof v.texto === 'string') {
    const texto = v.texto.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_TEXTO_CAPA);
    return texto ? { tipo: 'texto', texto, ...base } : null;
  }
  return null;
}
/** Lo que el feed sabe pintar; lo demás se descarta. Sin nada válido, null (el Tap se ve como siempre). */
export function validarEstilo(v) {
  if (!esObj(v)) return null;
  const capas = Array.isArray(v.capas) ? v.capas.slice(0, MAX_CAPAS).map(capaValida).filter(Boolean) : [];
  const e = { fondo: fondoValido(v.fondo), marco: de(MARCOS, v.marco), paleta: de(PALETAS, v.paleta), letra: de(LETRAS, v.letra), capas: capas.length ? capas : undefined, musica: de(MUSICAS, v.musica) };
  for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
  return Object.keys(e).length ? e : null;
}

// Sitios donde caen los textos y stickers nuevos (% de la zona del mundo), en orden; el giro alterna para que no se vea en rejilla.
const SITIOS = [[50, 32, -4], [18, 42, -10], [82, 42, 10], [28, 76, 6], [72, 76, -6], [50, 52, 0]];
/** La capa siguiente en el primer sitio libre (null si ya hay MAX_CAPAS). */
export function capaNueva(capas, tipo, valor, colorCapa) {
  const lista = capas ?? [];
  if (lista.length >= MAX_CAPAS) return null;
  const libre = SITIOS.find(([x, y]) => !lista.some(c => c.x === x && c.y === y)) ?? SITIOS[lista.length];
  const [x, y, giro] = libre;
  return capaValida(tipo === 'sticker' ? { tipo, id: valor, x, y, giro, escala: 1.1, color: colorCapa } : { tipo, texto: valor, x, y, giro, escala: 1, color: colorCapa });
}

/** Tinte del fondo encima del escenario (canvas): color, degradado o patrón con su opacidad. */
export function pintarFondo(g, f, W, H) {
  if (!f) return;
  g.save(); g.globalAlpha = f.fuerza;
  if (f.tipo === 'color') g.fillStyle = f.color;
  else if (f.tipo === 'degradado') {
    const r = (f.angulo - 90) * Math.PI / 180, dx = Math.cos(r) * W / 2, dy = Math.sin(r) * H / 2;
    const gr = g.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy); gr.addColorStop(0, f.de); gr.addColorStop(1, f.a); g.fillStyle = gr;
  } else {
    const t = 12, c = g.canvas.ownerDocument.createElement('canvas'); c.width = c.height = t; const p = c.getContext('2d'); p.fillStyle = p.strokeStyle = f.color;
    if (f.id === 'puntos') { p.beginPath(); p.arc(t / 2, t / 2, 1.3, 0, Math.PI * 2); p.fill(); }
    else if (f.id === 'rayas') { p.lineWidth = 3; p.beginPath(); p.moveTo(-2, t + 2); p.lineTo(t + 2, -2); p.stroke(); }
    else if (f.id === 'cuadricula') { p.fillRect(0, 0, t, 1); p.fillRect(0, 0, 1, t); }
    else { p.lineWidth = 1.5; p.beginPath(); p.arc(t / 2, t, 5, Math.PI, 0); p.stroke(); }
    g.fillStyle = g.createPattern(c, 'repeat');
  }
  g.fillRect(0, 0, W, H); g.restore();
}
const trazos = new Map();
/** Textos y stickers sobre la zona del mundo (ancho W, alto ZH). `k` = escala del lienzo frente al feed (≈ W / 400). */
export function pintarCapas(g, capas, W, ZH, k, familia) {
  for (const c of capas ?? []) {
    g.save(); g.translate(c.x / 100 * W, c.y / 100 * ZH); g.rotate(c.giro * Math.PI / 180); g.scale(c.escala * k, c.escala * k);
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowOffsetY = 2; g.fillStyle = c.color;
    if (c.tipo === 'sticker') {
      let p = trazos.get(c.id); if (!p) trazos.set(c.id, p = new Path2D(STICKERS[c.id].d));
      g.scale(46 / 24, 46 / 24); g.translate(-12, -12); g.fill(p);
    } else { g.font = `900 23px ${familia}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.texto, 0, 0); }
    g.restore();
  }
}
