// Tema «estudio» · escenarios ilustrados (planos, colores de GEMS). Se pintan UNA vez por mundo, decorado y tamaño en un
// lienzo aparte y cada fotograma solo los copia (un drawImage); encima va un detalle animado muy barato (burbujas,
// estrellas que titilan, polvo de tiza, vapor).
// Estilo: colores lisos con textura de cuaderno (renglones finos y línea de margen), sombras duras desplazadas y nada de
// degradados suaves ni brillos difusos.
// Unidades: todo se dibuja en un lienzo de 540x960 escalado por k = ancho / 540.

const TAU = Math.PI * 2;
export const GROUND_Y = 0.5;                         // línea del piso como fracción del alto
export const FONT = '"Rubik", system-ui, -apple-system, "Segoe UI", sans-serif';
const SHADOW = 'rgba(8,7,16,.28)';

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
/** Rectángulo redondeado con sombra dura (desplazada, sin desenfoque). */
function card(c, x, y, w, h, r, color, k, dx = 6, dy = 8) {
  c.fillStyle = SHADOW; rr(c, x + dx * k, y + dy * k, w, h, r); c.fill();
  c.fillStyle = color; rr(c, x, y, w, h, r); c.fill();
}
/** Aleatorio con semilla: el mismo cielo cada vez. */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Pared/cielo: color liso, zócalo con el segundo color (borde duro) y renglones de cuaderno. */
function sky(c, w, h, sc, k, { lines = true, band = true } = {}) {
  const gy = h * GROUND_Y;
  c.fillStyle = sc.sky?.[0] || '#1E1B4B'; c.fillRect(0, 0, w, h);
  if (band) { c.fillStyle = sc.sky?.[1] || '#3B2F86'; c.fillRect(0, gy * 0.7, w, gy * 0.3); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, gy * 0.7, w, 3 * k); }
  if (lines) {
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 28 * k; y < gy * 0.7; y += 28 * k) c.fillRect(0, y, w, Math.max(1, k));
    c.fillStyle = 'rgba(255,138,208,.16)'; c.fillRect(w * 0.11, 0, 2 * k, gy * 0.7);
  }
}
function floor(c, w, h, color, dark) {
  const y = h * GROUND_Y; c.fillStyle = color; c.fillRect(0, y, w, h - y);
  c.fillStyle = dark; c.fillRect(0, y, w, 6);
}
function planks(c, w, h, k, alpha = 0.06) {
  c.fillStyle = `rgba(255,255,255,${alpha})`; for (let i = 0; i < 7; i++) c.fillRect(0, h * GROUND_Y + (22 + i * 44) * k, w, 3 * k);
  c.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 7; i++) c.fillRect(((i * 97) % 5) * w / 5, h * GROUND_Y + (22 + i * 44) * k, 3 * k, 44 * k);
}

function flask(c, x, y, s, liquid) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -6, -46, 12, 18, 3); c.fill();
  c.beginPath(); c.moveTo(-6, -30); c.lineTo(-20, -4); c.quadraticCurveTo(-22, 2, -15, 2); c.lineTo(15, 2); c.quadraticCurveTo(22, 2, 20, -4); c.lineTo(6, -30); c.closePath(); c.fill();
  c.fillStyle = liquid; c.beginPath(); c.moveTo(-13, -14); c.lineTo(-19, -3); c.quadraticCurveTo(-20, 0, -15, 0); c.lineTo(15, 0); c.quadraticCurveTo(20, 0, 19, -3); c.lineTo(13, -14); c.closePath(); c.fill();
  c.restore();
}
function beaker(c, x, y, s, liquid) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -16, -44, 32, 46, 5); c.fill();
  c.fillStyle = liquid; rr(c, -14, -22, 28, 22, 4); c.fill();
  c.fillStyle = 'rgba(30,27,75,.35)'; for (let i = 0; i < 3; i++) c.fillRect(6, -38 + i * 8, 8, 2);
  c.restore();
}
function tube(c, x, y, s, liquid) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -6, -50, 12, 50, 6); c.fill();
  c.fillStyle = liquid; rr(c, -5, -24, 10, 23, 5); c.fill();
  c.restore();
}
/** Estantería con lomos de libros de colores (biblioteca y decorado «libros»). */
function shelf(c, x, y, w, h, k, seed) {
  const R = rng(seed), cols = ['#C471ED', '#4DE1FF', '#FFD166', '#34D399', '#F87171', '#9B8FF8', '#E9E6FF'];
  card(c, x, y, w, h, 6 * k, '#6B3F2A', k);
  const rows = Math.max(1, Math.round(h / (70 * k)));
  for (let r = 0; r < rows; r++) {
    const ry = y + 10 * k + r * (h - 14 * k) / rows, rh = (h - 14 * k) / rows - 10 * k;
    c.fillStyle = '#4A2A1E'; c.fillRect(x + 8 * k, ry, w - 16 * k, rh);
    let bx = x + 10 * k;
    while (bx < x + w - 16 * k) { const bw = (8 + R() * 10) * k, bh = rh * (0.62 + R() * 0.36); c.fillStyle = cols[(R() * cols.length) | 0]; c.fillRect(bx, ry + rh - bh, Math.min(bw, x + w - 12 * k - bx), bh); bx += bw + 2 * k; }
    c.fillStyle = '#8A5638'; c.fillRect(x + 4 * k, ry + rh, w - 8 * k, 6 * k);
  }
}
function pot(c, x, y, k, leaf = '#34D399') {
  c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 4 * k, 26 * k, 7 * k, 0, 0, TAU); c.fill();
  c.fillStyle = leaf; for (let i = -2; i <= 2; i++) { c.save(); c.translate(x, y - 40 * k); c.rotate(i * 0.42); c.beginPath(); c.ellipse(0, -26 * k, 10 * k, 30 * k, 0, 0, TAU); c.fill(); c.restore(); }
  c.fillStyle = '#E07A4F'; c.beginPath(); c.moveTo(x - 22 * k, y - 44 * k); c.lineTo(x + 22 * k, y - 44 * k); c.lineTo(x + 16 * k, y); c.lineTo(x - 16 * k, y); c.closePath(); c.fill();
  c.fillStyle = '#C2563A'; c.fillRect(x - 24 * k, y - 48 * k, 48 * k, 9 * k);
}
function globe(c, x, y, k) {
  c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 4 * k, 26 * k, 7 * k, 0, 0, TAU); c.fill();
  c.fillStyle = '#6B3F2A'; rr(c, x - 22 * k, y - 8 * k, 44 * k, 8 * k, 3 * k); c.fill(); c.fillRect(x - 3 * k, y - 34 * k, 6 * k, 28 * k);
  c.fillStyle = '#4DA3FF'; circle(c, x, y - 70 * k, 36 * k); c.fill();
  c.fillStyle = '#34D399'; c.beginPath(); c.ellipse(x - 12 * k, y - 80 * k, 14 * k, 18 * k, 0.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x + 14 * k, y - 58 * k, 11 * k, 13 * k, -0.4, 0, TAU); c.fill();
  c.strokeStyle = '#FFD166'; c.lineWidth = 4 * k; c.beginPath(); c.arc(x, y - 70 * k, 42 * k, -2.2, 0.9); c.stroke();
}
function clock(c, x, y, k, t = 0) {
  card(c, x - 34 * k, y - 34 * k, 68 * k, 68 * k, 34 * k, '#F4FBFF', k, 4, 5);
  c.strokeStyle = '#1E1B4B'; c.lineWidth = 4 * k; c.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(x + Math.sin(a) * 24 * k, y - Math.cos(a) * 24 * k); c.lineTo(x + Math.sin(a) * 28 * k, y - Math.cos(a) * 28 * k); c.stroke(); }
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t * 0.08 + 1) * 15 * k, y - Math.cos(t * 0.08 + 1) * 15 * k); c.stroke();
  c.strokeStyle = '#F87171'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t) * 24 * k, y - Math.cos(t) * 24 * k); c.stroke();
}
function stars(c, w, h, k, n, seed) {
  const R = rng(seed); c.fillStyle = '#FFFFFF';
  for (let i = 0; i < n; i++) { c.globalAlpha = 0.35 + R() * 0.65; const s = (1.5 + R() * 2.5) * k; c.fillRect(R() * w, R() * h * GROUND_Y, s, s); }
  c.globalAlpha = 1;
}

