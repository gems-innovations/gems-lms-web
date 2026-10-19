// Tema «minecraft» · objetos para explicar (se cargan solo cuando una explicación los usa: theme.json → visuals).
//
// Estilo de inventario de bloques: panel gris claro con biseles de un «píxel», casillas hundidas e iconos de 16x16
// dibujados por código (sin imágenes nuevas). Cada objeto anima la idea de la explicación: una mesa de crafteo que se
// llena, un pistón que no puede con la obsidiana, el reloj de día y noche, un cofre que da más señal mientras más lleno.
// Tocar repite; arrastrar lo recorre a mano. Se dibuja en un espacio de 200x200 que se escala a la tarjeta.
//
// Interfaz (la usa el motor, ver README):
//   createVisual({objeto, accion, valor}, {reducedMotion}) → { label, duration, draw(ctx, w, h, t), tap?(u, v), drag?(u, v) } | null

const TAU = Math.PI * 2;
const PANEL = '#C6C6C6', LIGHT = '#FFFFFF', DARK = '#555555', SLOT = '#8B8B8B', SLOT_D = '#373737', INK = '#3F3F3F';
// Letra de sistema en negrita: la pixelada, a este tamaño, hacía que un 2 pareciera un 8.
const FONT = s => `800 ${s}px 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };

/** Panel de inventario con biseles duros. Deja el contexto en el espacio 200x200. */
function panel(c, w, h) {
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  c.fillStyle = PANEL; c.fillRect(2, 2, w - 4, h - 4);
  c.fillStyle = LIGHT; c.fillRect(2, 2, w - 4, 3); c.fillRect(2, 2, 3, h - 4);
  c.fillStyle = DARK; c.fillRect(2, h - 5, w - 4, 3); c.fillRect(w - 5, 2, 3, h - 4);
  const k = Math.min(w, h) / 200; c.translate((w - 200 * k) / 2, (h - 200 * k) / 2); c.scale(k, k);
}
function slot(c, x, y, s) {
  c.fillStyle = SLOT; c.fillRect(x, y, s, s);
  c.fillStyle = SLOT_D; c.fillRect(x, y, s, 2); c.fillRect(x, y, 2, s);
  c.fillStyle = LIGHT; c.fillRect(x, y + s - 2, s, 2); c.fillRect(x + s - 2, y, 2, s);
}
function text(c, s, x, y, size = 13, color = INK, align = 'center') {
  c.font = FONT(size); c.textAlign = align; c.textBaseline = 'middle';
  // sin sombra: en letra pixelada pequeña la sombra desplazada confundía cifras (un 2 se leía como 8)
  c.fillStyle = color; c.fillText(s, x, y);
}

// ───────────────────────── iconos 16x16 ─────────────────────────
const sh = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`; };
/** Bloque con ruido (todas las caras de frente). */
const block = (base, spots = null) => (i, j) => (spots && rnd(i, j) > 0.86 ? spots : sh(base, 0.82 + rnd(i + 3, j + 7) * 0.3));
const ICONS = {
  tablon: (i, j) => (j % 4 === 0 ? '#6B4F2A' : (i + (j >> 2) * 5) % 9 === 0 ? '#7A5A30' : sh('#A0784A', 0.9 + rnd(i, j) * 0.15)),
  piedra: (i, j) => ((i % 5 === 0 || j % 4 === 0) && rnd(i >> 2, j >> 2) > 0.3 ? '#5A5A5A' : sh('#8A8A8A', 0.85 + rnd(i, j) * 0.25)),
  arena: block('#DBD3A0'), obsidiana: block('#1B1029', '#4B2C73'), lana: block('#E9ECEC'), lanaR: block('#B02E26'),
  piedraluminosa: block('#E8B84A', '#FFF0A0'),
  palo: (i, j) => (Math.abs(i + j - 15) <= 0 || Math.abs(i + j - 16) <= 0) && i > 2 && i < 13 ? (i > 7 ? '#5C3D1E' : '#8A5A2B') : null,
  hierro: (i, j) => (j >= 6 && j <= 10 && i >= 2 + (10 - j) * 0.5 && i <= 13 - (10 - j) * 0.3 ? (j === 6 ? '#FFFFFF' : j === 10 ? '#8A8A8A' : '#D8D8D8') : null),
  oro: (i, j) => (j >= 6 && j <= 10 && i >= 2 + (10 - j) * 0.5 && i <= 13 - (10 - j) * 0.3 ? (j === 6 ? '#FFFBC0' : j === 10 ? '#C08A1A' : '#F5D34A') : null),
  pepita: (i, j) => (Math.hypot(i - 8, j - 9) < 3.2 ? (i < 8 ? '#F0F0F0' : '#A8A8A8') : null),
  carbon: (i, j) => (Math.hypot(i - 8, j - 8) < 5.5 + rnd(i, j) ? (rnd(i, j) > 0.8 ? '#5A5A5A' : '#1E1E1E') : null),
  polvora: (i, j) => (j > 7 && Math.abs(i - 8) < (j - 6) * 0.9 && rnd(i, j) > 0.2 ? sh('#7A7A7A', 0.7 + rnd(i, j) * 0.6) : null),
  redstone: (i, j) => (j > 7 && Math.abs(i - 8) < (j - 6) * 0.9 && rnd(i, j) > 0.2 ? sh('#C41E1E', 0.7 + rnd(i, j) * 0.6) : null),
  papel: (i, j) => (i > 2 && i < 13 && j > 1 && j < 15 ? (j % 3 === 0 && i > 4 && i < 11 ? '#C9C9C9' : '#F4F4F4') : null),
  cuero: (i, j) => (Math.hypot((i - 8) * 0.9, j - 8) < 5.5 ? sh('#8B4A2B', 0.85 + rnd(i, j) * 0.3) : null),
  diamante: (i, j) => (Math.abs(i - 8) + Math.abs(j - 8) < 6 ? (i < 8 && j < 8 ? '#C8FFFA' : '#2FD3C9') : null),
  manzana: (i, j) => (j === 3 && i === 8 ? '#5C3D1E' : j === 4 && i === 9 ? '#3F8A2A' : Math.hypot(i - 8, j - 9.5) < 5.5 ? (i < 7 && j < 9 ? '#FF7070' : '#D02020') : null),
  manzanaOro: (i, j) => (j === 3 && i === 8 ? '#5C3D1E' : Math.hypot(i - 8, j - 9.5) < 5.5 ? (i < 7 && j < 9 ? '#FFF6B0' : '#E8B830') : null),
  libro: (i, j) => (i > 2 && i < 14 && j > 2 && j < 14 ? (i === 3 ? '#4A2A14' : j === 13 ? '#EDE6D0' : '#8B4A2B') : null),
  antorcha: (i, j) => (i >= 7 && i <= 8 && j >= 6 && j <= 14 ? '#8A5A2B' : i >= 6 && i <= 9 && j >= 3 && j <= 5 ? (j === 3 ? '#FFF6B0' : '#F5A623') : null),
  antorchaR: (i, j) => (i >= 7 && i <= 8 && j >= 6 && j <= 14 ? '#8A5A2B' : i >= 6 && i <= 9 && j >= 3 && j <= 5 ? (j === 3 ? '#FF8A8A' : '#C41E1E') : null),
  cofre: (i, j) => (j === 6 ? '#3A2410' : (i === 7 || i === 8) && j >= 5 && j <= 8 ? '#C9C9C9' : i === 0 || i === 15 || j === 0 || j === 15 ? '#3A2410' : sh('#A0682E', 0.9 + rnd(i, j) * 0.15)),
  cubo: (i, j) => (j >= 4 && j <= 13 && i >= 3 + (j - 4) * 0.25 && i <= 12 - (j - 4) * 0.25 ? (j === 4 ? '#3A3A3A' : i < 7 ? '#E0E0E0' : '#A8A8A8') : null),
  cama: (i, j) => (j >= 6 && j <= 11 ? (j <= 8 ? (i < 4 ? '#F4F4F4' : '#B02E26') : '#A0784A') : (j === 12 && (i < 2 || i > 13)) ? '#6B4F2A' : null),
  escudo: (i, j) => (i > 2 && i < 13 && j > 1 && j < 15 - Math.max(0, Math.abs(i - 7.5) - 3) ? (Math.hypot(i - 7.5, j - 7) < 2 ? '#D8D8D8' : sh('#A0784A', 0.9 + rnd(i, j) * 0.15)) : null),
  tnt: (i, j) => (j >= 6 && j <= 9 ? (j === 7 && i > 3 && i < 12 && i % 3 !== 0 ? '#000000' : '#F0F0F0') : sh('#D0352A', 0.85 + rnd(i, j) * 0.2)),
  horno: (i, j) => (j >= 9 && j <= 12 && i >= 4 && i <= 11 ? (j === 9 ? '#2A2A2A' : '#F5A623') : ICONS.piedra(i, j)),
  linterna: (i, j) => (j === 2 && i >= 6 && i <= 9 ? '#3A3A3A' : j >= 4 && j <= 13 && i >= 4 && i <= 11 ? (i === 4 || i === 11 || j === 4 || j === 13 ? '#4A4A4A' : '#FFC94A') : null),
  estanteria: (i, j) => (j <= 1 || j >= 14 ? '#A0784A' : j === 7 || j === 8 ? '#6B4F2A' : ['#B02E26', '#3F5FB8', '#3F8A2A', '#C9A230'][(i >> 1) % 4]),
  brujula: (i, j) => { const d = Math.hypot(i - 7.5, j - 7.5); return d > 6.5 ? null : d > 5.2 ? '#8A8A8A' : (Math.abs(i - 7.5) < 1 && j < 8 ? '#D02020' : '#E8E0C8'); },
  mesa: (i, j) => (j <= 4 ? (i < 2 || i > 13 ? '#2FD3C9' : '#B02E26') : j >= 5 ? sh('#1B1029', 0.8 + rnd(i, j) * 0.4) : null),
  palanca: (i, j) => (j >= 11 ? ICONS.piedra(i, j) : (i === j - 2 || i === j - 3) && i >= 5 && j <= 11 ? '#8A5A2B' : null),
  lampara: (i, j) => ((i % 5 === 0 || j % 5 === 0) ? '#7A3A10' : sh('#F5A623', 0.9 + rnd(i, j) * 0.2)),
  tolva: (i, j) => (j <= 5 ? (i === 0 || i === 15 || j === 0 ? '#3A3A3A' : j === 1 && i > 1 && i < 14 ? '#2A2A2A' : '#6A6A6A') : j <= 10 && i >= 3 + (j - 5) && i <= 12 - (j - 5) ? '#5A5A5A' : j > 10 && i >= 6 && i <= 9 ? '#4A4A4A' : null),
  tierra: block('#86603A'),
};
const NAMES = {
  tablon: 'tablón', piedra: 'piedra labrada', arena: 'arena', obsidiana: 'obsidiana', lana: 'lana', palo: 'palo', hierro: 'lingote de hierro', oro: 'lingote de oro',
  pepita: 'pepita de hierro', carbon: 'carbón', polvora: 'pólvora', redstone: 'polvo de redstone', papel: 'papel', cuero: 'cuero', diamante: 'diamante', manzana: 'manzana',
  libro: 'libro', cofre: 'cofre', piedraluminosa: 'piedra luminosa', antorcha: 'antorcha', manzanaOro: 'manzana dorada', cubo: 'cubo', cama: 'cama', escudo: 'escudo',
  tnt: 'dinamita (TNT)', horno: 'horno', linterna: 'linterna', estanteria: 'estantería', brujula: 'brújula', mesa: 'mesa de encantamiento', palanca: 'palanca',
  lampara: 'lámpara de redstone', tolva: 'tolva', antorchaR: 'antorcha de redstone',
};
/** Plural de un nombre del inventario («2 tablones», «8 lingotes de oro»). */
const PLURAL = { tablon: 'tablones', redstone: 'polvos de redstone', piedraluminosa: 'piedras luminosas', piedra: 'piedras labradas', papel: 'papeles' };
const plural = (k, n) => (n === 1 ? NAMES[k] : PLURAL[k] ?? NAMES[k].replace(/^\S+/, w => w + (/[aeiouáéó]$/.test(w) ? 's' : 'es')));
const iconCache = new Map();
/** Dibuja el icono `name` (16x16) en (x, y) con lado `s`. Se rasteriza una vez por nombre. */
function icon(c, name, x, y, s) {
  const fn = ICONS[name]; if (!fn) return;
  let img = iconCache.get(name);
  if (!img && typeof document !== 'undefined') {
    img = document.createElement('canvas'); img.width = img.height = 16; const g = img.getContext('2d');
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const col = fn(i, j); if (col) { g.fillStyle = col; g.fillRect(i, j, 1, 1); } }
    iconCache.set(name, img);
  }
  if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, x, y, s, s); return; }
  const p = s / 16;                                                    // sin DOM (pruebas): píxel a píxel
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const col = fn(i, j); if (col) { c.fillStyle = col; c.fillRect(x + i * p, y + j * p, p, p); } }
}

