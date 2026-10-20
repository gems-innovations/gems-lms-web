// Taps Engine · escena de la PREGUNTA (no de la respuesta): algo de lo que se pregunta, a la vista mientras se piensa.
// Lo pide el motor la primera vez que una pregunta la trae (stage.escena); nunca está en el bundle de la app.
//
//   { tipo: 'codigo',    lineas: ['si llueve:', '  calle = "mojada"'], lenguaje?: 'pseudo' | 'python' | 'js' }
//   { tipo: 'operacion', lineas: ['? × 5', '= ? × 7'] }      la última línea va bajo una raya, como una suma en el cuaderno
//   { tipo: 'serie',     items: ['2', '4', '8', '16', '?'] } fichas en fila; la del «?» resaltada
//   { tipo: 'objeto' | 'diagrama', cosa, texto? }           lo dibuja el tema (visuals.js → createEscena), en su estilo
//
// Código, operación y serie son DOM (texto nítido a cualquier tamaño, sin lienzo): se colorean con clases (.te-k palabra
// clave, .te-n número, .te-s texto, .te-c comentario, .te-o operador) que pinta taps-engine.css según el tema. Todo se crea
// con textContent: el contenido del banco nunca se interpreta como HTML.

const PALABRAS = new Set(['si', 'sino', 'entonces', 'para', 'cada', 'en', 'repetir', 'veces', 'mientras', 'escribir', 'devolver', 'funcion', 'función',
  'y', 'o', 'no', 'es', 'todo', 'todos', 'ningún', 'ninguno', 'verdadero', 'falso', 'if', 'else', 'for', 'while', 'return', 'def', 'print', 'let', 'const',
  'true', 'false', 'in', 'not', 'and', 'or', 'is']);
const TOKEN = /(#.*$|\/\/.*$)|("[^"]*"|'[^']*')|(\d+(?:[.,]\d+)?)|([=<>!+\-*/×÷%]+|==)|([A-Za-zÁÉÍÓÚÜÑáéíóúüñ_][\wÁÉÍÓÚÜÑáéíóúüñ]*)/g;

/** Una línea de código en trozos con su clase (puro: también lo usan las pruebas). */
export function tokenizar(linea) {
  const out = []; let last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(linea))) {
    if (m.index > last) out.push(['', linea.slice(last, m.index)]);
    const [txt, com, str, num, op, word] = m;
    out.push([com ? 'c' : str ? 's' : num ? 'n' : op ? 'o' : word && PALABRAS.has(word.toLowerCase()) ? 'k' : '', txt]);
    last = m.index + txt.length;
    if (!txt.length) TOKEN.lastIndex++;
  }
  if (last < linea.length) out.push(['', linea.slice(last)]);
  return out;
}

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NOMBRE = { pseudo: 'pseudocódigo', python: 'python', js: 'javascript' };

function codigo(spec) {
  const card = el('div', 'te-esc-code');
  const bar = el('div', 'te-esc-bar'); bar.append(el('i'), el('i'), el('i'), el('span', null, NOMBRE[spec.lenguaje] || NOMBRE.pseudo));
  const pre = el('pre'), code = el('code');
  (spec.lineas || []).forEach((l, i) => {
    const row = el('span', 'te-esc-ln'); row.style.setProperty('--i', String(i));
    for (const [k, t] of tokenizar(String(l))) row.append(k ? el('span', 'te-' + k, t) : document.createTextNode(t));
    code.append(row);
  });
  pre.append(code); card.append(bar, pre);
  // la letra se ajusta a la línea más larga: nunca se corta el código a la derecha
  pre.style.setProperty('--largo', String(Math.max(12, ...(spec.lineas || []).map(l => String(l).length))));
  return { node: card, label: 'Código: ' + (spec.lineas || []).join(' / ') };
}
function operacion(spec) {
  const box = el('div', 'te-esc-op'), lines = spec.lineas || [];
  box.style.setProperty('--largo', String(Math.max(6, ...lines.map(l => String(l).length))));
  lines.forEach((l, i) => { const r = el('div', i === lines.length - 1 && lines.length > 1 ? 'te-esc-total' : null, String(l)); r.style.setProperty('--i', String(i)); box.append(r); });
  return { node: box, label: 'Operación: ' + lines.join(' ') };
}
function serie(spec) {
  const ol = el('ol', 'te-esc-serie'), items = spec.items || [];
  items.forEach((it, i) => { const li = el('li', String(it).trim() === '?' ? 'is-q' : null, String(it)); li.style.setProperty('--i', String(i)); ol.append(li); });
  return { node: ol, label: 'Serie: ' + items.join(', ') };
}

/** Lienzo del tema (objeto o diagrama): anima la entrada de 0 a `duration` y se queda quieto. */
function lienzo(v, reduced) {
  const wrap = el('div', 'te-esc-canvas'), cv = el('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  cv.setAttribute('aria-hidden', 'true'); wrap.append(cv);
  let w = 1, h = 1, t = reduced ? v.duration : 0, raf = 0, last = 0, dead = false;
  const draw = () => { if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); try { v.draw(ctx, w, h, Math.min(t, v.duration)); } catch { /* un dibujo roto no tumba el Tap */ } };
  const tick = now => { raf = 0; if (dead) return; t += last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; draw(); if (t < v.duration) raf = requestAnimationFrame(tick); };
  const size = () => { const r = wrap.getBoundingClientRect(); w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height)); cv.width = w * dpr; cv.height = h * dpr; draw(); };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
  return {
    node: wrap,
    start() { ro?.observe(wrap); size(); if (!reduced) raf = requestAnimationFrame(tick); },
    destroy() { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); },
  };
}

/**
 * Monta la escena `spec` dentro de `host` (el hueco que puso la app). `cargarTema()` = módulo de objetos del tema (para
 * objeto/diagrama). Devuelve { label, destroy } o null si no sabe dibujarla (la app oculta el hueco).
 */
export async function montarEscena(spec, host, { theme, reducedMotion = false, cargarTema } = {}) {
  const root = el('div', 'te-escena te-escena--' + spec.tipo);
  root.setAttribute('aria-hidden', 'true');
  root.dataset.theme = theme?.id || '';
  if (reducedMotion) root.dataset.reduced = '1';
  let made = null, canvas = null;
  if (spec.tipo === 'codigo') made = codigo(spec);
  else if (spec.tipo === 'operacion') made = operacion(spec);
  else if (spec.tipo === 'serie') made = serie(spec);
  else if (spec.tipo === 'objeto' || spec.tipo === 'diagrama') {
    let mod = null; try { mod = await cargarTema?.(); } catch { mod = null; }
    const v = mod?.createEscena?.(spec, { reducedMotion });
    if (!v) return null;
    canvas = lienzo(v, reducedMotion); made = { node: canvas.node, label: v.label };
  }
  if (!made) return null;
  root.append(made.node);
  if (spec.texto) root.append(el('p', 'te-esc-cap', String(spec.texto)));
  if (!host.isConnected) { canvas?.destroy(); return null; }
  // el dibujo va oculto a lectores de pantalla; su descripción (con el pie, que puede traer datos que no dice la pregunta) va en texto
  const label = made.label + (spec.texto ? '. ' + spec.texto : '');
  const sr = el('p', 'te-esc-sr', 'Imagen de la pregunta: ' + label);
  host.append(root, sr);
  canvas?.start();
  return { label, destroy() { canvas?.destroy(); root.remove(); sr.remove(); } };
}
