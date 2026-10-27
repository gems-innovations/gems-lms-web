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

// ───────────────────────── Roma: el foro al mediodía ─────────────────────────
function columna(c, x, base, w, h) {
  c.fillStyle = lin(c, x, 0, x + w, 0, [[0, '#cdbd9c'], [0.5, '#efe3c6'], [1, '#b8a888']]); c.fillRect(x, base - h, w, h);
  c.fillStyle = '#d9caa6'; c.fillRect(x - 6, base - h - 10, w + 12, 10); c.fillRect(x - 6, base - 8, w + 12, 8);
  c.strokeStyle = 'rgba(90,70,40,.22)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + w * i / 4, base - h); c.lineTo(x + w * i / 4, base - 8); c.stroke(); }
}
function roma(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#6fa3d0'], [1, '#cfe3ee']]); c.fillRect(0, 0, w, gy);
  glow(c, side > 0 ? w * 0.8 : w * 0.2, gy * 0.2, w * 0.6, 'rgba(255,245,210,A)', 0.55);
  c.fillStyle = '#d8c9a4'; c.fillRect(0, gy * 0.36, w, gy * 0.64);                                             // muro del foro
  c.fillStyle = '#c8b890'; c.fillRect(0, gy * 0.36, w, 10);
  c.fillStyle = '#7ea4c8'; for (let i = 0; i < 3; i++) { const ax = w * (0.1 + i * 0.32), aw = w * 0.22; c.beginPath(); c.moveTo(ax, gy); c.lineTo(ax, gy * 0.62); c.quadraticCurveTo(ax + aw / 2, gy * 0.4, ax + aw, gy * 0.62); c.lineTo(ax + aw, gy); c.closePath(); c.fill(); }   // arcos con cielo
  for (const x of [w * 0.04, w * 0.36, w * 0.68, w * 0.94]) columna(c, x - 14, gy, 28, gy * 0.8);
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#cfc2a3'], [1, '#8c7e62']]); c.fillRect(0, gy, w, h - gy);
  c.strokeStyle = 'rgba(70,55,35,.3)'; c.lineWidth = 1.5; for (let i = 1; i < 6; i++) { const y = gy + (h - gy) * (i * i / 36); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(w / 2 + i * w * 0.05, gy); c.lineTo(w / 2 + i * w * 0.45, h); c.stroke(); }
  vignette(c, w, h, 0.38); grain(c, w, h, 21, 0.035);
}