const WORLDS = {
  laboratorio(c, w, h, k, sc) {
    sky(c, w, h, sc, k, { lines: false });
    // azulejos hexagonales muy suaves
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 2 * k;
    const r = 34 * k;
    for (let row = 0; row * r * 1.5 < h * GROUND_Y + r; row++) for (let col = -1; col * r * 1.732 < w + r; col++) {
      const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0), cy = row * r * 1.5;
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); c.stroke();
    }
    // ventana redonda con el cielo
    c.fillStyle = SHADOW; circle(c, w * 0.79 + 6 * k, h * 0.13 + 8 * k, 58 * k); c.fill();
    c.fillStyle = '#4F46E5'; circle(c, w * 0.79, h * 0.13, 58 * k); c.fill();
    c.fillStyle = '#9B8FF8'; circle(c, w * 0.79, h * 0.13, 46 * k); c.fill();
    c.fillStyle = '#E9E6FF'; circle(c, w * 0.79 + 14 * k, h * 0.13 - 12 * k, 10 * k); c.fill();
    c.strokeStyle = '#4F46E5'; c.lineWidth = 6 * k; c.beginPath(); c.moveTo(w * 0.79 - 46 * k, h * 0.13); c.lineTo(w * 0.79 + 46 * k, h * 0.13); c.stroke();
    // repisas a los lados
    const sh = (x0, x1, y) => card(c, x0, y, x1 - x0, 10 * k, 4 * k, '#E9E6FF', k, 0, 7);
    sh(-10 * k, w * 0.3, h * 0.22); sh(-10 * k, w * 0.27, h * 0.38); sh(w * 0.72, w + 10 * k, h * 0.33);
    flask(c, w * 0.07, h * 0.22, k * 1.1, '#4DE1FF'); beaker(c, w * 0.17, h * 0.22, k, '#C471ED'); tube(c, w * 0.25, h * 0.22, k, '#34D399');
    beaker(c, w * 0.06, h * 0.38, k * 0.9, '#FFD166'); flask(c, w * 0.15, h * 0.38, k, '#F87171'); tube(c, w * 0.21, h * 0.38, k, '#4DE1FF');
    flask(c, w * 0.8, h * 0.33, k * 1.2, '#34D399'); tube(c, w * 0.9, h * 0.33, k, '#C471ED'); beaker(c, w * 0.97, h * 0.33, k * 0.9, '#4DE1FF');
    // tabla periódica de juguete
    const colors = ['#C471ED', '#4DE1FF', '#34D399', '#FFD166', '#9B8FF8'];
    for (let i = 0; i < 12; i++) { c.fillStyle = colors[i % 5]; c.globalAlpha = 0.6; rr(c, w * 0.74 + (i % 4) * 26 * k, h * 0.2 + ((i / 4) | 0) * 26 * k, 22 * k, 22 * k, 4 * k); c.fill(); }
    c.globalAlpha = 1;
    floor(c, w, h, '#2A2566', '#4F46E5');
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 9; i++) c.fillRect(i * w / 8 - 2 * k, h * GROUND_Y + 6 * k, 4 * k, h);
  },
  espacio(c, w, h, k, sc) {
    sky(c, w, h, sc, k, { lines: false, band: false });
    stars(c, w, h, k, 90, 7);
    // planeta con anillo (colores lisos)
    const px = w * 0.8, py = h * 0.14, pr = 52 * k;
    c.strokeStyle = '#4DE1FF'; c.lineWidth = 7 * k; c.beginPath(); c.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, Math.PI, TAU); c.stroke();
    c.fillStyle = '#C471ED'; circle(c, px, py, pr); c.fill();
    c.fillStyle = '#D896F2'; c.beginPath(); c.ellipse(px - pr * 0.1, py - pr * 0.25, pr * 0.9, pr * 0.18, -0.35, 0, TAU); c.fill();
    c.fillStyle = '#9A4FC4'; c.beginPath(); c.ellipse(px + pr * 0.1, py + pr * 0.3, pr * 0.85, pr * 0.16, -0.35, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, 0, Math.PI); c.stroke();
    // luna pequeña
    c.fillStyle = '#E9E6FF'; circle(c, w * 0.14, h * 0.36, 22 * k); c.fill(); c.fillStyle = '#C9C3F5'; circle(c, w * 0.14 + 6 * k, h * 0.36 - 5 * k, 6 * k); c.fill();
    // suelo de asteroide curvo con cráteres
    const gy = h * GROUND_Y;
    c.fillStyle = '#3A3566'; c.beginPath(); c.moveTo(0, gy + 30 * k); c.quadraticCurveTo(w / 2, gy - 40 * k, w, gy + 30 * k); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#4A4480'; c.beginPath(); c.moveTo(0, gy + 30 * k); c.quadraticCurveTo(w / 2, gy - 40 * k, w, gy + 30 * k); c.lineTo(w, gy + 44 * k); c.quadraticCurveTo(w / 2, gy - 26 * k, 0, gy + 44 * k); c.closePath(); c.fill();
    c.fillStyle = 'rgba(8,7,16,.3)';
    [[0.18, 0.05, 30, 9], [0.7, 0.04, 22, 7], [0.42, 0.09, 40, 11], [0.88, 0.1, 18, 6]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(w * x, gy + h * y, rx * k, ry * k, 0, 0, TAU); c.fill(); });
  },
  aula(c, w, h, k, sc) {
    sky(c, w, h, sc, k);
    // pizarra
    const bx = w * 0.06, by = h * 0.08, bw = w * 0.88, bh = h * 0.38;
    card(c, bx - 10 * k, by - 10 * k, bw + 20 * k, bh + 20 * k, 18 * k, '#E9E6FF', k);
    c.fillStyle = '#1F4A44'; rr(c, bx, by, bw, bh, 12 * k); c.fill();
    // escritos con tiza (a los lados: el personaje tapa el centro)
    c.fillStyle = 'rgba(255,255,255,.78)'; c.font = `${30 * k}px ${FONT}`; c.textBaseline = 'middle';
    c.fillText('a² + b² = c²', bx + 22 * k, by + 46 * k);
    c.fillText('π ≈ 3,14', bx + bw - 150 * k, by + 46 * k);
    c.font = `${26 * k}px ${FONT}`; c.fillText('x = ?', bx + 26 * k, by + bh - 48 * k); c.fillText('2 + 2 = 4', bx + bw - 140 * k, by + bh - 48 * k);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4 * k; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx + 40 * k, by + bh * 0.62); c.lineTo(bx + 110 * k, by + bh * 0.62); c.lineTo(bx + 40 * k, by + bh * 0.38); c.closePath(); c.stroke();
    c.beginPath(); c.arc(bx + bw - 70 * k, by + bh * 0.5, 30 * k, 0, TAU); c.moveTo(bx + bw - 100 * k, by + bh * 0.5); c.lineTo(bx + bw - 40 * k, by + bh * 0.5); c.stroke();
    // repisa de la pizarra con tizas
    c.fillStyle = '#C9C3F5'; rr(c, bx, by + bh + 10 * k, bw, 10 * k, 4 * k); c.fill();
    c.fillStyle = '#FFFFFF'; rr(c, bx + 60 * k, by + bh + 3 * k, 26 * k, 8 * k, 4 * k); c.fill(); c.fillStyle = '#FFD166'; rr(c, bx + 96 * k, by + bh + 3 * k, 22 * k, 8 * k, 4 * k); c.fill();
    floor(c, w, h, '#2B2458', '#5B4EC1');
    planks(c, w, h, k, 0.05);
  },
  biblioteca(c, w, h, k, sc) {
    sky(c, w, h, sc, k);
    shelf(c, -12 * k, h * 0.06, w * 0.3, h * 0.44, k, 3);
    shelf(c, w * 0.72, h * 0.06, w * 0.3, h * 0.44, k, 11);
    // ventana en arco al centro, alta (el personaje queda delante)
    c.fillStyle = SHADOW; rr(c, w * 0.38 + 6 * k, h * 0.05 + 8 * k, w * 0.24, h * 0.2, 60 * k); c.fill();
    c.fillStyle = '#F4D6A0'; rr(c, w * 0.38, h * 0.05, w * 0.24, h * 0.2, 60 * k); c.fill();
    c.fillStyle = '#6B3F2A'; c.fillRect(w * 0.5 - 3 * k, h * 0.05, 6 * k, h * 0.2); c.fillRect(w * 0.38, h * 0.15, w * 0.24, 6 * k);
    // lámpara colgante
    c.fillStyle = '#2A1810'; c.fillRect(w * 0.27 - 1 * k, 0, 2 * k, h * 0.07);
    c.fillStyle = '#FFD166'; c.beginPath(); c.moveTo(w * 0.27 - 22 * k, h * 0.1); c.lineTo(w * 0.27 + 22 * k, h * 0.1); c.lineTo(w * 0.27 + 10 * k, h * 0.07); c.lineTo(w * 0.27 - 10 * k, h * 0.07); c.closePath(); c.fill();
    floor(c, w, h, '#4A2A1E', '#8A5638');
    planks(c, w, h, k, 0.07);
    // alfombra
    c.fillStyle = '#7B2E3A'; c.beginPath(); c.ellipse(w / 2, h * GROUND_Y + 60 * k, w * 0.36, 34 * k, 0, 0, TAU); c.fill();
    c.strokeStyle = '#FFD166'; c.lineWidth = 3 * k; c.beginPath(); c.ellipse(w / 2, h * GROUND_Y + 60 * k, w * 0.32, 28 * k, 0, 0, TAU); c.stroke();
  },
  observatorio(c, w, h, k, sc) {
    sky(c, w, h, sc, k, { lines: false, band: false });
    stars(c, w, h, k, 70, 21);
    // cúpula: arco de la abertura y luna creciente
    c.fillStyle = '#E9E6FF'; circle(c, w * 0.22, h * 0.12, 30 * k); c.fill(); c.fillStyle = sc.sky?.[0] || '#0B1630'; circle(c, w * 0.22 + 12 * k, h * 0.11, 26 * k); c.fill();
    c.fillStyle = '#20283F'; c.fillRect(0, h * 0.36, w, h * 0.14); c.fillStyle = '#2A3350'; for (let i = 0; i < 6; i++) c.fillRect(i * w / 5, h * 0.36, 6 * k, h * 0.14);
    // telescopio sobre trípode (a la derecha)
    const tx = w * 0.8, ty = h * GROUND_Y;
    c.strokeStyle = '#9B8FF8'; c.lineWidth = 7 * k; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty - 120 * k); c.lineTo(tx - 40 * k, ty); c.moveTo(tx, ty - 120 * k); c.lineTo(tx + 40 * k, ty); c.moveTo(tx, ty - 120 * k); c.lineTo(tx, ty); c.stroke();
    c.save(); c.translate(tx, ty - 130 * k); c.rotate(-0.6);
    c.fillStyle = SHADOW; rr(c, -60 * k + 5 * k, -16 * k + 7 * k, 130 * k, 32 * k, 10 * k); c.fill();
    c.fillStyle = '#E9E6FF'; rr(c, -60 * k, -16 * k, 130 * k, 32 * k, 10 * k); c.fill();
    c.fillStyle = '#4DE1FF'; rr(c, 60 * k, -20 * k, 18 * k, 40 * k, 6 * k); c.fill();
    c.fillStyle = '#C471ED'; c.fillRect(-20 * k, -16 * k, 10 * k, 32 * k);
    c.restore();
    floor(c, w, h, '#2A3350', '#4DE1FF');
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 2 * k; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(w / 2, h * GROUND_Y); c.lineTo(w * (i / 6) * 2 - w / 2, h); c.stroke(); }
  },
  jardin(c, w, h, k, sc) {
    sky(c, w, h, sc, k, { lines: false });
    // invernadero: paneles de vidrio
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4 * k;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * w / 6, 0); c.lineTo(i * w / 6, h * GROUND_Y); c.stroke(); }
    for (let j = 1; j < 4; j++) { c.beginPath(); c.moveTo(0, j * h * 0.12); c.lineTo(w, j * h * 0.12); c.stroke(); }
    // hojas grandes a los lados
    const leaf = (x, y, r, a, col) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.ellipse(0, -r, r * 0.42, r, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 1.8); c.stroke(); c.restore(); };
    leaf(0, h * 0.42, 90 * k, 0.6, '#1F7A55'); leaf(-10 * k, h * 0.3, 80 * k, 1.1, '#2F9E6B'); leaf(w, h * 0.44, 96 * k, -0.6, '#1F7A55'); leaf(w + 10 * k, h * 0.3, 70 * k, -1.2, '#34D399');
    // macetas y regadera
    pot(c, w * 0.16, h * GROUND_Y - 4 * k, k * 0.9, '#34D399'); pot(c, w * 0.86, h * GROUND_Y - 4 * k, k, '#7CFFCB');
    floor(c, w, h, '#2F5D3A', '#7CFFCB');
    // estanque
    c.fillStyle = '#2B6F9A'; c.beginPath(); c.ellipse(w * 0.5, h * GROUND_Y + 80 * k, w * 0.3, 30 * k, 0, 0, TAU); c.fill();
    c.fillStyle = '#4DA3FF'; c.beginPath(); c.ellipse(w * 0.5, h * GROUND_Y + 76 * k, w * 0.26, 22 * k, 0, 0, TAU); c.fill();
    c.fillStyle = '#34D399'; circle(c, w * 0.4, h * GROUND_Y + 74 * k, 9 * k); c.fill(); circle(c, w * 0.62, h * GROUND_Y + 80 * k, 7 * k); c.fill();
  },
  cocina(c, w, h, k, sc) {
    sky(c, w, h, sc, k, { lines: false });
    // azulejos
    c.fillStyle = 'rgba(255,255,255,.08)'; const t = 30 * k;
    for (let y = h * GROUND_Y * 0.7; y < h * GROUND_Y; y += t) for (let x = 0; x < w; x += t) c.fillRect(x + 2 * k, y + 2 * k, t - 4 * k, t - 4 * k);
    // repisa con frascos
    card(c, w * 0.06, h * 0.16, w * 0.4, 10 * k, 3 * k, '#F4D6A0', k, 0, 6);
    [['#FFD166', 0.1], ['#F87171', 0.19], ['#34D399', 0.28], ['#4DE1FF', 0.37]].forEach(([col, x], i) => {
      c.fillStyle = '#F4FBFF'; rr(c, w * x - 14 * k, h * 0.16 - (38 + i % 2 * 8) * k, 28 * k, (38 + i % 2 * 8) * k, 6 * k); c.fill();
      c.fillStyle = col; rr(c, w * x - 11 * k, h * 0.16 - 22 * k, 22 * k, 18 * k, 4 * k); c.fill();
    });
    // ventana
    card(c, w * 0.6, h * 0.06, w * 0.3, h * 0.17, 10 * k, '#FFE7C2', k);
    c.fillStyle = '#C2563A'; c.fillRect(w * 0.75 - 3 * k, h * 0.06, 6 * k, h * 0.17);
    // estufa con olla (a la derecha) y nevera (a la izquierda)
    card(c, w * 0.7, h * GROUND_Y - 120 * k, w * 0.32, 120 * k, 8 * k, '#E9E6FF', k);
    c.fillStyle = '#4B3A5C'; rr(c, w * 0.72, h * GROUND_Y - 80 * k, w * 0.22, 60 * k, 6 * k); c.fill();
    c.fillStyle = '#9A4FC4'; rr(c, w * 0.74, h * GROUND_Y - 160 * k, w * 0.2, 40 * k, 8 * k); c.fill(); c.fillRect(w * 0.72, h * GROUND_Y - 156 * k, w * 0.24, 8 * k);
    card(c, -8 * k, h * GROUND_Y - 230 * k, w * 0.22, 230 * k, 12 * k, '#F4FBFF', k);
    c.fillStyle = '#CDEBF5'; c.fillRect(-8 * k, h * GROUND_Y - 150 * k, w * 0.22, 4 * k); c.fillStyle = '#9B8FF8'; rr(c, w * 0.16, h * GROUND_Y - 200 * k, 6 * k, 40 * k, 3 * k); c.fill();
    floor(c, w, h, '#4B3A5C', '#E08A5C');
    c.fillStyle = 'rgba(255,255,255,.06)'; for (let y = h * GROUND_Y + 8 * k, r = 0; y < h; y += 40 * k, r++) for (let x = (r % 2) * 40 * k; x < w; x += 80 * k) c.fillRect(x, y, 40 * k, 40 * k);
  },
  museo(c, w, h, k, sc) {
    sky(c, w, h, sc, k);
    // mapa del mundo enmarcado (continentes simplificados)
    const mx = w * 0.08, my = h * 0.07, mw = w * 0.84, mh = h * 0.26;
    card(c, mx - 10 * k, my - 10 * k, mw + 20 * k, mh + 20 * k, 8 * k, '#C9A46A', k);
    c.fillStyle = '#2B6F9A'; c.fillRect(mx, my, mw, mh);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2 * k; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(mx + i * mw / 6, my); c.lineTo(mx + i * mw / 6, my + mh); c.stroke(); }
    c.beginPath(); c.moveTo(mx, my + mh / 2); c.lineTo(mx + mw, my + mh / 2); c.stroke();
    c.fillStyle = '#E9C46A';
    const land = (x, y, rx, ry, a) => { c.beginPath(); c.ellipse(mx + x * mw, my + y * mh, rx * mw, ry * mh, a, 0, TAU); c.fill(); };
    land(0.2, 0.3, 0.1, 0.18, 0.3); land(0.28, 0.68, 0.06, 0.22, -0.2); land(0.5, 0.28, 0.07, 0.12, 0); land(0.52, 0.6, 0.07, 0.2, 0.1); land(0.72, 0.3, 0.16, 0.16, 0); land(0.84, 0.74, 0.06, 0.08, 0);
    c.fillStyle = '#F87171'; circle(c, mx + 0.27 * mw, my + 0.52 * mh, 6 * k); c.fill();
    // vitrinas bajas
    card(c, w * 0.04, h * GROUND_Y - 70 * k, w * 0.22, 70 * k, 6 * k, '#2E5670', k);
    c.fillStyle = 'rgba(205,235,245,.35)'; c.fillRect(w * 0.05, h * GROUND_Y - 66 * k, w * 0.2, 30 * k);
    globe(c, w * 0.86, h * GROUND_Y - 2 * k, k);
    floor(c, w, h, '#3D3326', '#C9A46A');
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let y = h * GROUND_Y + 8 * k, r = 0; y < h; y += 30 * k, r++) for (let x = (r % 2) * 60 * k; x < w; x += 120 * k) c.fillRect(x, y, 60 * k, 3 * k);
  },
};
export const WORLD_NAMES = Object.freeze(Object.keys(WORLDS));

