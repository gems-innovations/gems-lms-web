// Tema «estudio» · objetos para explicar (se cargan solo cuando una explicación los usa: theme.json → visuals).
//
// Cada objeto es una tarjeta de papel ilustrada que anima la idea de la explicación (una balanza que se inclina, un
// calendario que salta días, una palabra que marca sus letras, los planetas en fila). Tocar la repite; arrastrar la
// recorre a mano. Todo es Canvas 2D sin imágenes: se dibuja en un espacio de 200x200 que se escala a la tarjeta.
//
// Interfaz (la usa el motor, ver README):
//   createVisual({objeto, accion, valor}, {reducedMotion}) → { label, duration, draw(ctx, w, h, t), tap?(u, v), drag?(u, v) } | null
//   t = segundos desde que empezó (con movimiento reducido el motor pasa siempre t = duration: el estado final).

const TAU = Math.PI * 2;
const INK = '#1E1B4B', PAPER = '#FBF7EE', LINE = 'rgba(30,27,75,.08)', MARGIN = 'rgba(244,114,182,.35)';
const C = { morado: '#7B6FF0', cian: '#1FA9C9', magenta: '#C471ED', amarillo: '#F5B83D', verde: '#1F9D6B', rojo: '#E05555', gris: '#8A86A8' };
const FONT = w => `700 ${w}px Rubik, system-ui, sans-serif`;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const spring = x => { x = clamp(x); return 1 - Math.cos(x * 7) * Math.exp(-x * 5); };

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
/** Hoja de cuaderno: papel liso, renglones y margen. Deja el contexto en el espacio 200x200. */
function sheet(c, w, h) {
  c.fillStyle = PAPER; rr(c, 0, 0, w, h, Math.min(w, h) * 0.08); c.fill();
  c.save(); rr(c, 0, 0, w, h, Math.min(w, h) * 0.08); c.clip();
  c.fillStyle = LINE; for (let y = h * 0.12; y < h; y += h * 0.1) c.fillRect(0, y, w, 1);
  c.fillStyle = MARGIN; c.fillRect(w * 0.09, 0, 1.5, h);
  c.restore();
  const k = Math.min(w, h) / 200; c.translate((w - 200 * k) / 2, (h - 200 * k) / 2); c.scale(k, k);
}
function text(c, s, x, y, size = 14, color = INK, align = 'center') { c.font = FONT(size); c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
/** Pastilla con sombra dura (sin brillos). */
function chip(c, x, y, w, h, color, label, ink = '#fff', size = 13) {
  c.fillStyle = 'rgba(30,27,75,.22)'; rr(c, x + 2, y + 3, w, h, h / 2); c.fill();
  c.fillStyle = color; rr(c, x, y, w, h, h / 2); c.fill();
  if (label) text(c, label, x + w / 2, y + h / 2 + 0.5, size, ink);
}

// ───────────────────────── balanza ─────────────────────────
/** valor "0,5|0,45": se igualan los decimales (0,50 contra 0,45) y gana el lado más pesado. */
function balanza({ valor = '0,5|0,45' }) {
  const [a, b] = String(valor).split('|');
  const dec = s => (s.split(',')[1] || '').length, n = Math.max(dec(a), dec(b));
  const pad = s => (s.includes(',') ? s + '0'.repeat(n - dec(s)) : s);
  const va = parseFloat(a.replace(',', '.')), vb = parseFloat(b.replace(',', '.'));
  const goal = va === vb ? 0 : va > vb ? -0.22 : 0.22;            // ángulo final de la barra (negativo: baja la izquierda)
  let manual = null;
  return {
    label: `Balanza: ${a} pesa ${va > vb ? 'más' : va < vb ? 'menos' : 'lo mismo'} que ${b}, porque ${a} es ${pad(a)}.`,
    duration: 2.2,
    draw(c, w, h, t) {
      sheet(c, w, h);
      const ang = manual ?? goal * spring((t - 0.7) / 1.3);
      // soporte
      c.fillStyle = INK; rr(c, 92, 70, 16, 96, 4); c.fill(); rr(c, 60, 162, 80, 12, 6); c.fill();
      c.save(); c.translate(100, 70); c.rotate(ang);
      c.fillStyle = C.morado; rr(c, -78, -6, 156, 12, 6); c.fill();
      circle(c, 0, 0, 9); c.fillStyle = C.amarillo; c.fill();
      for (const [sx, val, col] of [[-66, a, C.cian], [66, b, C.magenta]]) {
        c.save(); c.translate(sx, 0); c.rotate(-ang);
        c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(-22, 40); c.moveTo(0, 0); c.lineTo(22, 40); c.stroke();
        c.fillStyle = INK; rr(c, -30, 38, 60, 8, 4); c.fill();
        const drop = ease(t / 0.6) ;
        const show = t < 1.1 ? val : pad(val);                     // a mitad se completan los decimales
        chip(c, -28, 38 - 26 - (1 - drop) * 30, 56, 24, col, show, '#fff', show.length > 4 ? 12 : 14);
        c.restore();
      }
      c.restore();
      const done = manual === null && t >= 1.1;
      text(c, done ? `${pad(a)}  ${va > vb ? '>' : va < vb ? '<' : '='}  ${pad(b)}` : 'Compara', 100, 190, 14, done ? C.verde : C.gris);
    },
    drag(u) { manual = (u - 0.5) * 0.7; },
    tap() { manual = null; return true; },
  };
}

// ───────────────────────── calendario ─────────────────────────
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIA_CLAVE = { lu: 0, ma: 1, mi: 2, ju: 3, vi: 4, sa: 5, do: 6 };
function calendario({ accion, valor = '' }) {
  if (accion === 'febrero') {
    let manual = null;
    return {
      label: 'Calendario de febrero: tiene 28 días (29 en año bisiesto); el día 30 no existe.',
      duration: 2.6,
      draw(c, w, h, t) {
        sheet(c, w, h);
        text(c, 'FEBRERO', 100, 22, 15, C.morado);
        const shown = manual ?? Math.floor(clamp(t / 1.6) * 28);
        for (let d = 1; d <= 30; d++) {
          const i = d - 1, x = 26 + (i % 7) * 22, y = 44 + Math.floor(i / 7) * 26;
          if (d > 29) {                                           // el 30 que no existe
            const s = t > 1.8 || manual !== null ? 1 : 0, j = s && manual === null ? Math.sin(t * 40) * 2 * clamp(2.4 - t) : 0;
            c.strokeStyle = C.rojo; c.lineWidth = 2; c.setLineDash([3, 3]); rr(c, x - 9 + j, y - 10, 18, 20, 4); c.stroke(); c.setLineDash([]);
            if (s) { text(c, '30', x + j, y, 11, C.rojo); c.strokeStyle = C.rojo; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 9 + j, y - 10); c.lineTo(x + 9 + j, y + 10); c.stroke(); }
            continue;
          }
          const on = d <= shown, leap = d === 29;
          c.fillStyle = leap ? 'rgba(123,111,240,.15)' : on ? C.cian : 'rgba(30,27,75,.08)';
          rr(c, x - 9, y - 10, 18, 20, 4); c.fill();
          text(c, String(d), x, y, 10, leap ? C.morado : on ? '#fff' : C.gris);
        }
        text(c, (manual ?? (t >= 1.8 ? 28 : shown)) >= 28 ? '28 días (29 si es bisiesto)' : `${shown} días`, 100, 190, 12, INK);
      },
      drag(u) { manual = Math.round(u * 28); },
      tap() { manual = null; return true; },
    };
  }
  // tira de la semana: «atras» (valor "mi|3": hoy miércoles, hace 3 días) o «manana» (valor "do": si mañana es domingo, ¿ayer?)
  const [k0, n0] = String(valor).split('|');
  const manana = accion === 'manana';
  const start = DIA_CLAVE[k0] ?? 2, hops = manana ? 2 : Number(n0) || 3;
  const end = (start - hops + 70) % 7;
  let manual = null;
  return {
    label: manana ? `Semana: si mañana es ${DIAS[start]}, hoy es ${DIAS[(start + 6) % 7]} y ayer fue ${DIAS[end]}.`
      : `Semana: hoy es ${DIAS[start]}; hace ${hops} días fue ${DIAS[end]}.`,
    duration: 0.6 + hops * 0.55 + 0.4,
    draw(c, w, h, t) {
      sheet(c, w, h);
      text(c, manana ? 'Mañana → hoy → ayer' : `Hace ${hops} días`, 100, 26, 14, C.morado);
      const step = manual ?? Math.min(hops, Math.floor(clamp((t - 0.4) / (hops * 0.55)) * hops));
      const cur = (start - Math.min(hops, step) + 70) % 7;
      for (let i = 0; i < 7; i++) {
        const x = 20 + i * 26.5, y = 92, isStart = i === start, isCur = i === cur;
        c.fillStyle = isCur ? (step >= hops ? C.verde : C.cian) : isStart ? 'rgba(123,111,240,.2)' : 'rgba(30,27,75,.07)';
        rr(c, x - 11, y - 22, 22, 44, 6); c.fill();
        text(c, DIAS[i][0].toUpperCase(), x, y, 15, isCur ? '#fff' : INK);
        if (isStart) text(c, manana ? 'mañana' : 'hoy', x, y + 34, 10, C.morado);
      }
      // saltos hacia atrás
      c.strokeStyle = C.amarillo; c.lineWidth = 2.5; c.lineCap = 'round';
      for (let s = 1; s <= Math.min(hops, step); s++) {
        const from = (start - s + 1 + 70) % 7, to = (start - s + 70) % 7;
        const x1 = 20 + from * 26.5, x2 = 20 + to * 26.5, tag = manana ? (s === 1 ? 'hoy' : 'ayer') : `-${s}`;
        if (to > from) {                                          // da la vuelta a la semana: sale por la izquierda y entra por la derecha
          c.beginPath(); c.moveTo(x1, 66); c.quadraticCurveTo(x1 - 8, 50, 2, 52); c.moveTo(198, 52); c.quadraticCurveTo(x2 + 8, 50, x2, 66); c.stroke();
          text(c, tag, x2, 44, 10, C.amarillo); continue;
        }
        c.beginPath(); c.moveTo(x1, 66); c.quadraticCurveTo((x1 + x2) / 2, 46, x2, 66); c.stroke();
        text(c, tag, (x1 + x2) / 2, 46, 10, C.amarillo);
      }
      const final = step >= hops;
      text(c, final ? `${manana ? 'Ayer' : 'Fue'}: ${DIAS[end]}` : 'Cuenta hacia atrás', 100, 170, 15, final ? C.verde : C.gris);
    },
    drag(u) { manual = Math.round(u * hops); },
    tap() { manual = null; return true; },
  };
}