// ───────────────────────── Edad Media: sala de piedra ─────────────────────────
function antorchaPared(c, x, y) {
  c.fillStyle = '#3a2a1c'; c.fillRect(x - 3, y, 6, 26); c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(x, y - 8, 8, 14, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(x, y - 6, 4, 8, 0, 0, Math.PI * 2); c.fill();
  glow(c, x, y - 8, 120, 'rgba(255,170,80,A)', 0.4);
}
function medieval(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = '#4d4a48'; c.fillRect(0, 0, w, gy);
  const r = rng(31); for (let y = 0, i = 0; y < gy; y += 30, i++) for (let x = -(i % 2) * 40; x < w; x += 80) { const v = 62 + r() * 24 | 0; c.fillStyle = `rgb(${v + 4},${v + 1},${v - 2})`; c.fillRect(x + 2, y + 2, 76, 26); }
  const tx = side > 0 ? w * 0.12 : w * 0.62; c.fillStyle = '#7a2a2a'; c.fillRect(tx, gy * 0.12, w * 0.26, gy * 0.5); c.fillStyle = '#c8a24a'; c.fillRect(tx, gy * 0.12, w * 0.26, 8); c.fillRect(tx, gy * 0.62 - 8, w * 0.26, 8);   // tapiz
  c.fillStyle = '#c8a24a'; c.beginPath(); c.arc(tx + w * 0.13, gy * 0.37, w * 0.06, 0, Math.PI * 2); c.fill(); c.fillStyle = '#7a2a2a'; c.beginPath(); c.arc(tx + w * 0.13, gy * 0.37, w * 0.04, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#15130f'; const vx = side > 0 ? w * 0.62 : w * 0.18; c.beginPath(); c.moveTo(vx, gy * 0.7); c.lineTo(vx, gy * 0.3); c.quadraticCurveTo(vx + w * 0.07, gy * 0.14, vx + w * 0.14, gy * 0.3); c.lineTo(vx + w * 0.14, gy * 0.7); c.closePath(); c.fill();   // ventana ojival
  c.fillStyle = lin(c, 0, gy * 0.3, 0, gy * 0.7, [[0, '#3e5f8c'], [1, '#d99a62']]); c.beginPath(); c.moveTo(vx + 6, gy * 0.7); c.lineTo(vx + 6, gy * 0.31); c.quadraticCurveTo(vx + w * 0.07, gy * 0.17, vx + w * 0.14 - 6, gy * 0.31); c.lineTo(vx + w * 0.14 - 6, gy * 0.7); c.closePath(); c.fill();
  antorchaPared(c, w * 0.5, gy * 0.42); 
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#4a3a2c'], [1, '#231a12']]); c.fillRect(0, gy, w, h - gy);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; for (let y = gy + 6, i = 0; y < h; y += 16 + i * 2, i++) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  vignette(c, w, h, 0.55); grain(c, w, h, 41, 0.05);
}

// ───────────────────────── Laboratorio moderno ─────────────────────────
function laboratorioModerno(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#dfe7ee'], [1, '#c5d2de']]); c.fillRect(0, 0, w, gy);
  c.fillStyle = '#a9bccd'; c.fillRect(0, gy - 20, w, 20);
  const sx = side > 0 ? w * 0.06 : w * 0.56; c.fillStyle = '#8aa0b4'; c.fillRect(sx, gy * 0.2, w * 0.38, 6); c.fillRect(sx, gy * 0.42, w * 0.38, 6);                       // estantes
  const r = rng(51); for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) { const col = ['#3a9e7a', '#3a74c4', '#c8453f', '#d9962b'][(i + k) % 4], bx = sx + 10 + i * w * 0.06, by = gy * (k ? 0.42 : 0.2); c.fillStyle = col; c.fillRect(bx, by - 26 - r() * 10, 14, 26); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(bx + 3, by - 22, 3, 16); }
  const px = side > 0 ? w * 0.56 : w * 0.06; c.fillStyle = '#f4f7fa'; c.fillRect(px, gy * 0.14, w * 0.36, gy * 0.42); c.strokeStyle = '#8aa0b4'; c.lineWidth = 4; c.strokeRect(px, gy * 0.14, w * 0.36, gy * 0.42);   // pizarra con fórmulas
  c.strokeStyle = '#3a74c4'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 16, gy * 0.26); c.lineTo(px + w * 0.2, gy * 0.26); c.moveTo(px + 16, gy * 0.34); c.quadraticCurveTo(px + w * 0.12, gy * 0.24, px + w * 0.3, gy * 0.4); c.stroke();
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#b8c4cf'], [1, '#7e8c99']]); c.fillRect(0, gy, w, h - gy);
  c.fillStyle = '#5f6e7c'; c.fillRect(0, gy, w, 12); c.fillStyle = '#e8eef3'; c.fillRect(0, gy - 2, w, 4);
  c.strokeStyle = 'rgba(40,55,70,.2)'; c.lineWidth = 1.5; for (let i = 1; i < 7; i++) { const y = gy + (h - gy) * (i * i / 49); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  vignette(c, w, h, 0.28); grain(c, w, h, 61, 0.03);
}

// ───────────────────────── Biblioteca: estanterías hasta el techo ─────────────────────────
function estanteria(c, x, y, w, h, seed) {
  const r = rng(seed);
  c.fillStyle = '#3a2618'; c.fillRect(x, y, w, h);
  const filas = Math.max(2, Math.round(h / 34));
  for (let f = 0; f < filas; f++) {
    const fy = y + f * (h / filas), fh = h / filas;
    c.fillStyle = '#2a1a10'; c.fillRect(x, fy + fh - 4, w, 4);                                   // tabla del estante
    let bx = x + 3;
    while (bx < x + w - 6) {                                                                     // lomos de libros, cada uno distinto
      const bw = 5 + r() * 7, bh = fh * (0.62 + r() * 0.3), tono = ['#7a3b2e', '#4a5a7a', '#8a6a2a', '#3e6a4a', '#6a3a5a', '#b89a6a'][(r() * 6) | 0];
      c.fillStyle = tono; c.fillRect(bx, fy + fh - 4 - bh, bw, bh);
      c.fillStyle = 'rgba(255,230,180,.35)'; c.fillRect(bx + bw * 0.3, fy + fh - 4 - bh * 0.75, Math.max(1, bw * 0.3), 1.5);
      bx += bw + 1.2;
    }
  }
  c.fillStyle = '#2a1a10'; c.fillRect(x - 3, y - 6, w + 6, 6);
}
function lampara(c, x, y) {                                 // lámpara de lectura con pantalla verde
  c.fillStyle = '#b89a6a'; c.fillRect(x - 2, y, 4, 34); c.fillRect(x - 12, y + 34, 24, 4);
  c.fillStyle = '#2f6a4a'; c.beginPath(); c.moveTo(x - 22, y + 2); c.lineTo(x + 22, y + 2); c.lineTo(x + 14, y - 12); c.lineTo(x - 14, y - 12); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,230,160,.9)'; c.fillRect(x - 18, y + 1, 36, 2.5);
  glow(c, x, y + 10, 120, 'rgba(255,220,140,A)', 0.34);
}
function biblioteca(c, w, h, side) {
  const gy = h * GROUND_Y;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#2b1f17'], [1, '#43302a']]); c.fillRect(0, 0, w, gy);
  estanteria(c, -4, gy * 0.04, w * 0.44, gy * 0.92, 71);
  estanteria(c, w * 0.6, gy * 0.04, w * 0.44, gy * 0.92, 72);
  // ventana alta entre las estanterías: luz lechosa que cae en diagonal sobre el piso
  const vx = w * 0.46, vw = w * 0.1;
  c.fillStyle = '#1d140e'; c.fillRect(vx - 4, gy * 0.08, vw + 8, gy * 0.42);
  c.fillStyle = lin(c, 0, gy * 0.08, 0, gy * 0.5, [[0, '#cfd9df'], [1, '#e7d9b8']]); c.fillRect(vx, gy * 0.1, vw, gy * 0.38);
  c.strokeStyle = '#1d140e'; c.lineWidth = 3; c.beginPath(); c.moveTo(vx + vw / 2, gy * 0.1); c.lineTo(vx + vw / 2, gy * 0.48); c.moveTo(vx, gy * 0.29); c.lineTo(vx + vw, gy * 0.29); c.stroke();
  c.fillStyle = 'rgba(255,240,210,.09)'; c.beginPath(); c.moveTo(vx, gy * 0.48); c.lineTo(vx + vw, gy * 0.48); c.lineTo(vx + vw * 2.6, h); c.lineTo(vx - vw * 1.6, h); c.closePath(); c.fill();
  // escalera de biblioteca apoyada del lado del decorado
  const ex = side > 0 ? w * 0.7 : w * 0.22; c.strokeStyle = '#8a6a3a'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(ex, gy + 6); c.lineTo(ex + w * 0.05, gy * 0.12); c.moveTo(ex + w * 0.06, gy + 6); c.lineTo(ex + w * 0.11, gy * 0.12); c.stroke();
  c.lineWidth = 3; for (let i = 1; i < 8; i++) { const t = i / 8; c.beginPath(); c.moveTo(ex + w * 0.05 * t, gy + 6 - (gy + 6 - gy * 0.12) * t); c.lineTo(ex + w * 0.06 + w * 0.05 * t, gy + 6 - (gy + 6 - gy * 0.12) * t); c.stroke(); }
  // piso de tablones oscuros con una alfombra
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#3a2a1c'], [1, '#1c130d']]); c.fillRect(0, gy, w, h - gy);
  const r = rng(73); c.fillStyle = 'rgba(0,0,0,.3)'; for (let y = gy + 2, i = 0; y < h; y += 15 + i * 1.5, i++) { c.fillRect(0, y, w, 2); for (let x = -((i * 61) % 80); x < w; x += 80 + r() * 50) c.fillRect(x, y, 2, 15 + i * 1.5); }
  c.fillStyle = '#6a2e2e'; c.beginPath(); c.moveTo(w * 0.22, gy + 14); c.lineTo(w * 0.78, gy + 14); c.lineTo(w * 0.96, h); c.lineTo(w * 0.04, h); c.closePath(); c.fill();
  c.fillStyle = 'rgba(200,160,80,.5)'; c.beginPath(); c.moveTo(w * 0.26, gy + 22); c.lineTo(w * 0.74, gy + 22); c.lineTo(w * 0.9, h - 6); c.lineTo(w * 0.1, h - 6); c.closePath(); c.fill();
  c.fillStyle = '#6a2e2e'; c.beginPath(); c.moveTo(w * 0.3, gy + 30); c.lineTo(w * 0.7, gy + 30); c.lineTo(w * 0.84, h - 12); c.lineTo(w * 0.16, h - 12); c.closePath(); c.fill();
  // mesita con lámpara del lado del decorado
  const mx = side > 0 ? w * 0.82 : w * 0.18;
  c.fillStyle = '#3a2618'; c.fillRect(mx - w * 0.08, gy + 18, w * 0.16, 6); c.fillRect(mx - w * 0.06, gy + 24, 5, 40); c.fillRect(mx + w * 0.06 - 5, gy + 24, 5, 40);
  lampara(c, mx, gy - 20);
  glow(c, w * 0.5, gy * 0.4, w * 0.6, 'rgba(255,220,160,A)', 0.06);
  vignette(c, w, h, 0.52); grain(c, w, h, 75, 0.045);
}