/** Decorados sueltos (scene.props): van del lado contrario al personaje para llenar el encuadre. side = -1 izquierda, 1 derecha. */
const PROPS = {
  reloj(c, w, h, k, side) { clock(c, w * (0.5 + side * 0.36), h * 0.3, k, 2.1); },
  planta(c, w, h, k, side) { pot(c, w * (0.5 + side * 0.38), h * GROUND_Y + 30 * k, k * 1.1); },
  globo(c, w, h, k, side) { globe(c, w * (0.5 + side * 0.37), h * GROUND_Y + 34 * k, k); },
  libros(c, w, h, k, side) {
    const x = w * (0.5 + side * 0.37), y = h * GROUND_Y + 34 * k, cols = ['#C471ED', '#4DE1FF', '#FFD166', '#F87171'];
    c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 2 * k, 46 * k, 8 * k, 0, 0, TAU); c.fill();
    cols.forEach((col, i) => { c.fillStyle = col; rr(c, x - (40 - i * 3) * k, y - (i + 1) * 16 * k, (80 - i * 8) * k, 15 * k, 3 * k); c.fill(); c.fillStyle = '#F4FBFF'; c.fillRect(x + (30 - i * 6) * k, y - (i + 1) * 16 * k + 3 * k, 4 * k, 9 * k); });
  },
  // nuevos (modo cine): telescopio en trípode, cohete de juguete, microscopio y mapa del mundo en la pared
  telescopio(c, w, h, k, side) {
    const x = w * (0.5 + side * 0.36), y = h * GROUND_Y + 30 * k;
    c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 2 * k, 40 * k, 7 * k, 0, 0, TAU); c.fill();
    c.strokeStyle = '#6B3F2A'; c.lineWidth = 6 * k; c.lineCap = 'round';
    for (const dx of [-30, 0, 30]) { c.beginPath(); c.moveTo(x, y - 70 * k); c.lineTo(x + dx * k, y); c.stroke(); }
    c.save(); c.translate(x, y - 76 * k); c.rotate(-0.6 * side);
    card(c, -14 * k, -70 * k, 28 * k, 110 * k, 10 * k, '#4F46E5', k, 4, 5);
    c.fillStyle = '#9B8FF8'; c.fillRect(-14 * k, -70 * k, 28 * k, 14 * k); c.fillStyle = '#FFD166'; c.fillRect(-14 * k, 10 * k, 28 * k, 6 * k);
    c.restore();
  },
  cohete(c, w, h, k, side) {
    const x = w * (0.5 + side * 0.37), y = h * GROUND_Y + 30 * k;
    c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 2 * k, 34 * k, 6 * k, 0, 0, TAU); c.fill();
    c.fillStyle = '#F87171'; c.beginPath(); c.moveTo(x - 34 * k, y); c.lineTo(x - 16 * k, y - 40 * k); c.lineTo(x - 16 * k, y); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + 34 * k, y); c.lineTo(x + 16 * k, y - 40 * k); c.lineTo(x + 16 * k, y); c.closePath(); c.fill();
    card(c, x - 18 * k, y - 120 * k, 36 * k, 112 * k, 16 * k, '#F4FBFF', k, 5, 6);
    c.fillStyle = '#F87171'; c.beginPath(); c.moveTo(x - 18 * k, y - 104 * k); c.quadraticCurveTo(x, y - 160 * k, x + 18 * k, y - 104 * k); c.closePath(); c.fill();
    c.fillStyle = '#4DE1FF'; circle(c, x, y - 70 * k, 9 * k); c.fill(); c.strokeStyle = '#4F46E5'; c.lineWidth = 3 * k; c.stroke();
    c.fillStyle = '#FFD166'; c.fillRect(x - 10 * k, y - 8 * k, 20 * k, 8 * k);
  },
  microscopio(c, w, h, k, side) {
    const x = w * (0.5 + side * 0.36), y = h * GROUND_Y + 30 * k;
    c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 6 * k, y + 2 * k, 38 * k, 7 * k, 0, 0, TAU); c.fill();
    card(c, x - 32 * k, y - 12 * k, 64 * k, 12 * k, 4 * k, '#2E2A5E', k, 3, 4);
    c.fillStyle = '#E9E6FF'; c.fillRect(x - 20 * k, y - 34 * k, 40 * k, 6 * k);
    c.strokeStyle = '#4F46E5'; c.lineWidth = 12 * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 18 * k, y - 12 * k); c.quadraticCurveTo(x + 30 * k, y - 60 * k, x + 8 * k, y - 84 * k); c.stroke();
    c.save(); c.translate(x - 2 * k, y - 70 * k); c.rotate(-0.45);
    card(c, -9 * k, -44 * k, 18 * k, 60 * k, 6 * k, '#C471ED', k, 3, 4); c.fillStyle = '#1E1B4B'; c.fillRect(-6 * k, 16 * k, 12 * k, 10 * k);
    c.restore();
  },
  mapa(c, w, h, k, side) {
    const x = w * (0.5 + side * 0.34), y = h * 0.2, mw = 150 * k, mh = 96 * k;
    card(c, x - mw / 2, y - mh / 2, mw, mh, 8 * k, '#4DA3FF', k);
    c.fillStyle = '#34D399';
    const blob = (bx, by, rx, ry, r) => { c.beginPath(); c.ellipse(x + bx * k, y + by * k, rx * k, ry * k, r, 0, TAU); c.fill(); };
    blob(-48, -14, 18, 14, 0.4); blob(-40, 18, 9, 18, 0.2); blob(-4, -16, 12, 9, 0); blob(4, 12, 11, 17, 0.1); blob(36, -10, 24, 13, -0.2); blob(50, 26, 10, 7, 0.3);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(x - mw / 2 + 6 * k, y); c.lineTo(x + mw / 2 - 6 * k, y); c.stroke();
    c.fillStyle = '#6B3F2A'; c.fillRect(x - mw / 2 - 4 * k, y - mh / 2 - 6 * k, mw + 8 * k, 6 * k);
  },
};
export const PROP_NAMES = Object.freeze(Object.keys(PROPS));