// ───────────────────────── palabra ─────────────────────────
/** contar (valor "BANANA|A"), ultima (valor "TODO") o medio (valor "PARÍS"): fichas de letras que se marcan. */
function palabra({ accion, valor = '' }) {
  const [word0, mark] = String(valor).split('|'), word = (word0 || 'PALABRA').toUpperCase(), L = [...word];
  const targets = accion === 'contar' ? L.map((ch, i) => (ch === (mark || '').toUpperCase() ? i : -1)).filter(i => i >= 0)
    : accion === 'ultima' ? [L.length - 1] : [Math.floor((L.length - 1) / 2)];
  let lupa = null;
  const verb = accion === 'contar' ? `la ${mark} aparece ${targets.length} veces` : accion === 'ultima' ? `al final está la ${L[L.length - 1]}` : `en medio está la ${L[targets[0]]}`;
  return {
    label: `Palabra ${word}: ${verb}.`,
    duration: 0.5 + targets.length * 0.5 + 0.5,
    draw(c, w, h, t) {
      sheet(c, w, h);
      const n = L.length, size = Math.min(30, 168 / n - 4), gap = size + 4, x0 = 100 - (n * gap - 4) / 2 + size / 2;
      const lit = Math.min(targets.length, Math.floor(clamp((t - 0.5) / (targets.length * 0.5 || 1)) * targets.length + 0.999));
      L.forEach((ch, i) => {
        const x = x0 + i * gap, y = 86, k = targets.indexOf(i), on = k >= 0 && k < lit, under = lupa !== null && Math.abs(lupa - x) < gap / 2;
        const pop = on ? 1 + 0.15 * Math.max(0, 1 - (t - 0.5 - k * 0.5) * 4) : 1;
        c.save(); c.translate(x, y); c.scale(pop, pop);
        c.fillStyle = 'rgba(30,27,75,.2)'; rr(c, -size / 2 + 2, -size / 2 + 3, size, size * 1.15, 6); c.fill();
        c.fillStyle = on ? C.verde : under ? C.amarillo : '#fff'; rr(c, -size / 2, -size / 2, size, size * 1.15, 6); c.fill();
        c.strokeStyle = INK; c.lineWidth = 1.5; rr(c, -size / 2, -size / 2, size, size * 1.15, 6); c.stroke();
        text(c, ch, 0, size * 0.08, size * 0.6, on ? '#fff' : INK);
        if (on && accion === 'contar') { circle(c, size / 2 - 2, -size / 2, 8); c.fillStyle = C.morado; c.fill(); text(c, String(k + 1), size / 2 - 2, -size / 2 + 0.5, 10, '#fff'); }
        c.restore();
      });
      if (accion === 'medio' && lit) {                               // llaves desde los dos extremos hasta el centro
        const m = targets[0], xl = x0 - size / 2, xr = x0 + (n - 1) * gap + size / 2, xm = x0 + m * gap;
        c.strokeStyle = C.magenta; c.lineWidth = 2; c.beginPath(); c.moveTo(xl, 122); c.lineTo(xm - size / 2 - 2, 122); c.moveTo(xr, 122); c.lineTo(xm + size / 2 + 2, 122); c.stroke();
        text(c, `${m} letras`, (xl + xm) / 2, 134, 10, C.magenta); text(c, `${n - m - 1} letras`, (xr + xm) / 2, 134, 10, C.magenta);
      }
      const done = lit >= targets.length;
      text(c, done ? (accion === 'contar' ? `${targets.length} veces la ${mark}` : accion === 'ultima' ? `Al final: ${L[n - 1]}` : `En medio: ${L[targets[0]]}`) : 'Lee letra por letra', 100, 168, 15, done ? C.verde : C.gris);
    },
    drag(u) { lupa = u * 200; },
    tap() { lupa = null; return true; },
  };
}

