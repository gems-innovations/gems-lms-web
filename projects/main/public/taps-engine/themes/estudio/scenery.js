// Tema «estudio» · escenarios ilustrados (planos, colores de GEMS). Se pintan UNA vez por mundo y tamaño en un
// lienzo aparte y cada fotograma solo los copia (un drawImage); encima va un detalle animado muy barato (burbujas,
// estrellas que titilan, polvo de tiza).
// Unidades: todo se dibuja en un lienzo de 540x960 escalado por k = ancho / 540.

const TAU = Math.PI * 2;
export const GROUND_Y = 0.5;                         // línea del piso como fracción del alto
export const FONT = '"Rubik", system-ui, -apple-system, "Segoe UI", sans-serif';

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
/** Aleatorio con semilla: el mismo cielo cada vez. */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function sky(c, w, h, sc) {
  const g = c.createLinearGradient(0, 0, 0, h * GROUND_Y);
  g.addColorStop(0, sc.sky?.[0] || '#1E1B4B'); g.addColorStop(1, sc.sky?.[1] || '#3B2F86');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function floor(c, w, h, color, dark) {
  const y = h * GROUND_Y; c.fillStyle = color; c.fillRect(0, y, w, h - y);
  c.fillStyle = dark; c.fillRect(0, y, w, 6);
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

const WORLDS = {
  laboratorio(c, w, h, k, sc) {
    sky(c, w, h, sc);
    // azulejos hexagonales muy suaves
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 2 * k;
    const r = 34 * k;
    for (let row = 0; row * r * 1.5 < h * GROUND_Y + r; row++) for (let col = -1; col * r * 1.732 < w + r; col++) {
      const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0), cy = row * r * 1.5;
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); c.stroke();
    }
    // ventana redonda con el cielo
    c.fillStyle = '#4F46E5'; circle(c, w * 0.79, h * 0.13, 58 * k); c.fill();
    c.fillStyle = '#9B8FF8'; circle(c, w * 0.79, h * 0.13, 46 * k); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; circle(c, w * 0.79 + 14 * k, h * 0.13 - 12 * k, 12 * k); c.fill();
    c.strokeStyle = '#4F46E5'; c.lineWidth = 6 * k; c.beginPath(); c.moveTo(w * 0.79 - 46 * k, h * 0.13); c.lineTo(w * 0.79 + 46 * k, h * 0.13); c.stroke();
    // repisas a los lados
    const shelf = (x0, x1, y) => { c.fillStyle = '#E9E6FF'; rr(c, x0, y, x1 - x0, 10 * k, 4 * k); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x0 + 8 * k, y + 10 * k, x1 - x0 - 16 * k, 6 * k); };
    shelf(-10 * k, w * 0.3, h * 0.22); shelf(-10 * k, w * 0.27, h * 0.38); shelf(w * 0.72, w + 10 * k, h * 0.33);
    flask(c, w * 0.07, h * 0.22, k * 1.1, '#4DE1FF'); beaker(c, w * 0.17, h * 0.22, k, '#C471ED'); tube(c, w * 0.25, h * 0.22, k, '#34D399');
    beaker(c, w * 0.06, h * 0.38, k * 0.9, '#FFD166'); flask(c, w * 0.15, h * 0.38, k, '#F87171'); tube(c, w * 0.21, h * 0.38, k, '#4DE1FF');
    flask(c, w * 0.8, h * 0.33, k * 1.2, '#34D399'); tube(c, w * 0.9, h * 0.33, k, '#C471ED'); beaker(c, w * 0.97, h * 0.33, k * 0.9, '#4DE1FF');
    // tabla periódica de juguete
    const colors = ['#C471ED', '#4DE1FF', '#34D399', '#FFD166', '#9B8FF8'];
    for (let i = 0; i < 12; i++) { c.fillStyle = colors[i % 5]; c.globalAlpha = 0.5; rr(c, w * 0.74 + (i % 4) * 26 * k, h * 0.2 + ((i / 4) | 0) * 26 * k, 22 * k, 22 * k, 4 * k); c.fill(); }
    c.globalAlpha = 1;
    floor(c, w, h, '#2A2566', '#4F46E5');
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 9; i++) c.fillRect(i * w / 8 - 2 * k, h * GROUND_Y + 6 * k, 4 * k, h);
  },
  espacio(c, w, h, k, sc) {
    sky(c, w, h, sc);
    const R = rng(7);
    const blob = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
    blob(w * 0.2, h * 0.18, 260 * k, 'rgba(196,113,237,.28)'); blob(w * 0.85, h * 0.42, 240 * k, 'rgba(77,225,255,.16)');
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 90; i++) { c.globalAlpha = 0.35 + R() * 0.65; circle(c, R() * w, R() * h * GROUND_Y, (0.8 + R() * 1.8) * k); c.fill(); }
    c.globalAlpha = 1;
    // planeta con anillo
    const px = w * 0.8, py = h * 0.14, pr = 52 * k;
    c.strokeStyle = 'rgba(77,225,255,.85)'; c.lineWidth = 7 * k; c.beginPath(); c.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, Math.PI, TAU); c.stroke();
    c.fillStyle = '#C471ED'; circle(c, px, py, pr); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(px - pr * 0.1, py - pr * 0.25, pr * 0.9, pr * 0.18, -0.35, 0, TAU); c.fill();
    c.fillStyle = 'rgba(30,27,75,.25)'; c.beginPath(); c.ellipse(px + pr * 0.1, py + pr * 0.3, pr * 0.85, pr * 0.16, -0.35, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, 0, Math.PI); c.stroke();
    // luna pequeña
    c.fillStyle = '#E9E6FF'; circle(c, w * 0.14, h * 0.36, 22 * k); c.fill(); c.fillStyle = 'rgba(30,27,75,.18)'; circle(c, w * 0.14 + 6 * k, h * 0.36 - 5 * k, 6 * k); c.fill();
    // suelo de asteroide curvo con cráteres
    const gy = h * GROUND_Y;
    c.fillStyle = '#3A3566'; c.beginPath(); c.moveTo(0, gy + 30 * k); c.quadraticCurveTo(w / 2, gy - 40 * k, w, gy + 30 * k); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#4A4480'; c.beginPath(); c.moveTo(0, gy + 30 * k); c.quadraticCurveTo(w / 2, gy - 40 * k, w, gy + 30 * k); c.lineTo(w, gy + 44 * k); c.quadraticCurveTo(w / 2, gy - 26 * k, 0, gy + 44 * k); c.closePath(); c.fill();
    c.fillStyle = 'rgba(8,7,16,.3)';
    [[0.18, 0.05, 30, 9], [0.7, 0.04, 22, 7], [0.42, 0.09, 40, 11], [0.88, 0.1, 18, 6]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(w * x, gy + h * y, rx * k, ry * k, 0, 0, TAU); c.fill(); });
  },
  aula(c, w, h, k, sc) {
    sky(c, w, h, sc);
    // pizarra
    const bx = w * 0.06, by = h * 0.08, bw = w * 0.88, bh = h * 0.38;
    c.fillStyle = '#E9E6FF'; rr(c, bx - 10 * k, by - 10 * k, bw + 20 * k, bh + 20 * k, 18 * k); c.fill();
    c.fillStyle = '#1F4A44'; rr(c, bx, by, bw, bh, 12 * k); c.fill();
    c.fillStyle = 'rgba(255,255,255,.04)'; rr(c, bx + 10 * k, by + 10 * k, bw * 0.5, bh * 0.25, 10 * k); c.fill();
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
    // tablones del piso
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 6; i++) c.fillRect(0, h * GROUND_Y + (20 + i * 46) * k, w, 3 * k);
  },
};
export const WORLD_NAMES = Object.freeze(Object.keys(WORLDS));