/**
 * Hora del día (modo cine) en los fondos ilustrados: un velo plano encima (sin degradados suaves) y, de noche, la luz dura
 * de una lámpara de techo. Se pinta una sola vez dentro del fondo cacheado: no cuesta nada por fotograma.
 */
const HORAS = {
  tarde(c, w, h) { c.fillStyle = 'rgba(255,140,70,.16)'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,190,120,.10)'; c.beginPath(); c.moveTo(w * 0.62, 0); c.lineTo(w * 0.92, 0); c.lineTo(w * 0.5, h * GROUND_Y); c.lineTo(w * 0.12, h * GROUND_Y); c.closePath(); c.fill(); },
  amanecer(c, w, h) { c.fillStyle = 'rgba(255,190,215,.13)'; c.fillRect(0, 0, w, h); },
  noche(c, w, h, k) {
    c.fillStyle = 'rgba(8,8,36,.42)'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,214,140,.13)'; c.beginPath(); c.moveTo(w * 0.42, 40 * k); c.lineTo(w * 0.58, 40 * k); c.lineTo(w * 0.86, h * 0.7); c.lineTo(w * 0.14, h * 0.7); c.closePath(); c.fill();
    c.fillStyle = '#2A2566'; c.fillRect(w * 0.5 - 2 * k, 0, 4 * k, 26 * k); c.fillStyle = '#FFD166'; c.beginPath(); c.moveTo(w * 0.5 - 22 * k, 44 * k); c.lineTo(w * 0.5 + 22 * k, 44 * k); c.lineTo(w * 0.5 + 12 * k, 24 * k); c.lineTo(w * 0.5 - 12 * k, 24 * k); c.closePath(); c.fill();
  },
};