// ───────────────────────── planetas ─────────────────────────
const PLANETAS = [['Mercurio', 3, '#B9A99A'], ['Venus', 5, '#F5B83D'], ['Tierra', 5.3, '#3F8FE0'], ['Marte', 4, '#E05555'], ['Júpiter', 15, '#D9A066'], ['Saturno', 12.5, '#E8C77A'], ['Urano', 8, '#7FD1DE'], ['Neptuno', 7.8, '#4F6BE0']];
/** cercano (Mercurio), grande (Júpiter) u ocho (se cuentan los 8). El Sol queda a la izquierda. */
function planetas({ accion }) {
  const pick = accion === 'cercano' ? 0 : accion === 'grande' ? 4 : -1;
  let lupa = null;
  return {
    label: accion === 'cercano' ? 'Sistema solar: Mercurio es el planeta más cercano al Sol.' : accion === 'grande' ? 'Sistema solar: Júpiter es el planeta más grande.' : 'Sistema solar: son 8 planetas, de Mercurio a Neptuno.',
    duration: 2.4,
    draw(c, w, h, t) {
      sheet(c, w, h);
      c.fillStyle = '#F5B83D'; circle(c, -6, 96, 34); c.fill();
      c.fillStyle = '#E8962B'; circle(c, -6, 96, 24); c.fill();
      let x = 36;
      PLANETAS.forEach(([name, r, col], i) => {
        const appear = ease((t - i * 0.12) / 0.35), cx = x + r, under = lupa !== null && Math.abs(lupa - cx) < Math.max(8, r + 3);
        x += r * 2 + 4.5;
        if (appear <= 0) return;
        const hi = (pick === i && t > 1.3) || under, grow = pick === 4 && i === 4 && t > 1.3 ? 1 + 0.12 * Math.sin(clamp((t - 1.3) / 0.6) * Math.PI) : 1;
        c.save(); c.translate(cx, 96); c.scale(appear * grow, appear * grow);
        c.fillStyle = 'rgba(30,27,75,.2)'; circle(c, 1.5, 2, r); c.fill();
        c.fillStyle = col; circle(c, 0, 0, r); c.fill();
        if (name === 'Saturno') { c.strokeStyle = '#B08D4A'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, r * 1.6, r * 0.4, -0.3, 0, TAU); c.stroke(); }
        if (hi) { c.strokeStyle = C.verde; c.lineWidth = 2.5; circle(c, 0, 0, r + 4); c.stroke(); }
        c.restore();
        if (accion === 'ocho' && t > 0.3 + i * 0.18) text(c, String(i + 1), cx, 128 + (i % 2) * 12, 11, C.morado);
        if (hi) text(c, name, cx, 62 - (i === 4 ? 10 : 0), 12, C.verde);
      });
      const done = t > 1.4;
      text(c, done ? (accion === 'cercano' ? 'El más cercano: Mercurio' : accion === 'grande' ? 'El más grande: Júpiter' : '8 planetas') : 'Sistema solar', 100, 172, 14, done ? C.verde : C.gris);
    },
    drag(u) { lupa = u * 200; },
    tap() { lupa = null; return true; },
  };
}

export const OBJECTS = { balanza, calendario, palabra, planetas };

export function createVisual(spec = {}, opts = {}) {
  const make = OBJECTS[spec.objeto];
  if (!make) return null;
  const v = make({ accion: spec.accion, valor: spec.valor }, opts);
  return v && typeof v.draw === 'function' ? v : null;
}