/** Pinta el fondo fijo del mundo `world` en el lienzo `c` (de ancho w y alto h). */
export function paintWorld(c, w, h, world, sceneColors = {}) {
  const k = w / 540;
  (WORLDS[world] || WORLDS.laboratorio)(c, w, h, k, sceneColors);
}

/** Detalle animado encima del fondo (muy barato: menos de 15 figuras por fotograma). */
export function paintAmbient(c, w, h, world, T) {
  const k = w / 540;
  if (world === 'laboratorio') {
    c.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 6; i++) { const p = (T * 0.35 + i / 6) % 1; circle(c, w * 0.8 + Math.sin(T * 2 + i) * 6 * k, h * 0.33 - 50 * k - p * 120 * k, (2 + 3 * (1 - p)) * k); c.globalAlpha = 1 - p; c.fill(); }
    c.globalAlpha = 1;
  } else if (world === 'espacio') {
    for (let i = 0; i < 7; i++) {
      const a = 0.5 + 0.5 * Math.sin(T * (1.3 + i * 0.37) + i * 2);
      const x = w * ((i * 0.137 + 0.08) % 1), y = h * GROUND_Y * ((i * 0.293 + 0.05) % 0.9);
      c.fillStyle = '#FFFFFF'; c.globalAlpha = a; c.fillRect(x - 1 * k, y - 6 * k * a, 2 * k, 12 * k * a); c.fillRect(x - 6 * k * a, y - 1 * k, 12 * k * a, 2 * k);
    }
    const sh = (T % 9) / 9;                              // estrella fugaz cada 9 s
    if (sh < 0.08) { const p = sh / 0.08; c.strokeStyle = '#FFFFFF'; c.globalAlpha = 1 - p; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(w * (0.1 + p * 0.5), h * (0.06 + p * 0.1)); c.lineTo(w * (0.04 + p * 0.5), h * (0.03 + p * 0.1)); c.stroke(); }
    c.globalAlpha = 1;
  } else if (world === 'aula') {
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 8; i++) { const p = (T * 0.08 + i / 8) % 1; circle(c, w * (0.1 + (i * 0.113) % 0.8) + Math.sin(T + i) * 8 * k, h * (0.5 - p * 0.42), 1.6 * k); c.fill(); }
  }
}