/** Pinta el fondo fijo del mundo `world` en el lienzo `c` (de ancho w y alto h), con su decorado y su hora si los hay. */
export function paintWorld(c, w, h, world, sceneColors = {}, props = null, side = 1, hora = null) {
  const k = w / 540;
  (WORLDS[world] || WORLDS.laboratorio)(c, w, h, k, sceneColors);
  if (props && PROPS[props]) PROPS[props](c, w, h, k, side);
  if (hora && HORAS[hora]) HORAS[hora](c, w, h, k);
}

/**
 * Clima / partículas del ambiente (modo cine), encima del fondo y detrás del personaje. Muy barato: a lo sumo ~24 figuras
 * planas por fotograma. polvo (motas en la luz), burbujas, chispas, hojas, lluvia (en el jardín) y notas musicales.
 */
export function paintClima(c, w, h, clima, T) {
  const k = w / 540, R = i => ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
  if (clima === 'polvo') {
    c.fillStyle = 'rgba(255,236,190,.55)';
    for (let i = 0; i < 18; i++) { const y = h * (0.05 + ((R(i) + T * 0.015 * (0.5 + R(i + 9))) % 0.6)), x = w * R(i + 3) + Math.sin(T * 0.6 + i) * 10 * k; c.fillRect(x, y, 3 * k, 3 * k); }
  } else if (clima === 'burbujas') {
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2 * k;
    for (let i = 0; i < 12; i++) { const p = (T * 0.12 * (0.6 + R(i)) + R(i + 4)) % 1, x = w * (0.05 + 0.9 * R(i + 1)) + Math.sin(T * 1.4 + i) * 8 * k, y = h * GROUND_Y * (1 - p); circle(c, x, y, (4 + 6 * R(i + 2)) * k); c.globalAlpha = 1 - p * 0.7; c.stroke(); }
    c.globalAlpha = 1;
  } else if (clima === 'chispas') {
    for (let i = 0; i < 12; i++) {
      const a = 0.5 + 0.5 * Math.sin(T * (2 + R(i) * 2) + i * 1.7), x = w * R(i + 7), y = h * GROUND_Y * 0.9 * R(i + 11), s = (3 + 6 * a) * k;
      c.fillStyle = ['#FFD166', '#4DE1FF', '#C471ED'][i % 3]; c.globalAlpha = a; c.fillRect(x - s / 2, y - 1 * k, s, 2 * k); c.fillRect(x - 1 * k, y - s / 2, 2 * k, s);
    }
    c.globalAlpha = 1;
  } else if (clima === 'hojas') {
    const cols = ['#34D399', '#FFD166', '#F4A261'];
    for (let i = 0; i < 12; i++) { const p = (T * 0.07 * (0.6 + R(i)) + R(i + 5)) % 1, x = w * R(i + 2) + Math.sin(T * 1.1 + i) * 30 * k, y = h * 0.62 * p; c.save(); c.translate(x, y); c.rotate(Math.sin(T * 2 + i)); c.fillStyle = cols[i % 3]; c.beginPath(); c.ellipse(0, 0, 8 * k, 4 * k, 0, 0, TAU); c.fill(); c.restore(); }
  } else if (clima === 'lluvia') {
    c.strokeStyle = 'rgba(205,230,255,.5)'; c.lineWidth = 2.5 * k; c.beginPath();
    for (let i = 0; i < 24; i++) { const p = (T * 1.4 * (0.8 + R(i) * 0.4) + R(i + 3)) % 1, x = w * R(i + 1) - p * 30 * k, y = h * 0.62 * p; c.moveTo(x, y); c.lineTo(x - 6 * k, y + 22 * k); }
    c.stroke();
  } else if (clima === 'notas') {
    c.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 6; i++) { const p = (T * 0.1 + i / 6) % 1, x = w * (0.1 + 0.8 * R(i + 2)) + Math.sin(T + i) * 14 * k, y = h * GROUND_Y * (0.95 - p * 0.8); c.globalAlpha = Math.sin(p * Math.PI); c.beginPath(); c.ellipse(x, y, 6 * k, 4.5 * k, -0.4, 0, TAU); c.fill(); c.fillRect(x + 4 * k, y - 22 * k, 2.5 * k, 22 * k); c.fillRect(x + 4 * k, y - 22 * k, 10 * k, 3 * k); }
    c.globalAlpha = 1;
  }
}

