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

// ═════════════════════════ escenas de PREGUNTA (theme.json → escenas) ═════════════════════════
// Diagramas de cuaderno de lo que se pregunta (nunca la respuesta): un esqueleto con «?», un vaso con hielo, una tormenta…
// Entran en menos de un segundo y quedan quietos (no gastan fotogramas mientras se piensa).
//   createEscena({ tipo: 'diagrama', cosa }, { reducedMotion }) → { label, duration, draw(ctx, w, h, t) } | null
const BONE = '#F4F1E8';
function hueso(c, x1, y1, x2, y2, r = 5) {
  c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = r * 2 + 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = BONE; c.lineWidth = r * 2 - 1; c.stroke();
  for (const [x, y] of [[x1, y1], [x2, y2]]) { circle(c, x, y, r + 1.5); c.fillStyle = INK; c.fill(); circle(c, x, y, r); c.fillStyle = BONE; c.fill(); }
}
function interroga(c, x, y, color = C.magenta, r = 15) { c.fillStyle = 'rgba(30,27,75,.22)'; circle(c, x + 2, y + 3, r); c.fill(); c.fillStyle = color; circle(c, x, y, r); c.fill(); text(c, '?', x, y + 1, r * 1.3, '#fff'); }
const entra = (t, d = 0) => ease((t - d) / 0.45);
function corazon(c, x, y, s, color) { c.fillStyle = color; c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); c.fill(); }

