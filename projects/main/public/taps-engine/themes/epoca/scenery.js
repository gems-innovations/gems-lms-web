// Tema «época» · escenarios dibujados con Canvas 2D. Cada mundo se pinta UNA vez en un lienzo (el renderizador lo cachea) y
// solo el ambiente (polvo, luz de vela) se anima por encima. Mismo contrato que el tema «estudio» (paintWorld, paintAmbient,
// paintClima, paintFauna, GROUND_Y) para que el renderizador sea intercambiable.
//
// Un mundo nuevo es una función corta: pinta pared/cielo hasta el horizonte (GROUND_Y · alto) y piso por debajo; el
// personaje se para en esa línea. `side` (1 o -1) es el lado libre donde va el decorado; el presentador queda al otro.

export const GROUND_Y = 0.5;                         // línea del piso como fracción del alto

/** Aleatorio determinista (mulberry32): el grano y los detalles son iguales en cada carga. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const glow = (c, x, y, r, color, a) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
};
function vignette(c, w, h, strength) {
  const g = c.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.28, w / 2, h * 0.42, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(8,6,10,${strength})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function grain(c, w, h, seed, amount) {                 // grano de película (puntos sueltos, una sola vez)
  const r = rng(seed), n = Math.round(w * h / 90);
  for (let i = 0; i < n; i++) { c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${amount})` : `rgba(0,0,0,${amount})`; c.fillRect(r() * w, r() * h, 1.2, 1.2); }
}

// ───────────────────────── Londres, 1803: taller de grabado ─────────────────────────
function caricatura(c, x, y, k, flip) {                // un dibujo satírico en un pliego: cabezón con bicornio
  c.save(); c.translate(x, y); c.scale(flip * k, k);
  c.strokeStyle = '#3c2e22'; c.fillStyle = '#3c2e22'; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(0, -8, 11, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(-16, -16); c.quadraticCurveTo(0, -30, 16, -16); c.quadraticCurveTo(0, -20, -16, -16); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-3, -9); c.lineTo(-3, -7); c.moveTo(4, -9); c.lineTo(4, -7); c.moveTo(-4, -2); c.quadraticCurveTo(0, 1, 4, -2); c.stroke();
  c.beginPath(); c.moveTo(0, 3); c.lineTo(0, 22); c.moveTo(-10, 10); c.lineTo(10, 10); c.moveTo(0, 22); c.lineTo(-7, 36); c.moveTo(0, 22); c.lineTo(7, 36); c.stroke();
  c.restore();
}
function enmarcar(c, x, y, w, h, k, flip) {
  c.fillStyle = '#1d140e'; c.fillRect(x - 5, y - 5, w + 10, h + 10);
  c.fillStyle = '#d9ccaa'; c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(120,90,50,.18)'; c.fillRect(x, y + h * 0.62, w, h * 0.38);          // mancha de humedad
  caricatura(c, x + w / 2, y + h * 0.5, k, flip);
  c.strokeStyle = 'rgba(60,46,34,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y + h - 8); c.lineTo(x + w - 6, y + h - 8); c.stroke();
}
function ventana(c, x, y, w, h, seed) {                  // ventana con el atardecer sobre los tejados de Londres
  c.fillStyle = '#16100c'; c.fillRect(x - 8, y - 8, w + 16, h + 16);
  c.fillStyle = lin(c, 0, y, 0, y + h, [[0, '#2f4a78'], [0.55, '#b9785a'], [1, '#e9a860']]); c.fillRect(x, y, w, h);
  const r = rng(seed); c.fillStyle = '#1a1722';
  let px = x;
  while (px < x + w) {                                   // tejados y chimeneas en silueta
    const bw = 14 + r() * 22, bh = h * (0.18 + r() * 0.22);
    c.fillRect(px, y + h - bh, bw, bh);
    if (r() < 0.6) c.fillRect(px + bw * 0.3, y + h - bh - 9, 4, 9);
    px += bw;
  }
  c.fillStyle = 'rgba(255,200,110,.85)'; for (let i = 0; i < 6; i++) c.fillRect(x + 6 + r() * (w - 12), y + h - 4 - r() * h * 0.28, 2, 2.6);
  c.strokeStyle = '#16100c'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y + h * 0.5); c.stroke();
  c.fillStyle = 'rgba(255,190,120,.10)'; c.beginPath(); c.moveTo(x + w * 0.1, y + h); c.lineTo(x + w * 0.4, y + h); c.lineTo(x - w * 0.2, y + h * 2.2); c.lineTo(x - w * 0.9, y + h * 2.2); c.closePath(); c.fill();
}
function mesaDeDibujo(c, x, base, w, h) {                // mesa inclinada con pliegos, tintero y vela
  c.fillStyle = '#2a1a10'; c.fillRect(x + 6, base - h * 0.62, 7, h * 0.62); c.fillRect(x + w - 13, base - h * 0.62, 7, h * 0.62);
  c.fillStyle = '#4a3020'; c.beginPath(); c.moveTo(x, base - h * 0.62); c.lineTo(x + w, base - h * 0.62); c.lineTo(x + w - 8, base - h * 0.5); c.lineTo(x + 8, base - h * 0.5); c.closePath(); c.fill();
  c.fillStyle = '#e4d9bd'; c.beginPath(); c.moveTo(x + w * 0.12, base - h * 0.64); c.lineTo(x + w * 0.62, base - h * 0.64); c.lineTo(x + w * 0.58, base - h * 0.54); c.lineTo(x + w * 0.1, base - h * 0.54); c.closePath(); c.fill();
  c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + w * 0.18, base - h * 0.58); c.quadraticCurveTo(x + w * 0.3, base - h * 0.68, x + w * 0.4, base - h * 0.57); c.stroke();
  c.fillStyle = '#0f0f14'; c.fillRect(x + w * 0.72, base - h * 0.7, 9, 9);                                  // tintero
  c.fillStyle = '#e8dfc6'; c.fillRect(x + w * 0.86, base - h * 0.86, 6, 22);                                // vela
  c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(x + w * 0.86 + 3, base - h * 0.9, 3.4, 6, 0, 0, Math.PI * 2); c.fill();
  return [x + w * 0.86 + 3, base - h * 0.9];
}
function londres(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#2e231d'], [1, '#4a382c']]); c.fillRect(0, 0, w, gy);
  c.fillStyle = 'rgba(0,0,0,.14)'; for (let x = 0; x < w; x += 26) c.fillRect(x, 0, 12, gy);            // papel pintado a rayas
  c.fillStyle = '#2a1d15'; c.fillRect(0, gy - 22, w, 22); c.fillStyle = '#4a3425'; c.fillRect(0, gy - 24, w, 3);   // zócalo
  const vx = side > 0 ? w * 0.06 : w * 0.64, vw = w * 0.3;                                                   // la ventana, del lado del decorado
  ventana(c, vx, gy * 0.2, vw, gy * 0.42, 11);
  const px = side > 0 ? w * 0.4 : w * 0.06;
  enmarcar(c, px, gy * 0.22, w * 0.17, gy * 0.26, 0.9, 1);
  enmarcar(c, px + w * 0.21, gy * 0.3, w * 0.13, gy * 0.2, 0.7, -1);
  enmarcar(c, px + w * 0.06, gy * 0.56, w * 0.14, gy * 0.18, 0.6, 1);
  // piso de tablones
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#33231a'], [1, '#1a110c']]); c.fillRect(0, gy, w, h - gy);
  const r = rng(7);
  for (let y = gy + 2, i = 0; y < h; y += 14 + i * 1.6, i++) {
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y, w, 2);
    for (let x = -((i * 53) % 90); x < w; x += 90 + r() * 40) c.fillRect(x, y, 2, 14 + i * 1.6);
    c.fillStyle = `rgba(255,190,120,${0.02 + r() * 0.03})`; c.fillRect(0, y + 3, w, 4);
  }
  const mx = side > 0 ? w * 0.6 : w * 0.04, flame = mesaDeDibujo(c, mx, gy + 10, w * 0.34, gy * 0.74);
  glow(c, flame[0], flame[1], Math.max(w, h) * 0.5, 'rgba(255,176,90,A)', 0.42);
  glow(c, w * 0.5, gy * 0.5, w * 0.7, 'rgba(255,170,100,A)', 0.07);
  vignette(c, w, h, 0.5); grain(c, w, h, 3, 0.05);
}

// ───────────────────────── Egipto: excavación al atardecer ─────────────────────────
function piramide(c, x, base, w, h, luz, sombra) {
  c.fillStyle = luz; c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x, base - h); c.lineTo(x + w * 0.08, base); c.closePath(); c.fill();
  c.fillStyle = sombra; c.beginPath(); c.moveTo(x, base - h); c.lineTo(x + w / 2, base); c.lineTo(x + w * 0.08, base); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(80,45,25,.18)'; c.lineWidth = 1;
  for (let i = 1; i < 9; i++) { const f = i / 9, yy = base - h * f; c.beginPath(); c.moveTo(x - w / 2 * (1 - f), yy); c.lineTo(x + w / 2 * (1 - f), yy); c.stroke(); }
}
function palmera(c, x, base, k, seed) {
  const r = rng(seed); c.strokeStyle = '#4a3a22'; c.lineWidth = 7 * k; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + 14 * k, base - 60 * k, x + 4 * k, base - 120 * k); c.stroke();
  c.strokeStyle = '#3c5a30'; c.lineWidth = 4 * k;
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.42 + (r() - 0.5) * 0.1, len = (52 + r() * 22) * k; c.beginPath(); c.moveTo(x + 4 * k, base - 120 * k); c.quadraticCurveTo(x + 4 * k + Math.cos(a) * len * 0.6, base - 120 * k + Math.sin(a) * len * 0.6 - 14 * k, x + 4 * k + Math.cos(a) * len, base - 120 * k + Math.sin(a) * len + 18 * k); c.stroke(); }
}
function egipto(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#7fa3c4'], [0.35, '#e8c795'], [0.8, '#f1c58a'], [1, '#f2d4a0']]); c.fillRect(0, 0, w, gy);
  const sx = side > 0 ? w * 0.74 : w * 0.26;
  glow(c, sx, gy * 0.7, w * 0.8, 'rgba(255,230,170,A)', 0.8);
  c.fillStyle = '#fff4d4'; c.beginPath(); c.arc(sx, gy * 0.7, w * 0.07, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(180,120,80,.35)'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= w; x += 10) c.lineTo(x, gy - 18 - 10 * Math.sin(x * 0.015)); c.lineTo(w, gy); c.closePath(); c.fill();      // dunas lejanas
  const lz = side > 0 ? '#d79d63' : '#c98f58', sm = side > 0 ? '#a86c3e' : '#b87a48';
  piramide(c, w * 0.3, gy - 6, w * 0.58, gy * 0.64, '#d9a36a', '#a56a3c');
  piramide(c, w * 0.72, gy - 4, w * 0.4, gy * 0.42, lz, sm);
  c.fillStyle = 'rgba(240,200,150,.4)'; c.fillRect(0, gy - 14, w, 14);                                          // calina del horizonte
  // suelo de arena y cuadrícula de excavación en perspectiva
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#d5a566'], [0.5, '#b98450'], [1, '#7c5230']]); c.fillRect(0, gy, w, h - gy);
  const r = rng(5); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,235,190' : '90,55,30'},${0.05 + r() * 0.08})`; const y = gy + r() * (h - gy); c.fillRect(r() * w, y, 2 + r() * 8, 1.5); }
  const vpx = w / 2; c.strokeStyle = 'rgba(80,50,28,.55)'; c.lineWidth = 2;
  for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(vpx + i * w * 0.06, gy + 6); c.lineTo(vpx + i * w * 0.5, h); c.stroke(); }
  for (let i = 1; i < 5; i++) { const y = gy + (h - gy) * (i * i / 25); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillStyle = '#6a4a28'; for (const [x, y] of [[vpx - w * 0.2, gy + 8], [vpx + w * 0.2, gy + 8]]) c.fillRect(x - 2, y - 20, 4, 24);        // estacas
  const cx = side > 0 ? w * 0.78 : w * 0.06;                                                                  // cajón, pala y palmera del lado del decorado
  c.fillStyle = '#7a5530'; c.fillRect(cx, gy + 4, w * 0.16, 40); c.fillStyle = '#5a3c20'; c.fillRect(cx, gy + 4, w * 0.16, 6); c.fillRect(cx + w * 0.07, gy + 4, 4, 40);
  c.strokeStyle = '#5a3c20'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + w * 0.2, gy + 44); c.lineTo(cx + w * 0.26, gy - 26); c.stroke();
  c.fillStyle = '#8a8a8a'; c.beginPath(); c.moveTo(cx + w * 0.22, gy + 44); c.lineTo(cx + w * 0.19, gy + 64); c.lineTo(cx + w * 0.27, gy + 62); c.lineTo(cx + w * 0.26, gy + 42); c.closePath(); c.fill();
  palmera(c, side > 0 ? w * 0.9 : w * 0.1, gy + 4, w / 420, 3);
  glow(c, sx, gy * 0.9, w * 0.9, 'rgba(255,150,80,A)', 0.16);
  vignette(c, w, h, 0.5); grain(c, w, h, 9, 0.04);
}

const WORLDS = { 'taller-londres': londres, 'excavacion-egipto': egipto };
export const WORLD_NAMES = Object.freeze(Object.keys(WORLDS));

/** Pinta un mundo en el lienzo `c` (w × h). Los argumentos extra (props, hora) se reservan para mundos con variantes. */
export function paintWorld(c, w, h, world, _sceneColors = {}, _props = null, side = 1, _hora = null) {
  (WORLDS[world] || londres)(c, w, h, side);
}

/** Ambiente animado (cada fotograma, por encima del fondo): polvo a contraluz y parpadeo de la vela. */
export function paintAmbient(c, w, h, world, T) {
  const gy = h * GROUND_Y;
  if (world === 'excavacion-egipto') {
    c.fillStyle = 'rgba(255,225,170,.5)';
    for (let i = 0; i < 26; i++) { const sp = 12 + (i * 7) % 22, x = ((i * 97 + T * sp) % (w + 40)) - 20, y = gy * 0.3 + ((i * 53) % Math.round(h * 0.55)) + Math.sin(T * 0.8 + i) * 6; c.fillRect(x, y, 1.6, 1.6); }
  } else {
    const f = 0.045 + 0.02 * Math.sin(T * 9.1) + 0.012 * Math.sin(T * 23.7);
    c.fillStyle = `rgba(255,170,90,${f})`; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,214,150,.45)';
    for (let i = 0; i < 18; i++) { const x = (i * 71 + 30) % w + Math.sin(T * 0.3 + i) * 12, y = ((i * 43 + 20 + T * (3 + i % 4)) % (h * 0.62)); c.fillRect(x, y, 1.5, 1.5); }
  }
}
export function paintClima() {}
export function paintFauna() {}