/**
 * Fauna de fondo (modo cine): criaturas pequeñas que pasan detrás del personaje, del lado libre (`side`). `gy` = línea del
 * piso ya movida por el plano. pajaros (cruzan la pared), gato (duerme en el piso y mueve la cola), dron (robotito que vuela
 * en ochos), peces (pecera sobre una repisa) y mariposas.
 */
export function paintFauna(c, w, h, fauna, T, gy, side = 1) {
  const k = w / 540;
  if (fauna === 'pajaros') {
    c.strokeStyle = '#1E1B4B'; c.lineWidth = 3 * k; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const p = (T * 0.05 + i * 0.13) % 1.3 - 0.15, x = w * p, y = h * (0.12 + i * 0.05) + Math.sin(T * 1.5 + i) * 8 * k, f = Math.sin(T * 10 + i * 2) * 7 * k;
      c.beginPath(); c.moveTo(x - 12 * k, y - f); c.quadraticCurveTo(x - 5 * k, y - 4 * k, x, y); c.quadraticCurveTo(x + 5 * k, y - 4 * k, x + 12 * k, y - f); c.stroke();
    }
  } else if (fauna === 'gato') {
    const x = w * (0.5 + side * 0.3), y = gy + 26 * k;
    c.fillStyle = SHADOW; c.beginPath(); c.ellipse(x + 4 * k, y + 4 * k, 34 * k, 6 * k, 0, 0, TAU); c.fill();
    c.fillStyle = '#F4A261'; c.beginPath(); c.ellipse(x, y - 12 * k, 30 * k, 15 * k, 0, 0, TAU); c.fill();
    const hx = x + 24 * k * side; circle(c, hx, y - 20 * k, 13 * k); c.fill();
    c.beginPath(); c.moveTo(hx - 11 * k, y - 26 * k); c.lineTo(hx - 7 * k, y - 40 * k); c.lineTo(hx - 1 * k, y - 30 * k); c.fill();
    c.beginPath(); c.moveTo(hx + 11 * k, y - 26 * k); c.lineTo(hx + 7 * k, y - 40 * k); c.lineTo(hx + 1 * k, y - 30 * k); c.fill();
    c.strokeStyle = '#1E1B4B'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(hx - 7 * k, y - 20 * k); c.lineTo(hx - 2 * k, y - 20 * k); c.moveTo(hx + 2 * k, y - 20 * k); c.lineTo(hx + 7 * k, y - 20 * k); c.stroke();
    c.strokeStyle = '#F4A261'; c.lineWidth = 7 * k; c.lineCap = 'round'; const tw = Math.sin(T * 2.2) * 0.6;
    c.beginPath(); c.moveTo(x - 26 * k * side, y - 8 * k); c.quadraticCurveTo(x - 44 * k * side, y - 4 * k + tw * 10 * k, x - 40 * k * side, y - 26 * k + tw * 16 * k); c.stroke();
    if (Math.sin(T * 0.8) > 0.2) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `700 ${12 * k}px system-ui, sans-serif`; c.fillText('z', hx + 14 * k * side, y - 44 * k - (T % 2) * 6 * k); }
  } else if (fauna === 'dron') {
    const x = w * (0.5 + side * 0.3) + Math.sin(T * 0.7) * 50 * k, y = h * 0.2 + Math.sin(T * 1.4) * 26 * k;
    c.fillStyle = SHADOW; circle(c, x + 5 * k, y + 6 * k, 15 * k); c.fill();
    c.fillStyle = '#E9E6FF'; circle(c, x, y, 15 * k); c.fill(); c.fillStyle = '#1E1B4B'; rr(c, x - 9 * k, y - 6 * k, 18 * k, 10 * k, 4 * k); c.fill();
    c.fillStyle = '#4DE1FF'; c.fillRect(x - 5 * k, y - 3 * k, 3 * k, 3 * k); c.fillRect(x + 2 * k, y - 3 * k, 3 * k, 3 * k);
    c.strokeStyle = '#9B8FF8'; c.lineWidth = 3 * k; const pr = Math.abs(Math.sin(T * 30)) * 16 * k; c.beginPath(); c.moveTo(x, y - 15 * k); c.lineTo(x, y - 22 * k); c.moveTo(x - pr, y - 22 * k); c.lineTo(x + pr, y - 22 * k); c.stroke();
  } else if (fauna === 'peces') {
    const x = w * (0.5 + side * 0.36), y = gy - 4 * k;
    card(c, x - 50 * k, y - 8 * k, 100 * k, 10 * k, 3 * k, '#6B3F2A', k, 3, 4);
    c.fillStyle = 'rgba(77,163,255,.55)'; rr(c, x - 40 * k, y - 78 * k, 80 * k, 70 * k, 14 * k); c.fill();
    c.strokeStyle = 'rgba(233,230,255,.8)'; c.lineWidth = 3 * k; rr(c, x - 40 * k, y - 84 * k, 80 * k, 76 * k, 14 * k); c.stroke();
    c.fillStyle = '#34D399'; for (const dx of [-24, -16, 22]) { c.beginPath(); c.ellipse(x + dx * k, y - 22 * k, 3 * k, 14 * k, 0.2, 0, TAU); c.fill(); }
    for (let i = 0; i < 2; i++) {
      const fx = x + Math.sin(T * (0.9 + i * 0.4) + i * 2) * 24 * k, fy = y - 48 * k + i * 16 * k, d = Math.cos(T * (0.9 + i * 0.4) + i * 2) > 0 ? 1 : -1;
      c.fillStyle = i ? '#FFD166' : '#F87171'; c.beginPath(); c.ellipse(fx, fy, 9 * k, 6 * k, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(fx - 8 * k * d, fy); c.lineTo(fx - 15 * k * d, fy - 6 * k); c.lineTo(fx - 15 * k * d, fy + 6 * k); c.closePath(); c.fill();
    }
  } else if (fauna === 'mariposas') {
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.3) + Math.sin(T * 0.7 + i * 2) * 40 * k, y = h * (0.18 + i * 0.06) + Math.sin(T * 1.3 + i) * 20 * k, f = Math.abs(Math.sin(T * 9 + i));
      c.fillStyle = ['#FFD166', '#F87171', '#C471ED'][i]; c.beginPath(); c.ellipse(x - 5 * k * f, y, 6 * k * f + 1, 8 * k, 0, 0, TAU); c.ellipse(x + 5 * k * f, y, 6 * k * f + 1, 8 * k, 0, 0, TAU); c.fill();
    }
  }
}