// ───────────────────────── receta (mesa de crafteo) ─────────────────────────
const _ = null;
const RECETAS = {
  palos: { grid: [_, _, _, _, 'tablon', _, _, 'tablon', _], out: 'palo', n: 4 },
  cubo: { grid: ['hierro', _, 'hierro', _, 'hierro', _, _, _, _], out: 'cubo', n: 1 },
  cama: { grid: ['lana', 'lana', 'lana', 'tablon', 'tablon', 'tablon', _, _, _], out: 'cama', n: 1 },
  escudo: { grid: ['tablon', 'hierro', 'tablon', 'tablon', 'tablon', 'tablon', _, 'tablon', _], out: 'escudo', n: 1 },
  'manzana-oro': { grid: ['oro', 'oro', 'oro', 'oro', 'manzana', 'oro', 'oro', 'oro', 'oro'], out: 'manzanaOro', n: 1 },
  tnt: { grid: ['polvora', 'arena', 'polvora', 'arena', 'polvora', 'arena', 'polvora', 'arena', 'polvora'], out: 'tnt', n: 1 },
  antorcha: { grid: [_, 'carbon', _, _, 'palo', _, _, _, _], out: 'antorcha', n: 4 },
  horno: { grid: ['piedra', 'piedra', 'piedra', 'piedra', _, 'piedra', 'piedra', 'piedra', 'piedra'], out: 'horno', n: 1 },
  linterna: { grid: ['pepita', 'pepita', 'pepita', 'pepita', 'antorcha', 'pepita', 'pepita', 'pepita', 'pepita'], out: 'linterna', n: 1 },
  libro: { grid: ['papel', 'papel', _, 'papel', 'cuero', _, _, _, _], out: 'libro', n: 1 },
  estanteria: { grid: ['tablon', 'tablon', 'tablon', 'libro', 'libro', 'libro', 'tablon', 'tablon', 'tablon'], out: 'estanteria', n: 1 },
  brujula: { grid: [_, 'hierro', _, 'hierro', 'redstone', 'hierro', _, 'hierro', _], out: 'brujula', n: 1 },
  'mesa-encantar': { grid: [_, 'libro', _, 'diamante', 'obsidiana', 'diamante', 'obsidiana', 'obsidiana', 'obsidiana'], out: 'mesa', n: 1 },
  palanca: { grid: [_, 'palo', _, _, 'piedra', _, _, _, _], out: 'palanca', n: 1 },
  lampara: { grid: [_, 'redstone', _, 'redstone', 'piedraluminosa', 'redstone', _, 'redstone', _], out: 'lampara', n: 1 },
  tolva: { grid: ['hierro', _, 'hierro', 'hierro', 'cofre', 'hierro', _, 'hierro', _], out: 'tolva', n: 1 },
  'antorcha-redstone': { grid: [_, 'redstone', _, _, 'palo', _, _, _, _], out: 'antorchaR', n: 1 },
};
export const RECIPE_NAMES = Object.freeze(Object.keys(RECETAS));
function receta({ valor }) {
  const r = RECETAS[valor]; if (!r) return null;
  const filled = r.grid.map((x, i) => [x, i]).filter(([x]) => x);
  const counts = {}; for (const [x] of filled) counts[x] = (counts[x] || 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${plural(k, n)}`);
  const STEP = 0.16, end = filled.length * STEP + 0.3;
  let manual = null;
  return {
    label: `Mesa de crafteo: ${parts.join(', ')} dan ${r.n} ${plural(r.out, r.n)}.`,
    duration: end + 0.6,
    draw(c, w, h, t) {
      panel(c, w, h);
      const title = `${r.n} ${plural(r.out, r.n)}`;
      text(c, title[0].toUpperCase() + title.slice(1), 100, 20, title.length > 20 ? 13 : 15);
      const shown = manual ?? Math.min(filled.length, Math.floor(t / STEP));
      for (let i = 0; i < 9; i++) slot(c, 14 + (i % 3) * 34, 40 + Math.floor(i / 3) * 34, 32);
      filled.slice(0, shown).forEach(([name, i], n) => {
        const pop = manual === null ? ease((t - n * STEP) / 0.12) : 1, s = 26 * pop;
        icon(c, name, 14 + (i % 3) * 34 + 16 - s / 2, 40 + Math.floor(i / 3) * 34 + 16 - s / 2, s);
      });
      // flecha que se llena y resultado
      const fill = manual !== null ? (shown >= filled.length ? 1 : 0) : clamp((t - filled.length * STEP) / 0.3);
      c.fillStyle = SLOT; c.fillRect(124, 86, 22, 8); c.fillRect(140, 80, 4, 20); c.fillRect(144, 83, 4, 14); c.fillRect(148, 86, 4, 8);
      c.fillStyle = '#FFFFFF'; c.fillRect(124, 86, 22 * fill, 8);
      slot(c, 158, 72, 36);
      if (fill >= 1) {
        const pop = manual === null ? ease((t - end) / 0.25) : 1;
        icon(c, r.out, 176 - 14 * pop, 90 - 14 * pop, 28 * pop);
        if (r.n > 1) text(c, String(r.n), 190, 104, 13, '#FFFFFF', 'right');
      }
      const line = parts.join(' + ');
      if (line.length > 22) { const mid = Math.ceil(parts.length / 2); text(c, parts.slice(0, mid).join(' + '), 100, 156, 12); text(c, '+ ' + parts.slice(mid).join(' + '), 100, 174, 12); }
      else text(c, line, 100, 166, 13);
    },
    drag(u) { manual = Math.round(u * filled.length); },
    tap() { manual = null; return true; },
  };
}

// ───────────────────────── pistón ─────────────────────────
/** bloquea: empuja tierra (se mueve) y luego obsidiana (no se mueve). Arrastrar empuja la obsidiana a mano. */
function piston() {
  let manual = null;
  const draw = (c, ext, blockName, blockX, jitter) => {
    // pistón: base de piedra, cabeza de madera y brazo
    const bx = 18, by = 78, s = 40;
    icon(c, 'piedra', bx, by, s);
    c.fillStyle = '#A0784A'; c.fillRect(bx + s - 6 + ext, by - 2, 10, s + 4);
    c.fillStyle = '#6B4F2A'; c.fillRect(bx + s - 6 + ext, by - 2, 10, 3);
    c.fillStyle = '#9A9A9A'; c.fillRect(bx + s - 6, by + s / 2 - 4, Math.max(0, ext), 8);
    icon(c, blockName, blockX + jitter, by, s);
  };
  return {
    label: 'Pistón: empuja un bloque de tierra, pero la obsidiana no se mueve, igual que la piedra base.',
    duration: 2.8,
    draw(c, w, h, t) {
      panel(c, w, h);
      text(c, 'Pistón', 100, 20, 15);
      c.fillStyle = '#9E9E9E'; c.fillRect(8, 122, 184, 6);
      if (manual !== null) {
        const ext = manual * 20, contact = 4;                      // la obsidiana para la cabeza al tocarla
        const e = Math.min(ext, contact);
        draw(c, e, 'obsidiana', 68, ext > contact ? Math.sin(ext) * 1.5 : 0);
        text(c, ext > contact ? '¡No se mueve!' : 'Empuja…', 100, 152, 14, ext > contact ? '#B02E26' : INK);
      } else if (t < 1.3) {                                      // 1) tierra: se mueve un bloque
        const p = ease((t - 0.3) / 0.5), back = t > 1 ? ease((t - 1) / 0.3) : 0, ext = 36 * p * (1 - back);
        draw(c, ext, 'tierra', 68 + 36 * p, 0);
        text(c, 'Tierra: se mueve', 100, 152, 14, '#2E7D32');
      } else {                                                   // 2) obsidiana: la cabeza se traba
        const k = t - 1.3, ext = Math.min(4, k * 30), shake = k < 0.9 ? Math.sin(k * 60) * 2 * (1 - k / 0.9) : 0;
        draw(c, ext, 'obsidiana', 68, shake);
        if (k > 0.5) { c.strokeStyle = '#B02E26'; c.lineWidth = 5; c.beginPath(); c.moveTo(130, 76); c.lineTo(160, 112); c.moveTo(160, 76); c.lineTo(130, 112); c.stroke(); }
        text(c, k > 0.5 ? 'Obsidiana: no se mueve' : 'Obsidiana…', 100, 152, 14, k > 0.5 ? '#B02E26' : INK);
      }
    },
    drag(u) { manual = u; },
    tap() { manual = null; return true; },
  };
}

// ───────────────────────── reloj de día y noche ─────────────────────────
/** dia: un día completo dura 20 minutos (10 de día, 7 de noche, el resto amanecer y atardecer). cama: dormir salta la noche. */
function reloj({ accion }) {
  const SEG = [['Día', 10, '#F5D34A'], ['Atardecer', 1.5, '#F08A3A'], ['Noche', 7, '#1E2A5A'], ['Amanecer', 1.5, '#E8A0B0']];
  const cama = accion === 'cama';
  let manual = null;
  const at = m => { let acc = 0; for (const s of SEG) { if (m < acc + s[1]) return s; acc += s[1]; } return SEG[0]; };
  return {
    label: cama ? 'Reloj de día y noche: al dormir en una cama la noche se salta y amanece.' : 'Reloj de día y noche: un día completo del juego dura 20 minutos reales.',
    duration: cama ? 2.4 : 2.6,
    draw(c, w, h, t) {
      panel(c, w, h);
      // minuto del ciclo (0-20)
      let m;
      if (manual !== null) m = manual * 20;
      else if (cama) m = t < 1.2 ? 12 + t * 2 : t < 1.6 ? 14.4 : 14.4 + 5.6 * ease((t - 1.6) / 0.6);
      else m = 20 * ease(t / 2.3);
      const cx = 100, cy = 92, R = 58;
      // aros por tramo (píxeles grandes: el aro se dibuja con segmentos rectos)
      let acc = 0;
      for (const [, len, col] of SEG) {
        const a0 = acc / 20 * TAU - Math.PI / 2, a1 = (acc + len) / 20 * TAU - Math.PI / 2;
        c.fillStyle = col; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath(); c.fill();
        acc += len;
      }
      c.fillStyle = PANEL; c.beginPath(); c.arc(cx, cy, R - 16, 0, TAU); c.fill();
      c.fillStyle = '#000'; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU - Math.PI / 2; c.fillRect(cx + Math.cos(a) * (R + 4) - 1, cy + Math.sin(a) * (R + 4) - 1, 3, 3); }
      // aguja con sol o luna
      const a = (m % 20) / 20 * TAU - Math.PI / 2, seg = at(m % 20);
      c.strokeStyle = '#3F3F3F'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); c.stroke();
      const ix = cx + Math.cos(a) * (R - 6) - 9, iy = cy + Math.sin(a) * (R - 6) - 9;
      c.fillStyle = seg[0] === 'Noche' ? '#E8ECFF' : '#FFE04A'; c.fillRect(ix, iy, 18, 18); c.fillStyle = '#000'; c.fillRect(ix, iy, 18, 2); c.fillRect(ix, iy + 16, 18, 2); c.fillRect(ix, iy, 2, 18); c.fillRect(ix + 16, iy, 2, 18);
      text(c, `${Math.min(20, Math.round(m))} min`, cx, cy - 6, 15);
      text(c, seg[0], cx, cy + 12, 12, '#5A5A5A');
      if (cama) { icon(c, 'cama', 150, 140, 30); if (manual === null && t >= 1.2 && t < 1.7) text(c, 'Zzz', 168, 132, 13, '#3F5FB8'); }
      text(c, cama ? (manual === null && t > 2 ? '¡Amaneció!' : 'Duerme y salta la noche') : '1 día = 20 minutos', cama ? 70 : 100, 176, 13, cama && t > 2 ? '#2E7D32' : INK);
    },
    drag(u) { manual = u; },
    tap() { manual = null; return true; },
  };
}

// ───────────────────────── comparador ─────────────────────────
/** cofre: más lleno el cofre → más fuerte la señal (0 a 15). Arrastrar llena o vacía el cofre. */
function comparador() {
  let manual = null;
  return {
    label: 'Comparador detrás de un cofre: mientras más lleno está el cofre, más fuerte es la señal de redstone, hasta 15.',
    duration: 2.6,
    draw(c, w, h, t) {
      panel(c, w, h);
      text(c, 'Comparador', 100, 20, 15);
      const fill = manual ?? ease(t / 2.2), signal = fill <= 0 ? 0 : Math.min(15, 1 + Math.floor(fill * 14));
      // cofre con su barra de llenado
      icon(c, 'cofre', 14, 44, 48);
      slot(c, 14, 98, 48); c.fillStyle = '#A0682E'; c.fillRect(17, 98 + 45 - 42 * fill, 42, 42 * fill);
      text(c, `${Math.round(fill * 100)} %`, 38, 156, 12);
      // comparador y línea de redstone: 15 tramos que se encienden
      c.fillStyle = '#A8A8A8'; c.fillRect(70, 60, 26, 26); c.fillStyle = signal ? '#FF3A2A' : '#5A1010'; c.fillRect(74, 64, 6, 6); c.fillRect(86, 64, 6, 6); c.fillRect(80, 76, 6, 6);
      for (let i = 0; i < 15; i++) {
        const on = i < signal, x = 100 + (i % 5) * 18, y = 60 + Math.floor(i / 5) * 20;
        c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, 16, 12);
        c.fillStyle = on ? (i === signal - 1 ? '#FF6A4A' : '#E0201A') : '#4A1010'; c.fillRect(x, y, 14, 10);
      }
      text(c, `Señal: ${signal}`, 140, 136, 16, signal ? '#B02E26' : INK);
    },
    drag(u) { manual = u; },
    tap() { manual = null; return true; },
  };
}

export const OBJECTS = { receta, piston, reloj, comparador };

export function createVisual(spec = {}, opts = {}) {
  const make = OBJECTS[spec.objeto];
  if (!make) return null;
  const v = make({ accion: spec.accion, valor: spec.valor }, opts);
  return v && typeof v.draw === 'function' ? v : null;
}