const ESCENAS = {
  esqueleto: () => ({
    label: 'Un esqueleto humano',
    draw(c, w, h, t) {
      sheet(c, w, h); const k = entra(t);
      c.save(); c.translate(100, 104); c.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); c.translate(-100, -104); c.globalAlpha = clamp(k * 1.5);
      hueso(c, 100, 52, 100, 122, 4);
      for (let i = 0; i < 4; i++) { const y = 66 + i * 11; c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(100, y + 14, 24 - i * 2, -2.6, -0.54); c.stroke(); c.strokeStyle = BONE; c.lineWidth = 2.4; c.stroke(); }
      hueso(c, 84, 64, 64, 96); hueso(c, 64, 96, 58, 126); hueso(c, 116, 64, 136, 96); hueso(c, 136, 96, 142, 126);
      c.fillStyle = INK; rr(c, 82, 120, 36, 14, 6); c.fill(); c.fillStyle = BONE; rr(c, 84, 122, 32, 10, 5); c.fill();
      hueso(c, 90, 134, 86, 166); hueso(c, 86, 166, 86, 186); hueso(c, 110, 134, 114, 166); hueso(c, 114, 166, 114, 186);
      circle(c, 100, 36, 19); c.fillStyle = INK; c.fill(); circle(c, 100, 36, 16.5); c.fillStyle = BONE; c.fill();
      c.fillStyle = INK; circle(c, 93, 34, 4.5); c.fill(); circle(c, 107, 34, 4.5); c.fill(); c.fillRect(96, 46, 8, 2);
      c.restore();
      if (t > 0.45) interroga(c, 162, 52);
    },
  }),
  pulpo: () => ({
    label: 'Un pulpo y un corazón con signo de pregunta',
    draw(c, w, h, t) {
      sheet(c, w, h); const k = entra(t), sw = Math.sin(t * 5) * (1 - k) * 6;
      c.strokeStyle = C.magenta; c.lineWidth = 9; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const x0 = 70 + i * 8.5, dir = i < 4 ? -1 : 1; c.beginPath(); c.moveTo(x0, 110); c.bezierCurveTo(x0 + dir * 10, 140, x0 - dir * 14 + sw, 160, x0 + dir * (6 + i % 3 * 6), 182); c.stroke(); }
      c.fillStyle = C.magenta; c.beginPath(); c.ellipse(100, 82, 38, 44, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; circle(c, 86, 88, 8); c.fill(); circle(c, 114, 88, 8); c.fill(); c.fillStyle = INK; circle(c, 88, 90, 4); c.fill(); circle(c, 116, 90, 4); c.fill();
      c.globalAlpha = clamp((t - 0.3) / 0.3); corazon(c, 160, 40, 16, C.rojo); chip(c, 136, 64, 50, 22, INK, '× ?', '#fff', 14); c.globalAlpha = 1;
    },
  }),
  'vaso-hielo': () => ({
    label: 'Un vaso de agua con un cubo de hielo',
    draw(c, w, h, t) {
      sheet(c, w, h); const k = entra(t), cy = 74 + (1 - k) * -50;
      c.fillStyle = 'rgba(77,163,255,.45)'; c.beginPath(); c.moveTo(56, 88); c.lineTo(144, 88); c.lineTo(136, 180); c.lineTo(64, 180); c.closePath(); c.fill();
      c.fillStyle = '#DDF6FF'; rr(c, 82, cy, 36, 30, 6); c.fill(); c.strokeStyle = C.cian; c.lineWidth = 2.5; rr(c, 82, cy, 36, 30, 6); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(88, cy + 5, 8, 4);
      c.strokeStyle = INK; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); c.moveTo(50, 40); c.lineTo(64, 184); c.lineTo(136, 184); c.lineTo(150, 40); c.stroke();
      c.strokeStyle = C.cian; c.lineWidth = 2; c.beginPath(); c.moveTo(54, 88); c.lineTo(146, 88); c.stroke();
      if (t > 0.5) interroga(c, 162, 66);
    },
  }),
  tormenta: () => ({
    label: 'Una tormenta: un relámpago, un ojo y un oído',
    draw(c, w, h, t) {
      sheet(c, w, h);
      c.fillStyle = C.gris; for (const [x, y, r] of [[52, 52, 22], [78, 42, 26], [104, 54, 20], [70, 62, 20]]) { circle(c, x, y, r); c.fill(); }
      c.globalAlpha = Math.sin(clamp(t / 0.9) * Math.PI * 3) > 0 || t >= 0.9 ? 1 : 0.35;
      c.fillStyle = C.amarillo; c.beginPath(); c.moveTo(80, 76); c.lineTo(64, 116); c.lineTo(78, 116); c.lineTo(66, 152); c.lineTo(96, 104); c.lineTo(82, 104); c.lineTo(94, 76); c.closePath(); c.fill(); c.globalAlpha = 1;
      // ojo (1) y oído (2)
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(152, 70, 22, 12, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; circle(c, 152, 70, 6); c.fill();
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(150, 136, 16, -2.6, 1.6); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(152, 136, 6, -2.4, 1.2); c.stroke();
      chip(c, 112, 60, 22, 22, C.morado, '1', '#fff', 13); chip(c, 112, 126, 22, 22, C.morado, '2', '#fff', 13);
    },
  }),
  'olla-altura': () => ({
    label: 'Una olla hirviendo en lo alto de una montaña, con un termómetro',
    draw(c, w, h, t) {
      sheet(c, w, h);
      c.fillStyle = '#8FCBA6'; c.beginPath(); c.moveTo(14, 186); c.lineTo(84, 70); c.lineTo(154, 186); c.closePath(); c.fill();
      c.fillStyle = '#E9F4FF'; c.beginPath(); c.moveTo(70, 93); c.lineTo(84, 70); c.lineTo(98, 93); c.lineTo(90, 88); c.lineTo(84, 96); c.lineTo(77, 88); c.closePath(); c.fill();
      c.fillStyle = INK; c.fillRect(83, 40, 2.5, 32); c.fillStyle = C.rojo; c.beginPath(); c.moveTo(85.5, 40); c.lineTo(112, 47); c.lineTo(85.5, 54); c.closePath(); c.fill();
      text(c, '2.600 m', 118, 30, 13);
      c.fillStyle = '#5C5C78'; rr(c, 60, 130, 48, 30, 6); c.fill(); c.fillRect(54, 128, 60, 6);
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { const p = (t * 1.2 + i / 3) % 1; circle(c, 72 + i * 12, 122 - p * 20, 4 * (1 - p * 0.5)); c.fill(); }
      c.fillStyle = '#fff'; rr(c, 158, 70, 18, 96, 9); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; rr(c, 158, 70, 18, 96, 9); c.stroke();
      c.fillStyle = C.rojo; circle(c, 167, 164, 12); c.fill(); c.fillRect(163.5, 100 + (1 - entra(t)) * 50, 7, 64 - (1 - entra(t)) * 50);
      chip(c, 140, 40, 54, 22, INK, '? °C', '#fff', 13);
    },
  }),
  'sol-tierra': () => ({
    label: 'La luz que sale del Sol hacia la Tierra, con un cronómetro',
    draw(c, w, h, t) {
      sheet(c, w, h);
      c.fillStyle = C.amarillo; circle(c, 38, 110, 32); c.fill(); c.strokeStyle = C.amarillo; c.lineWidth = 4; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(38 + Math.cos(a) * 38, 110 + Math.sin(a) * 38); c.lineTo(38 + Math.cos(a) * 46, 110 + Math.sin(a) * 46); c.stroke(); }
      c.fillStyle = '#4DA3FF'; circle(c, 172, 110, 12); c.fill(); c.fillStyle = C.verde; c.beginPath(); c.ellipse(168, 106, 5, 4, 0.4, 0, TAU); c.fill();
      const p = entra(t); c.strokeStyle = C.amarillo; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(88, 110); c.lineTo(88 + (68 * p), 110); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; circle(c, 120, 58, 20); c.fill(); c.stroke(); c.fillStyle = INK; c.fillRect(116, 32, 8, 6);
      text(c, '?', 120, 59, 22, C.magenta);
    },
  }),
  gaseosa: () => ({
    label: 'Una botella de gaseosa con burbujas',
    draw(c, w, h, t) {
      sheet(c, w, h);
      c.fillStyle = 'rgba(31,157,107,.25)'; rr(c, 72, 70, 56, 116, 14); c.fill(); rr(c, 88, 30, 24, 44, 6); c.fill();
      c.fillStyle = 'rgba(196,113,237,.55)'; rr(c, 74, 96, 52, 88, 12); c.fill();
      c.strokeStyle = INK; c.lineWidth = 3.5; rr(c, 72, 70, 56, 116, 14); c.stroke(); rr(c, 88, 30, 24, 44, 6); c.stroke(); c.fillStyle = C.rojo; rr(c, 86, 22, 28, 10, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const p = (t * 0.9 + i / 9) % 1; circle(c, 84 + (i * 37 % 34), 180 - p * 80, 2.5 + (i % 3)); c.fill(); }
      interroga(c, 156, 64, C.morado);
    },
  }),
};
export const ESCENA_NAMES = Object.freeze(Object.keys(ESCENAS));

export function createEscena(spec = {}, opts = {}) {
  const make = ESCENAS[spec.cosa];
  if (!make || (spec.tipo !== 'objeto' && spec.tipo !== 'diagrama')) return null;
  const v = make(spec, opts);
  return v && typeof v.draw === 'function' ? { duration: 1, ...v } : null;
}