/** Detalle animado encima del fondo (muy barato: menos de 15 figuras por fotograma). */
export function paintAmbient(c, w, h, world, T) {
  const k = w / 540;
  if (world === 'laboratorio') {
    c.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 6; i++) { const p = (T * 0.35 + i / 6) % 1; circle(c, w * 0.8 + Math.sin(T * 2 + i) * 6 * k, h * 0.33 - 50 * k - p * 120 * k, (2 + 3 * (1 - p)) * k); c.globalAlpha = 1 - p; c.fill(); }
    c.globalAlpha = 1;
  } else if (world === 'espacio' || world === 'observatorio') {
    for (let i = 0; i < 7; i++) {
      const a = 0.5 + 0.5 * Math.sin(T * (1.3 + i * 0.37) + i * 2);
      const x = w * ((i * 0.137 + 0.08) % 1), y = h * GROUND_Y * ((i * 0.293 + 0.05) % 0.7);
      c.fillStyle = '#FFFFFF'; c.globalAlpha = a; c.fillRect(x - 1 * k, y - 6 * k * a, 2 * k, 12 * k * a); c.fillRect(x - 6 * k * a, y - 1 * k, 12 * k * a, 2 * k);
    }
    const sh = (T % 9) / 9;                              // estrella fugaz cada 9 s
    if (sh < 0.08) { const p = sh / 0.08; c.strokeStyle = '#FFFFFF'; c.globalAlpha = 1 - p; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(w * (0.1 + p * 0.5), h * (0.06 + p * 0.1)); c.lineTo(w * (0.04 + p * 0.5), h * (0.03 + p * 0.1)); c.stroke(); }
    c.globalAlpha = 1;
  } else if (world === 'aula' || world === 'biblioteca' || world === 'museo') {
    c.fillStyle = world === 'biblioteca' ? 'rgba(255,214,140,.45)' : 'rgba(255,255,255,.35)';
    for (let i = 0; i < 8; i++) { const p = (T * 0.08 + i / 8) % 1; circle(c, w * (0.1 + (i * 0.113) % 0.8) + Math.sin(T + i) * 8 * k, h * (0.5 - p * 0.42), 1.6 * k); c.fill(); }
  } else if (world === 'jardin') {
    for (let i = 0; i < 3; i++) {                        // mariposas
      const x = w * (0.2 + i * 0.3) + Math.sin(T * 0.7 + i * 2) * 40 * k, y = h * (0.18 + i * 0.06) + Math.sin(T * 1.3 + i) * 20 * k, f = Math.abs(Math.sin(T * 9 + i));
      c.fillStyle = ['#FFD166', '#F87171', '#C471ED'][i]; c.beginPath(); c.ellipse(x - 5 * k * f, y, 6 * k * f + 1, 8 * k, 0, 0, TAU); c.ellipse(x + 5 * k * f, y, 6 * k * f + 1, 8 * k, 0, 0, TAU); c.fill();
    }
  } else if (world === 'cocina') {
    c.fillStyle = 'rgba(255,255,255,.5)';                // vapor de la olla
    for (let i = 0; i < 5; i++) { const p = (T * 0.4 + i / 5) % 1; c.globalAlpha = 1 - p; circle(c, w * 0.84 + Math.sin(T * 2 + i) * 10 * k, h * GROUND_Y - 170 * k - p * 110 * k, (6 + 8 * p) * k); c.fill(); }
    c.globalAlpha = 1;
  }
}