// ───────────────────────── Observatorio: cúpula en la colina ─────────────────────────
function cupula(c, x, base, rw, k) {
  c.fillStyle = '#d9dde3'; c.fillRect(x - rw, base - rw * 1.1, rw * 2, rw * 1.1);                 // torre
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + rw * 0.35, base - rw * 1.1, rw * 0.65, rw * 1.1);
  c.fillStyle = '#b8c2cc'; c.beginPath(); c.arc(x, base - rw * 1.1, rw * 1.08, Math.PI, 0); c.closePath(); c.fill();   // cúpula
  c.fillStyle = '#3a4656'; c.beginPath(); c.moveTo(x - rw * 0.14, base - rw * 1.1); c.lineTo(x - rw * 0.14, base - rw * 2.1); c.quadraticCurveTo(x, base - rw * 2.2, x + rw * 0.14, base - rw * 2.1); c.lineTo(x + rw * 0.14, base - rw * 1.1); c.closePath(); c.fill();   // ranura abierta
  c.strokeStyle = '#4a5a6a'; c.lineWidth = 3 * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - rw * 0.02, base - rw * 1.3); c.lineTo(x + rw * 0.18, base - rw * 2.0); c.stroke();  // telescopio asomando
  c.fillStyle = '#5a4a3a'; c.fillRect(x - rw * 0.22, base - rw * 0.5, rw * 0.44, rw * 0.5);                  // puerta
  c.strokeStyle = 'rgba(60,70,90,.35)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x - rw, base - rw * 1.1 * i / 4); c.lineTo(x + rw, base - rw * 1.1 * i / 4); c.stroke(); }
}
function observatorio(c, w, h, side) {
  const gy = h * GROUND_Y, k = w / 420;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#5b7fb8'], [0.6, '#a9c4de'], [1, '#e2e8ec']]); c.fillRect(0, 0, w, gy);
  const r = rng(81); c.fillStyle = 'rgba(255,255,255,.55)';                                                       // nubes finas
  for (let i = 0; i < 5; i++) { const cx = r() * w, cy = gy * (0.1 + r() * 0.35), cw = w * (0.12 + r() * 0.16); c.beginPath(); c.ellipse(cx, cy, cw, cw * 0.18, 0, 0, Math.PI * 2); c.fill(); }
  // colinas lejanas y la cúpula del lado del decorado
  c.fillStyle = '#6a8a6a'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= w; x += 8) c.lineTo(x, gy - 30 * k - 22 * k * Math.sin(x * 0.012 + 1.2)); c.lineTo(w, gy); c.closePath(); c.fill();
  cupula(c, side > 0 ? w * 0.74 : w * 0.26, gy - 24 * k, w * 0.13, k);
  c.fillStyle = '#4f7a4f'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= w; x += 8) c.lineTo(x, gy - 10 * k - 8 * k * Math.sin(x * 0.03)); c.lineTo(w, gy); c.closePath(); c.fill();
  // pradera con sendero de piedra y un telescopio pequeño en trípode del lado libre
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#5e8a4e'], [1, '#2f4a2a']]); c.fillRect(0, gy, w, h - gy);
  for (let i = 0; i < 180; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '200,230,150' : '30,60,30'},${0.08 + r() * 0.1})`; c.fillRect(r() * w, gy + r() * (h - gy), 2, 4 + r() * 5); }
  c.fillStyle = '#9a9a8a'; for (let i = 0; i < 7; i++) { const t = i / 7, y = gy + 8 + (h - gy - 16) * t * t, pw = w * (0.08 + 0.2 * t); c.beginPath(); c.ellipse(w / 2 + (side > 0 ? -1 : 1) * w * 0.12 * t, y, pw / 2, 4 + 8 * t, 0, 0, Math.PI * 2); c.fill(); }
  const tx = side > 0 ? w * 0.84 : w * 0.16;
  c.strokeStyle = '#3a3a44'; c.lineWidth = 3 * k; c.lineCap = 'round';
  c.beginPath(); c.moveTo(tx, gy + 20 * k); c.lineTo(tx - 16 * k, gy + 70 * k); c.moveTo(tx, gy + 20 * k); c.lineTo(tx + 16 * k, gy + 70 * k); c.moveTo(tx, gy + 20 * k); c.lineTo(tx + 2 * k, gy + 66 * k); c.stroke();
  c.strokeStyle = '#8a7a5a'; c.lineWidth = 7 * k; c.beginPath(); c.moveTo(tx - 10 * k, gy + 26 * k); c.lineTo(tx + 20 * k, gy - 14 * k); c.stroke();
  glow(c, side > 0 ? w * 0.2 : w * 0.8, gy * 0.18, w * 0.5, 'rgba(255,250,230,A)', 0.4);
  vignette(c, w, h, 0.36); grain(c, w, h, 83, 0.035);
}

// ───────────────────────── Aula: pizarra y pupitres ─────────────────────────
function pupitre(c, x, base, k) {
  c.fillStyle = '#5a3a22'; c.fillRect(x - 26 * k, base - 36 * k, 52 * k, 6 * k);
  c.fillStyle = '#7a5232'; c.fillRect(x - 24 * k, base - 38 * k, 48 * k, 4 * k);
  c.fillStyle = '#3a3a44'; c.fillRect(x - 22 * k, base - 30 * k, 3 * k, 30 * k); c.fillRect(x + 19 * k, base - 30 * k, 3 * k, 30 * k);
  c.fillStyle = '#e8e2d2'; c.fillRect(x - 12 * k, base - 41 * k, 18 * k, 4 * k);                                  // cuaderno
}
function aula(c, w, h, side) {
  const gy = h * GROUND_Y, k = w / 420;
  c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#e9e2cc'], [1, '#d7cdb0']]); c.fillRect(0, 0, w, gy);
  c.fillStyle = '#7a8a6a'; c.fillRect(0, gy * 0.72, w, gy * 0.28); c.fillStyle = '#5a6a4a'; c.fillRect(0, gy * 0.72, w, 4);         // media pared verde
  // pizarra del lado del decorado, con tiza
  const px = side > 0 ? w * 0.08 : w * 0.5, pw = w * 0.42, py = gy * 0.14, ph = gy * 0.46;
  c.fillStyle = '#5a3a22'; c.fillRect(px - 6, py - 6, pw + 12, ph + 12);
  c.fillStyle = '#2f4a3e'; c.fillRect(px, py, pw, ph);
  c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(px + pw * 0.1, py, pw * 0.2, ph);
  c.strokeStyle = 'rgba(240,240,230,.85)'; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(px + pw * 0.1, py + ph * 0.3); c.lineTo(px + pw * 0.55, py + ph * 0.3); c.moveTo(px + pw * 0.1, py + ph * 0.5); c.lineTo(px + pw * 0.8, py + ph * 0.5); c.moveTo(px + pw * 0.1, py + ph * 0.7); c.lineTo(px + pw * 0.4, py + ph * 0.7); c.stroke();
  c.beginPath(); c.arc(px + pw * 0.75, py + ph * 0.28, ph * 0.1, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#5a3a22'; c.fillRect(px, py + ph + 6, pw, 5); c.fillStyle = '#f4f0e6'; c.fillRect(px + pw * 0.2, py + ph + 3, 10, 3); c.fillRect(px + pw * 0.26, py + ph + 3, 8, 3);
  // ventana del otro lado con cielo claro y un mapa colgado
  const vx = side > 0 ? w * 0.6 : w * 0.08, vw = w * 0.22;
  c.fillStyle = '#ffffff'; c.fillRect(vx - 5, gy * 0.12, vw + 10, gy * 0.42);
  c.fillStyle = lin(c, 0, gy * 0.12, 0, gy * 0.54, [[0, '#7fb0dc'], [1, '#d6ebf7']]); c.fillRect(vx, gy * 0.14, vw, gy * 0.38);
  c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.moveTo(vx + vw / 2, gy * 0.14); c.lineTo(vx + vw / 2, gy * 0.52); c.moveTo(vx, gy * 0.33); c.lineTo(vx + vw, gy * 0.33); c.stroke();
  const mx = side > 0 ? w * 0.86 : w * 0.34;
  c.fillStyle = '#e8dcb8'; c.fillRect(mx, gy * 0.16, w * 0.11, gy * 0.3); c.fillStyle = '#8fb08a'; c.beginPath(); c.ellipse(mx + w * 0.055, gy * 0.3, w * 0.035, gy * 0.08, 0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a3a22'; c.fillRect(mx - 2, gy * 0.15, w * 0.11 + 4, 3);
  // piso de baldosas en perspectiva y dos pupitres del lado del decorado
  c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#c9b58a'], [1, '#8a7a5a']]); c.fillRect(0, gy, w, h - gy);
  c.strokeStyle = 'rgba(70,55,35,.28)'; c.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) { const y = gy + (h - gy) * (i * i / 36); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(w / 2 + i * w * 0.06, gy); c.lineTo(w / 2 + i * w * 0.4, h); c.stroke(); }
  const dx = side > 0 ? w * 0.78 : w * 0.22;
  pupitre(c, dx - 30 * k, gy + 54 * k, k); pupitre(c, dx + 36 * k, gy + 40 * k, k * 0.9);
  glow(c, vx + vw / 2, gy * 0.3, w * 0.55, 'rgba(255,255,240,A)', 0.22);
  vignette(c, w, h, 0.3); grain(c, w, h, 91, 0.03);
}

const WORLDS = {
  'taller-londres': londres, 'excavacion-egipto': egipto, 'foro-roma': roma, 'sala-medieval': medieval, 'laboratorio-moderno': laboratorioModerno,
  biblioteca, observatorio, aula,
};
export const WORLD_NAMES = Object.freeze(Object.keys(WORLDS));
/** Mundos al aire libre: de noche ganan estrellas y luna; al atardecer, el sol bajo en el horizonte. Los interiores solo cambian la luz. */
export const EXTERIORES = Object.freeze(['excavacion-egipto', 'foro-roma', 'observatorio']);

// ───────────────────────── Hora del día (PR-D8) ─────────────────────────
// `dia` es el dibujo tal cual (lo que siempre se pintó): el feed llama a paintWorld sin hora y no cambia ni un píxel. `atardecer`
// y `noche` son velos planos encima del fondo ya cacheado (una vez por fondo, nada por fotograma), como en el tema «estudio».
export const HORAS = Object.freeze(['dia', 'atardecer', 'noche']);
export const HORA_DEFECTO = 'dia';
const VELOS = {
  atardecer(c, w, h, world) {
    const gy = h * GROUND_Y;
    c.fillStyle = lin(c, 0, 0, 0, h, [[0, 'rgba(120,70,140,.22)'], [0.45, 'rgba(255,140,70,.2)'], [1, 'rgba(140,60,40,.26)']]); c.fillRect(0, 0, w, h);
    if (EXTERIORES.includes(world)) {
      glow(c, w * 0.5, gy * 0.95, w * 0.7, 'rgba(255,170,90,A)', 0.42);
      c.fillStyle = 'rgba(255,235,190,.85)'; c.beginPath(); c.arc(w * 0.5, gy * 0.96, w * 0.05, Math.PI, 0); c.fill();
    } else {
      c.fillStyle = 'rgba(255,170,100,.12)'; c.beginPath(); c.moveTo(w * 0.1, 0); c.lineTo(w * 0.45, 0); c.lineTo(w * 0.95, h); c.lineTo(w * 0.6, h); c.closePath(); c.fill();
    }
    vignette(c, w, h, 0.18);
  },
  noche(c, w, h, world) {
    const gy = h * GROUND_Y, r = rng(97);
    c.fillStyle = 'rgba(8,10,40,.52)'; c.fillRect(0, 0, w, h);
    if (EXTERIORES.includes(world)) {
      c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 70; i++) { const s = r() < 0.15 ? 1.8 : 1.1; c.fillRect(r() * w, r() * gy * 0.85, s, s); }
      const mx = w * 0.78, my = gy * 0.22;
      glow(c, mx, my, w * 0.3, 'rgba(220,230,255,A)', 0.3);
      c.fillStyle = '#eef2ff'; c.beginPath(); c.arc(mx, my, w * 0.045, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(8,10,40,.95)'; c.beginPath(); c.arc(mx - w * 0.02, my - w * 0.012, w * 0.04, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(200,215,255,.10)'; c.fillRect(0, gy, w, h - gy);
    } else {
      glow(c, w * 0.5, gy * 0.55, w * 0.55, 'rgba(255,190,110,A)', 0.3);                                    // una lámpara al centro
      c.fillStyle = 'rgba(255,200,130,.08)'; c.beginPath(); c.moveTo(w * 0.42, 0); c.lineTo(w * 0.58, 0); c.lineTo(w * 0.9, h); c.lineTo(w * 0.1, h); c.closePath(); c.fill();
    }
    vignette(c, w, h, 0.3);
  },
};

/**
 * Pinta un mundo en el lienzo `c` (w × h). `hora` es opcional: sin ella (o con `dia`) el dibujo es exactamente el de siempre
 * (así lo usa el feed); `atardecer` y `noche` añaden un velo encima. `props` se reserva para mundos con decorado.
 */
export function paintWorld(c, w, h, world, _sceneColors = {}, _props = null, side = 1, hora = null) {
  (WORLDS[world] || londres)(c, w, h, side);
  if (hora && hora !== HORA_DEFECTO && VELOS[hora]) VELOS[hora](c, w, h, world);
}

/** Ambiente animado (cada fotograma, por encima del fondo): polvo a contraluz y parpadeo de la vela. */
export function paintAmbient(c, w, h, world, T) {
  const gy = h * GROUND_Y;
  if (world === 'excavacion-egipto' || world === 'observatorio') {              // polvo o polen que cruza al viento (sin velo cálido)
    c.fillStyle = world === 'observatorio' ? 'rgba(235,245,255,.45)' : 'rgba(255,225,170,.5)';
    for (let i = 0; i < 26; i++) { const sp = 12 + (i * 7) % 22, x = ((i * 97 + T * sp) % (w + 40)) - 20, y = gy * 0.3 + ((i * 53) % Math.round(h * 0.55)) + Math.sin(T * 0.8 + i) * 6; c.fillRect(x, y, 1.6, 1.6); }
  } else if (world === 'aula') {                                                  // polvo de tiza que cae despacio, sin luz de vela
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 14; i++) { const x = (i * 71 + 30) % w + Math.sin(T * 0.4 + i) * 8, y = ((i * 43 + 20 + T * (4 + i % 3)) % (h * 0.7)); c.fillRect(x, y, 1.4, 1.4); }
  } else {
    const f = 0.045 + 0.02 * Math.sin(T * 9.1) + 0.012 * Math.sin(T * 23.7);
    c.fillStyle = `rgba(255,170,90,${f})`; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,214,150,.45)';
    for (let i = 0; i < 18; i++) { const x = (i * 71 + 30) % w + Math.sin(T * 0.3 + i) * 12, y = ((i * 43 + 20 + T * (3 + i % 4)) % (h * 0.62)); c.fillRect(x, y, 1.5, 1.5); }
  }
}
export function paintClima() {}
export function paintFauna() {}
