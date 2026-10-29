// Editor de preguntas de /crear (PR-W0, producto/taps/creador.md §2.2): crea las 5 preguntas de un Tap sin servidor. Dos partes:
// - Lógica pura (sin DOM, probada en taps-engine-tests/editor-preguntas.test.mjs): límites del banco, validación, parser de
//   «pegar texto», plantillas, lectura/escritura del borrador local y paso a la forma que juega la vista previa.
// - `montarEditor`: la interfaz (una pregunta por vista, chips 1-5, validación en vivo, vista previa, guardado, deshacer).
// Nada viaja a ningún servidor: el borrador enviado a la API NO cambia (sigue v:1 con v, borradorId, b, l, i, w).
// Todo texto escrito por personas entra al DOM con textContent/value, nunca como HTML.

/** Clave versionada del borrador de preguntas (junto a las taps.disenador.* del diseñador). */
export const CLAVE_PREGUNTAS = 'taps.disenador.preguntas.v1';
/** Límites reales del banco (taps.types.ts, generar-taps.mjs y el validador del payload, pr10-plan-tecnico.md §2). */
export const LIM = Object.freeze({ q: 120, qIdeal: 70, opcion: 22, why: 90, preguntas: 5, titulo: 40, linea: 90, deshacer: 30 });
export const TIPOS = Object.freeze({ clasica: 'Clásica', duo: 'Dos opciones', vf: 'Verdadero o falso' });
export const VF = Object.freeze(['Verdadero', 'Falso']);
const N_OPCIONES = Object.freeze({ clasica: 4, duo: 2, vf: 2 });
/** Títulos de resultado por defecto (forma ITapResult: el de 0 aciertos es obligatorio y nunca negativo). */
export const RESULTADOS_DEFECTO = Object.freeze([
  { min: 0, title: 'Calentando motores', line: 'Todo comienzo cuenta. Prueba otra vez.' },
  { min: 2, title: 'Buen ritmo', line: 'Vas bien. Un poco más y lo logras.' },
  { min: 4, title: 'Casi perfecto', line: 'Qué buen resultado. Te faltó muy poco.' },
  { min: 5, title: 'Pleno', line: 'Cinco de cinco. Dominas el tema.' },
]);

const clonar = o => JSON.parse(JSON.stringify(o));
const texto = (v, max = 400) => (typeof v === 'string' ? v : '').slice(0, max);

/** Pregunta vacía del tipo pedido (`answer` -1 = sin marcar). */
export function preguntaNueva(tipo = 'clasica') {
  const t = tipo in TIPOS ? tipo : 'clasica';
  return { tipo: t, q: '', options: t === 'vf' ? [...VF] : Array.from({ length: N_OPCIONES[t] }, () => ''), answer: -1, why: '' };
}
export const estadoNuevo = () => ({ v: 1, preguntas: [preguntaNueva()], resultados: clonar(RESULTADOS_DEFECTO), actual: 0 });

/** Cambia el tipo conservando lo escrito: duo conserva las 2 primeras opciones, vf pone Verdadero/Falso, clásica completa a 4. */
export function cambiarTipo(p, tipo) {
  if (!(tipo in TIPOS) || tipo === p.tipo) return p;
  const n = N_OPCIONES[tipo];
  const options = tipo === 'vf' ? [...VF] : Array.from({ length: n }, (_, i) => (p.tipo === 'vf' ? '' : p.options[i] ?? ''));
  return { ...p, tipo, options, answer: p.answer >= 0 && p.answer < n ? p.answer : -1 };
}

// ───────────────────────── validación ─────────────────────────
const sobra = (s, max) => s.length - max;
/**
 * Estado de una pregunta: `errores` = cosas escritas que no caben o se repiten (mensaje junto al campo); `falta` = lo que aún no
 * se ha escrito (sin gritar: solo se resume). `completa` = sin errores y sin faltas.
 */
export function validarPregunta(p) {
  const e = { q: '', opciones: p.options.map(() => ''), correcta: '', why: '' };
  const falta = [];
  const q = p.q.trim();
  if (!q) falta.push('la pregunta');
  else if (q.length > LIM.q) e.q = `Se pasa por ${sobra(q, LIM.q)} caracteres. Acórtala a ${LIM.q} como máximo.`;
  const vistas = new Map();
  p.options.forEach((o, i) => {
    const t = o.trim();
    if (!t) { if (p.tipo !== 'vf') falta.push(`la opción ${'ABCD'[i]}`); return; }
    if (t.length > LIM.opcion) e.opciones[i] = `Se pasa por ${sobra(t, LIM.opcion)}. Máximo ${LIM.opcion} para que quepa en el botón.`;
    const k = t.toLowerCase();
    if (vistas.has(k)) { e.opciones[i] = 'Esta opción se repite. Cada una debe ser distinta.'; if (!e.opciones[vistas.get(k)]) e.opciones[vistas.get(k)] = 'Esta opción se repite. Cada una debe ser distinta.'; }
    else vistas.set(k, i);
  });
  if (!(p.answer >= 0 && p.answer < p.options.length)) falta.push('marcar la correcta');
  const w = p.why.trim();
  if (!w) falta.push('la explicación');
  else if (w.length > LIM.why) e.why = `Se pasa por ${sobra(w, LIM.why)}. Máximo ${LIM.why}.`;
  const hayError = !!(e.q || e.why || e.opciones.some(Boolean));
  return { ...e, falta, hayError, completa: !hayError && falta.length === 0 };
}
/** Resumen para el chip y la línea de estado de una pregunta. */
export function resumenPregunta(v) {
  if (v.completa) return 'Lista';
  if (v.hayError && !v.falta.length) return 'Hay algo que ajustar';
  return v.falta.length ? `Falta ${v.falta.join(', ')}` : 'Hay algo que ajustar';
}

/** Errores de los títulos de resultado: 3 a 5 niveles, el primero con min 0, mins crecientes, texto acotado. Devuelve mensajes por nivel y uno general. */
export function validarResultados(res) {
  const niveles = res.map(() => '');
  let general = '';
  if (res.length < 3 || res.length > 5) general = 'Un Tap lleva entre 3 y 5 títulos de resultado.';
  res.forEach((r, i) => {
    const t = r.title.trim(), l = r.line.trim();
    if (!t) niveles[i] = 'Escribe el título.';
    else if (t.length > LIM.titulo) niveles[i] = `El título se pasa por ${sobra(t, LIM.titulo)}. Máximo ${LIM.titulo}.`;
    else if (l.length > LIM.linea) niveles[i] = `La frase se pasa por ${sobra(l, LIM.linea)}. Máximo ${LIM.linea}.`;
    else if (!l) niveles[i] = 'Escribe la frase.';
    if (i === 0 && r.min !== 0 && !general) general = 'El primer título debe valer para 0 aciertos.';
    if (i > 0 && r.min <= res[i - 1].min && !general) general = 'Los títulos deben subir de menos a más aciertos.';
  });
  return { niveles, general, ok: !general && niveles.every(n => !n) };
}

/** Cuántas preguntas están completas y si el Tap tiene sus 5 listas. */
export function resumenEstado(est) {
  const v = est.preguntas.map(validarPregunta);
  return { validas: v, listas: v.filter(x => x.completa).length, total: est.preguntas.length, cinco: est.preguntas.length === LIM.preguntas && v.every(x => x.completa) };
}

/** Preguntas jugables en la vista previa (con texto, al menos 2 opciones escritas y una correcta entre ellas): forma del banco `{ q, options, answer, why, tipo }`. */
export function preguntasJugables(est) {
  const out = [];
  for (const p of est.preguntas) {
    const opts = p.options.map(o => o.trim());
    if (!p.q.trim() || opts.some(o => !o) || !(p.answer >= 0 && p.answer < opts.length)) continue;
    out.push({ q: p.q.trim(), options: opts, answer: p.answer, why: p.why.trim(), tipo: p.tipo });
  }
  return out;
}
/** Una pregunta a medias vista como la pintará el marco (huecos con «…» y un texto guía). */
export function paraVista(p) {
  return { q: p.q.trim() || 'Escribe tu pregunta', options: p.options.map((o, i) => o.trim() || (p.tipo === 'vf' ? VF[i] : '…')), answer: p.answer, why: p.why };
}

// ───────────────────────── pegar texto ─────────────────────────
/** Ejemplo que se enseña en «Pegar texto» (y que los tests comprueban que se entiende). */
export const EJEMPLO_PEGADO = [
  '¿Cuánto es 7 × 8?', '54', '*56', '58', '64', 'Explicación: 7 × 8 = 56.', '',
  '¿La ballena es un mamífero?', '*Verdadero', 'Falso', 'Explicación: respira aire y amamanta a sus crías.',
].join('\n');
const RE_EXPLICA = /^\s*(?:explicaci[oó]n|explica|porque|por qu[eé])\s*[:：-]\s*(.*)$/i;
const RE_PREFIJO = /^\s*(?:[-•·–]\s+|\(?[A-Da-d][).]\s+|\d{1,2}[).]\s+)/;
const esV = s => /^(verdadero|cierto|v)$/i.test(s.trim());
const esF = s => /^(falso|f)$/i.test(s.trim());

/**
 * «Pegar texto»: bloques separados por una línea en blanco. En cada bloque, la primera línea es la pregunta, las siguientes son las
 * opciones (con o sin «A)», «-»…), la correcta lleva `*` al inicio o al final y «Explicación: …» es opcional. Tolerante: nunca lanza;
 * lo que no entiende o no cabe lo cuenta en `avisos` (frases claras para la persona) y sigue.
 */
export function parsearTexto(entrada) {
  const avisos = [];
  const preguntas = [];
  try {
    const bloques = String(entrada ?? '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
    if (!bloques.length) return { preguntas, avisos: ['No encontré preguntas. Escribe la pregunta en una línea y sus opciones debajo, una por línea.'] };
    for (const lineas of bloques) {
      const n = preguntas.length + 1;
      if (n > LIM.preguntas) { avisos.push(`Un Tap lleva ${LIM.preguntas} preguntas: dejé fuera las que sobran.`); break; }
      const q = lineas[0].replace(/^\d{1,2}[).]\s+/, '').replace(/^[-•·–]\s+/, '');
      let why = '', marcadas = 0, answer = -1;
      const opts = [];
      for (const l of lineas.slice(1)) {
        const m = RE_EXPLICA.exec(l);
        if (m) { why = m[1].trim(); continue; }
        let t = l.replace(RE_PREFIJO, '').trim();
        let ok = false;
        if (/^\*/.test(t)) { ok = true; t = t.replace(/^\*+\s*/, ''); } else if (/\*$/.test(t)) { ok = true; t = t.replace(/\s*\*+$/, ''); }
        if (ok) { marcadas++; if (answer < 0) answer = opts.length; }
        opts.push(t);
      }
      let tipo = 'clasica';
      if (opts.length === 2 && ((esV(opts[0]) && esF(opts[1])) || (esF(opts[0]) && esV(opts[1])))) {
        tipo = 'vf';
        const verdaderoPrimero = esV(opts[0]);
        if (!verdaderoPrimero && answer >= 0) answer = 1 - answer;   // el orden fijo es Verdadero, Falso
        opts.splice(0, 2, ...VF);
      } else if (opts.length === 2) tipo = 'duo';
      else if (opts.length > 4) { avisos.push(`Pregunta ${n}: tenía ${opts.length} opciones; dejé las 4 primeras.`); opts.length = 4; if (answer > 3) answer = -1; }
      if (tipo === 'clasica' && opts.length < 4) {
        if (opts.length === 0) avisos.push(`Pregunta ${n}: no tiene opciones. Escríbelas debajo de la pregunta, una por línea.`);
        else avisos.push(`Pregunta ${n}: tiene ${opts.length} opciones y faltan ${4 - opts.length}. Complétalas en el editor.`);
        while (opts.length < 4) opts.push('');
      }
      if (marcadas > 1) avisos.push(`Pregunta ${n}: marcaste ${marcadas} correctas con *; usé la primera.`);
      else if (marcadas === 0 && lineas.length > 1) avisos.push(`Pregunta ${n}: no marcaste la correcta. Pon * al inicio de la opción correcta.`);
      preguntas.push({ tipo, q, options: opts, answer, why });
    }
  } catch { avisos.push('No pude leer todo el texto. Revisa el formato del ejemplo.'); }
  return { preguntas, avisos };
}

// ───────────────────────── plantillas (4, en español) ─────────────────────────
const P = (q, options, answer, why, tipo = 'clasica') => ({ tipo, q, options, answer, why });
const VFP = (q, verdadero, why) => P(q, [...VF], verdadero ? 0 : 1, why, 'vf');
export const PLANTILLAS = Object.freeze([
  { id: 'matematicas', nombre: 'Repaso de matemáticas', detalle: 'Operaciones, fracciones y figuras', preguntas: [
    P('¿Cuánto es 7 × 8?', ['54', '56', '58', '64'], 1, '7 × 8 = 56. Piensa en 7 × 7 = 49 y suma 7.'),
    P('¿Cuál es el 25 % de 80?', ['10', '20', '25', '40'], 1, 'El 25 % es un cuarto, y un cuarto de 80 es 20.'),
    P('¿Cuántos lados tiene un hexágono?', ['5', '6', '7', '8'], 1, 'Hexa- quiere decir seis.'),
    VFP('El 0 es un número par.', true, 'El 0 se puede repartir en dos grupos iguales: es par.'),
    P('¿Qué fracción es mayor?', ['1/2', '1/3'], 0, 'Al partir en menos trozos, cada trozo es más grande.', 'duo'),
  ] },
  { id: 'ciencias', nombre: 'Ciencias naturales', detalle: 'Planeta, cuerpo y materia', preguntas: [
    P('¿Qué gas absorben las plantas al hacer fotosíntesis?', ['Oxígeno', 'Dióxido de carbono', 'Nitrógeno', 'Hidrógeno'], 1, 'Toman dióxido de carbono y sueltan oxígeno.'),
    P('¿Cuál es el planeta más cercano al Sol?', ['Venus', 'Marte', 'Mercurio', 'Tierra'], 2, 'Mercurio es el primero, a unos 58 millones de km del Sol.'),
    VFP('El Sol es una estrella.', true, 'Es la estrella más cercana a la Tierra.'),
    P('¿Qué hueso protege el cerebro?', ['El cráneo', 'La costilla'], 0, 'El cráneo rodea y protege al cerebro.', 'duo'),
    P('¿A qué temperatura hierve el agua al nivel del mar?', ['50 °C', '80 °C', '100 °C', '150 °C'], 2, 'A 100 °C. En lo alto de una montaña hierve antes.'),
  ] },
  { id: 'ingles', nombre: 'Vocabulario de inglés', detalle: 'Palabras de todos los días', preguntas: [
    P('¿Cómo se dice «manzana» en inglés?', ['Orange', 'Grape', 'Apple', 'Peach'], 2, 'Apple es manzana. Orange es naranja.'),
    P('¿Qué significa «house»?', ['Caballo', 'Casa', 'Hora', 'Hotel'], 1, 'House es casa. Suena parecido a «jaus».'),
    VFP('«Window» significa ventana.', true, 'Window es ventana. Door es puerta.'),
    P('Plural de «child»', ['Children', 'Childs'], 0, 'Es irregular: child, children.', 'duo'),
    P('¿Qué color es «green»?', ['Rojo', 'Azul', 'Gris', 'Verde'], 3, 'Green es verde. Red es rojo.'),
  ] },
  { id: 'cultura', nombre: 'Cultura general', detalle: 'Geografía, arte y mundo', preguntas: [
    P('¿Cuál es la capital de Colombia?', ['Medellín', 'Bogotá', 'Cali', 'Cartagena'], 1, 'Bogotá es la capital y está a 2.600 m de altura.'),
    P('¿Cuántos continentes se cuentan hoy?', ['5', '6', '7', '8'], 2, 'Se cuentan siete: África, América, Antártida, Asia, Europa y Oceanía.'),
    VFP('El Amazonas es un río.', true, 'Es el río más caudaloso del mundo.'),
    P('¿Qué océano es el más grande?', ['Pacífico', 'Atlántico'], 0, 'El Pacífico cubre cerca de un tercio del planeta.', 'duo'),
    P('¿Quién pintó la Mona Lisa?', ['Pablo Picasso', 'Frida Kahlo', 'Leonardo da Vinci', 'Claude Monet'], 2, 'Leonardo da Vinci la pintó hace unos 500 años.'),
  ] },
]);
export function estadoDePlantilla(id) {
  const pl = PLANTILLAS.find(x => x.id === id);
  return pl ? { v: 1, preguntas: clonar(pl.preguntas), resultados: clonar(RESULTADOS_DEFECTO), actual: 0 } : estadoNuevo();
}

// ───────────────────────── borrador local ─────────────────────────
const preguntaLimpia = p => {
  if (!p || typeof p !== 'object') return null;
  const tipo = p.tipo in TIPOS ? p.tipo : 'clasica', n = N_OPCIONES[tipo];
  const options = Array.from({ length: n }, (_, i) => (tipo === 'vf' ? VF[i] : texto(Array.isArray(p.options) ? p.options[i] : '')));
  const answer = Number.isInteger(p.answer) && p.answer >= 0 && p.answer < n ? p.answer : -1;
  return { tipo, q: texto(p.q), options, answer, why: texto(p.why) };
};
/** Borrador guardado → estado, o null si no hay nada utilizable (JSON roto, otra versión, forma distinta). Nunca lanza. */
export function leerEstado(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o || o.v !== 1 || !Array.isArray(o.preguntas)) return null;
    const preguntas = o.preguntas.map(preguntaLimpia).filter(Boolean).slice(0, LIM.preguntas);
    if (!preguntas.length) return null;
    const res = Array.isArray(o.resultados) && o.resultados.length >= 3 && o.resultados.length <= 5 ? o.resultados.map((r, i) => ({ min: Number.isInteger(r?.min) ? r.min : i, title: texto(r?.title, 80), line: texto(r?.line, 200) })) : clonar(RESULTADOS_DEFECTO);
    return { v: 1, preguntas, resultados: res, actual: Number.isInteger(o.actual) ? Math.max(0, Math.min(preguntas.length - 1, o.actual)) : 0 };
  } catch { return null; }
}
export const serializarEstado = est => JSON.stringify({ v: 1, preguntas: est.preguntas, resultados: est.resultados, actual: est.actual });

// ───────────────────────── interfaz ─────────────────────────
const SVG = 'http://www.w3.org/2000/svg';
function h(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : String(v));
  }
  e.append(...hijos.flat(Infinity).filter(x => x != null && x !== false));
  return e;
}
const ic = id => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS(SVG, 'use'); u.setAttribute('href', '#' + id); s.append(u); return s; };
const marca = ok => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('class', 'ic marca'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', ok ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 7v6M12 17h.01'); s.append(p); return s; };

/**
 * Monta el editor dentro de `contenedor`. Opciones:
 * - `almacen`: { disponible, leer, escribir } (guardado.js crearAlmacen) para el borrador local.
 * - `pintar(canvas, pregunta, indice, total)`: dibuja el marco del Tap con el personaje ya elegido (el pintor de disenador.js).
 * - `alCambiar(jugables)`: avisa con las preguntas jugables (la vista del paso Listo juega con ellas).
 * - `esperar(fn, ms)`: temporizador cancelable por quien monta.
 * Devuelve { mostrar(), destruir(), estado }.
 */
export function montarEditor(contenedor, { almacen, pintar, alCambiar, esperar = (fn, ms) => setTimeout(fn, ms) }) {
  let est = leerEstado(almacen?.leer?.(CLAVE_PREGUNTAS)) ?? null;
  let vista = est ? 'editar' : 'inicio';             // inicio | pegar | editar | titulos
  let deshacer = [];                                 // fotos (JSON) del estado antes de cada cambio
  let base = est ? serializarEstado(est) : '';       // última foto confirmada (se apila al terminar de escribir)
  let temporizadorGuardado = 0, temporizadorVista = 0, textoPegado = '', avisosPegado = [];
  const refs = {};
  const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => pintarVista()) : null;

  const guardar = () => {
    clearTimeout(temporizadorGuardado);
    temporizadorGuardado = esperar(() => {
      if (!est) return;
      const ok = almacen?.disponible && almacen.escribir(CLAVE_PREGUNTAS, serializarEstado(est));
      if (refs.guardado) { refs.guardado.textContent = ok ? 'Guardado' : 'Sin guardado en este navegador'; refs.guardado.classList.toggle('sin', !ok); }
    }, 350);
    if (refs.guardado) refs.guardado.textContent = '';
  };
  const avisar = () => { try { alCambiar?.(est ? preguntasJugables(est) : []); } catch { /* quien monta decide */ } };
  /** Apila la foto confirmada antes del cambio actual (una vez por «tanda» de escritura o por acción). */
  const confirmar = () => {
    const ahora = serializarEstado(est);
    if (ahora === base) return;
    deshacer.push(base); if (deshacer.length > LIM.deshacer) deshacer.shift();
    base = ahora; if (refs.deshacer) refs.deshacer.disabled = false;
  };
  const actuar = fn => { fn(); confirmar(); guardar(); avisar(); dibujar(); };
  /** Cambio que no reconstruye la vista (el foco se queda donde está). */
  const actuarLigero = fn => { fn(); confirmar(); guardar(); avisar(); refrescar(); };

  function pintarVista() {
    clearTimeout(temporizadorVista);
    temporizadorVista = esperar(() => {
      const c = refs.lienzo; if (!c || !est || vista !== 'editar') return;
      try { pintar?.(c, paraVista(est.preguntas[est.actual]), est.actual, est.preguntas.length); } catch { /* sin vista previa el editor sigue */ }
    }, 60);
  }

  // Contadores: se anuncian (aria-live) solo al cruzar un umbral, nunca en cada tecla.
  const contador = (max, ideal) => {
    const el = h('small', { class: 'cuenta', 'aria-hidden': 'true' }), vivo = h('span', { class: 'sr', role: 'status', 'aria-live': 'polite' });
    let nivel = 'ok';
    el.set = n => {
      el.textContent = `${n}/${max}`;
      const nuevo = n > max ? 'rojo' : ideal && n > ideal ? 'ambar' : 'ok';
      el.dataset.nivel = nuevo;
      if (nuevo !== nivel) { nivel = nuevo; vivo.textContent = nuevo === 'rojo' ? `Te pasaste del máximo de ${max} caracteres.` : nuevo === 'ambar' ? `Pasaste de ${ideal} caracteres: se lee mejor si es más corta.` : ''; }
    };
    return { el, vivo };
  };
  const mensaje = id => h('p', { class: 'msg', id, hidden: true });
  const poner = (el, txt) => { el.textContent = txt; el.hidden = !txt; };

  // ─── vistas ───
  function dibujar() {
    observador?.disconnect();
    for (const k of Object.keys(refs)) delete refs[k];
    contenedor.replaceChildren(vista === 'inicio' ? vistaInicio() : vista === 'pegar' ? vistaPegar() : vista === 'titulos' ? vistaTitulos() : vistaEditar());
    if (vista === 'editar') { refrescar(); if (refs.lienzo) observador?.observe(refs.lienzo); }
  }

  function vistaInicio() {
    const tarjeta = (titulo, detalle, fn, extra = '') => h('button', { type: 'button', class: 'op-tarjeta ' + extra, onclick: fn }, h('b', { text: titulo }), h('small', { text: detalle }));
    return h('div', { class: 'pre pre--inicio' },
      h('p', { class: 'texto', text: 'Con cinco preguntas, tu personaje presenta un Tap de verdad. Empieza con algo hecho o desde cero; después lo cambias todo. Nada es obligatorio: si te saltas este paso, el Tap queda solo con tu personaje.' }),
      h('div', { class: 'op-lista', role: 'group', 'aria-label': 'Con qué empezar' },
        PLANTILLAS.map(pl => tarjeta(pl.nombre, pl.detalle, () => { est = estadoDePlantilla(pl.id); vista = 'editar'; base = serializarEstado(est); deshacer = []; guardar(); avisar(); dibujar(); enfocar('.chip[aria-current="true"]'); })),
        tarjeta('Pegar texto', 'Pega tus preguntas ya escritas', () => { vista = 'pegar'; dibujar(); enfocar('#pegarTexto'); }, 'op-tarjeta--aparte'),
        tarjeta('Empezar en blanco', 'Escribes tú las preguntas', () => { est = estadoNuevo(); vista = 'editar'; base = serializarEstado(est); deshacer = []; guardar(); avisar(); dibujar(); enfocar('#preguntaTexto'); }, 'op-tarjeta--aparte')));
  }

  function vistaPegar() {
    const area = h('textarea', { id: 'pegarTexto', rows: 10, spellcheck: 'false', 'aria-describedby': 'pegarAyuda pegarAvisos', placeholder: 'Pega aquí tus preguntas', oninput: e => { textoPegado = e.target.value; } });
    area.value = textoPegado;
    const avisos = h('ul', { id: 'pegarAvisos', class: 'avisos', 'aria-live': 'polite' });
    const usar = () => {
      const r = parsearTexto(area.value); textoPegado = area.value;
      avisos.replaceChildren(...r.avisos.map(a => h('li', { text: a })));
      if (!r.preguntas.length) { area.focus(); return; }
      est = { v: 1, preguntas: r.preguntas, resultados: clonar(RESULTADOS_DEFECTO), actual: 0 };
      avisosPegado = r.avisos; vista = 'editar'; base = serializarEstado(est); deshacer = []; guardar(); avisar(); dibujar();
      enfocar('.chip[aria-current="true"]');
    };
    return h('div', { class: 'pre pre--pegar' },
      h('p', { class: 'texto', id: 'pegarAyuda', text: 'Una pregunta por bloque, separadas por una línea en blanco. La primera línea es la pregunta, las siguientes son las opciones. Marca la correcta con * y, si quieres, añade «Explicación: …».' }),
      h('pre', { class: 'ejemplo', 'aria-label': 'Ejemplo', text: EJEMPLO_PEGADO }),
      h('label', { for: 'pegarTexto', text: 'Tus preguntas' }), area, avisos,
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'primario', onclick: usar }, 'Usar este texto'),
        h('button', { type: 'button', onclick: () => { vista = est ? 'editar' : 'inicio'; dibujar(); } }, 'Volver')));
  }

  function vistaTitulos() {
    const filas = est.resultados.map((r, i) => {
      const t = h('input', { id: `rt${i}`, maxlength: 80, autocomplete: 'off', 'aria-describedby': `rm${i}`, oninput: e => { r.title = e.target.value; guardar(); avisar(); chequear(); }, onchange: confirmar });
      const l = h('input', { id: `rl${i}`, maxlength: 200, autocomplete: 'off', 'aria-label': `Frase del título ${i + 1}`, 'aria-describedby': `rm${i}`, oninput: e => { r.line = e.target.value; guardar(); chequear(); }, onchange: confirmar });
      t.value = r.title; l.value = r.line;
      return h('li', { class: 'nivel' }, h('label', { for: `rt${i}`, text: r.min === 0 ? 'Con 0 aciertos' : i === est.resultados.length - 1 ? `Con ${r.min} aciertos` : `Con ${r.min} o más` }), t, l, h('p', { class: 'msg', id: `rm${i}`, hidden: true }));
    });
    const lista = h('ol', { class: 'niveles' }, filas);
    const general = h('p', { class: 'msg', id: 'tituloGeneral', hidden: true });
    function chequear() {
      const x = validarResultados(est.resultados); poner(general, x.general);
      x.niveles.forEach((m, i) => { const p = lista.querySelector('#rm' + i); poner(p, m); lista.querySelector('#rt' + i).toggleAttribute('aria-invalid', !!m); });
    }
    queueMicrotask(chequear);
    return h('div', { class: 'pre pre--titulos' },
      h('p', { class: 'texto', text: 'Al terminar, quien juega ve el título que ganó según sus aciertos. Ya vienen escritos; cámbialos si quieres.' }),
      lista, general,
      h('div', { class: 'acciones' },
        h('button', { type: 'button', onclick: () => actuar(() => { est.resultados = clonar(RESULTADOS_DEFECTO); vista = 'titulos'; }) }, 'Volver a los de siempre'),
        h('button', { type: 'button', class: 'primario', onclick: () => { vista = 'editar'; dibujar(); enfocar('.chip[aria-current="true"]'); } }, 'Volver a las preguntas')));
  }

  function vistaEditar() {
    const p = est.preguntas[est.actual], idx = est.actual;
    // chips 1-5
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Preguntas' },
      est.preguntas.map((_, i) => h('button', { type: 'button', class: 'chip', 'data-i': i, 'aria-current': i === idx ? 'true' : 'false', onclick: () => ir(i) }, h('span', { text: String(i + 1) }), h('i', { class: 'estado', 'aria-hidden': 'true' }))),
      est.preguntas.length < LIM.preguntas ? h('button', { type: 'button', class: 'chip chip--mas', 'aria-label': 'Añadir una pregunta', onclick: () => { actuar(() => { est.preguntas.push(preguntaNueva()); est.actual = est.preguntas.length - 1; }); enfocar('#preguntaTexto'); } }, ic('i-mas')) : null,
      h('button', { type: 'button', class: 'chip chip--texto', onclick: () => { vista = 'titulos'; dibujar(); enfocar('#rt0'); } }, 'Títulos'));
    // tipo
    const tipos = h('div', { class: 'tipos', role: 'group', 'aria-label': 'Tipo de pregunta' },
      Object.entries(TIPOS).map(([k, nombre]) => h('button', { type: 'button', 'aria-pressed': String(p.tipo === k), class: 'tipo', onclick: () => { if (p.tipo !== k) { actuar(() => { est.preguntas[idx] = cambiarTipo(p, k); }); enfocar('.tipo[aria-pressed="true"]'); } } }, nombre)));
    // pregunta
    const cq = contador(LIM.q, LIM.qIdeal);
    const q = h('textarea', { id: 'preguntaTexto', rows: 3, maxlength: 400, 'aria-describedby': 'msgQ', oninput: e => { p.q = e.target.value; tras(); }, onchange: confirmar });
    q.value = p.q;
    refs.q = q; refs.cq = cq.el; refs.msgQ = mensaje('msgQ');
    // opciones
    refs.opc = p.options.map((o, i) => {
      const fijo = p.tipo === 'vf';
      const radio = h('input', { type: 'radio', name: 'correcta', id: `corr${i}`, 'aria-label': `La opción ${'ABCD'[i]} es la correcta`, onchange: () => actuarLigero(() => { p.answer = i; }) });
      radio.checked = p.answer === i;
      const c = contador(LIM.opcion, 0), msg = mensaje(`msgO${i}`);
      let campo;
      if (fijo) campo = h('span', { class: 'fijo', text: VF[i] });
      else {
        campo = h('input', { id: `opcion${i}`, maxlength: 60, autocomplete: 'off', 'aria-label': `Opción ${'ABCD'[i]}`, 'aria-describedby': `msgO${i}`, oninput: e => { p.options[i] = e.target.value; tras(); }, onchange: confirmar });
        campo.value = o;
      }
      const fila = h('div', { class: 'opcion' }, h('label', { class: 'radio', for: `corr${i}`, title: 'Marcar como correcta' }, radio, h('span', { class: 'letra', text: 'ABCD'[i] })), campo, fijo ? null : c.el, fijo ? null : c.vivo);
      return { fila, campo, c, msg, radio };
    });
    // explicación
    const cw = contador(LIM.why, 0);
    const w = h('textarea', { id: 'whyTexto', rows: 2, maxlength: 300, 'aria-describedby': 'msgW', oninput: e => { p.why = e.target.value; tras(); }, onchange: confirmar });
    w.value = p.why;
    refs.w = w; refs.cw = cw.el; refs.msgW = mensaje('msgW');
    refs.estado = h('p', { class: 'estado-pregunta', id: 'estadoPregunta' });
    refs.guardado = h('span', { class: 'guardado', role: 'status', 'aria-live': 'polite' });
    refs.deshacer = h('button', { type: 'button', class: 'suave', disabled: !deshacer.length, onclick: quitarUltimo }, ic('i-deshacer'), 'Deshacer');
    refs.lienzo = h('canvas', { id: 'tapEditor', role: 'img', 'aria-label': 'Así se ve esta pregunta en un Tap, con tu personaje' });
    refs.cajaAvisos = h('div', { class: 'aviso-pegado', hidden: !avisosPegado.length, role: 'status' }, h('p', { text: 'Al leer tu texto:' }), (refs.avisosPegado = h('ul', { class: 'avisos' }, avisosPegado.map(a => h('li', { text: a })))),
      h('button', { type: 'button', class: 'suave', onclick: () => { avisosPegado = []; refs.cajaAvisos.hidden = true; } }, 'Entendido'));
    const ultima = idx === est.preguntas.length - 1;
    return h('div', { class: 'pre pre--editar', onkeydown: teclas },
      h('div', { class: 'pre__cab' }, chips, h('span', { class: 'resumen', id: 'resumenEstado', 'aria-live': 'off' })),
      refs.cajaAvisos,
      tipos,
      h('div', { class: 'campo' }, h('label', { for: 'preguntaTexto', text: `Pregunta ${idx + 1}` }), q, h('div', { class: 'pie' }, refs.msgQ, cq.el, cq.vivo)),
      h('fieldset', { class: 'campo opciones-ed' }, h('legend', { text: 'Opciones: toca el círculo de la correcta' }),
        refs.opc.map(o => [o.fila, o.msg])),
      h('div', { class: 'campo' }, h('label', { for: 'whyTexto', text: 'Explicación: se lee cuando alguien falla' }), w, h('div', { class: 'pie' }, refs.msgW, cw.el, cw.vivo)),
      refs.estado,
      h('details', { class: 'vista-previa', open: true }, h('summary', { text: 'Vista previa en el Tap' }), h('div', { class: 'tap-marco' }, refs.lienzo)),
      h('div', { class: 'acciones acciones--nav' },
        h('button', { type: 'button', disabled: idx === 0, onclick: () => ir(idx - 1) }, ic('i-atras'), 'Anterior'),
        h('button', { type: 'button', class: 'primario', disabled: ultima && est.preguntas.length >= LIM.preguntas, onclick: () => (ultima ? actuar(() => { est.preguntas.push(preguntaNueva()); est.actual = est.preguntas.length - 1; }) : ir(idx + 1)) }, ultima ? 'Añadir pregunta' : 'Siguiente pregunta', ic('i-sig'))),
      h('div', { class: 'acciones acciones--aparte' }, refs.deshacer, est.preguntas.length > 1 ? h('button', { type: 'button', class: 'suave', onclick: () => { actuar(() => { est.preguntas.splice(idx, 1); est.actual = Math.min(idx, est.preguntas.length - 1); }); enfocar('.chip[aria-current="true"]'); } }, ic('i-papelera'), 'Quitar esta pregunta') : null,
        h('button', { type: 'button', class: 'suave', onclick: () => { if (confirm('¿Empezar de nuevo? Se quitan las preguntas de este borrador.')) { est = null; deshacer = []; base = ''; avisosPegado = []; try { almacen?.quitar?.(CLAVE_PREGUNTAS); } catch { /* nada */ } vista = 'inicio'; avisar(); dibujar(); enfocar('.op-tarjeta'); } } }, 'Empezar de nuevo'), refs.guardado));
  }

  const tras = () => { guardar(); avisar(); refrescar(); };
  function ir(i, foco = '.chip[aria-current="true"]') { est.actual = Math.max(0, Math.min(est.preguntas.length - 1, i)); guardar(); dibujar(); enfocar(foco); }
  function quitarUltimo() {
    const foto = deshacer.pop(); if (!foto) return;
    const act = est.actual; est = leerEstado(foto) ?? est; est.actual = Math.min(act, est.preguntas.length - 1); base = foto;
    guardar(); avisar(); dibujar();
  }
  function enfocar(sel) { esperar(() => { contenedor.querySelector(sel)?.focus(); }, 0); }
  /** Ctrl+Enter: siguiente pregunta. Alt+1…4: marca la correcta. */
  function teclas(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && est.actual < est.preguntas.length - 1) { e.preventDefault(); ir(est.actual + 1, '#preguntaTexto'); return; }
    if (e.altKey && /^[1-4]$/.test(e.key)) { const i = Number(e.key) - 1; if (i < est.preguntas[est.actual].options.length) { e.preventDefault(); actuarLigero(() => { est.preguntas[est.actual].answer = i; }); contenedor.querySelector(`#corr${i}`)?.focus(); } }
  }

  /** Actualiza lo que cambia al escribir sin reconstruir (el foco no se mueve). */
  function refrescar() {
    if (vista !== 'editar' || !refs.q) return;
    const p = est.preguntas[est.actual], v = validarPregunta(p);
    refs.cq.set(p.q.length); poner(refs.msgQ, v.q); refs.q.toggleAttribute('aria-invalid', !!v.q);
    refs.cw.set(p.why.length); poner(refs.msgW, v.why); refs.w.toggleAttribute('aria-invalid', !!v.why);
    refs.opc.forEach((o, i) => {
      o.c.el.set(p.options[i].length); poner(o.msg, v.opciones[i]);
      o.campo.toggleAttribute?.('aria-invalid', !!v.opciones[i]); o.radio.checked = p.answer === i;
    });
    refs.estado.replaceChildren(marca(v.completa), h('span', { text: v.completa ? 'Esta pregunta está lista.' : `${resumenPregunta(v)}.` }));
    refs.estado.className = 'estado-pregunta ' + (v.completa ? 'lista' : 'falta');
    const r = resumenEstado(est);
    contenedor.querySelectorAll('.chip[data-i]').forEach(c => {
      const i = Number(c.dataset.i), ok = r.validas[i].completa;
      c.dataset.estado = ok ? 'lista' : 'falta'; c.setAttribute('aria-label', `Pregunta ${i + 1}, ${ok ? 'lista' : resumenPregunta(r.validas[i]).toLowerCase()}`);
      c.setAttribute('aria-current', i === est.actual ? 'true' : 'false');
    });
    const res = contenedor.querySelector('#resumenEstado'); if (res) res.textContent = `${r.listas} de ${LIM.preguntas} listas`;
    pintarVista();
  }

  dibujar();
  avisar();
  return {
    /** Al entrar al paso: repinta (el lienzo solo mide algo cuando es visible). */
    mostrar() { dibujar(); },
    destruir() { clearTimeout(temporizadorGuardado); clearTimeout(temporizadorVista); observador?.disconnect(); if (est && almacen?.disponible) almacen.escribir(CLAVE_PREGUNTAS, serializarEstado(est)); contenedor.replaceChildren(); },
    get hayPreguntas() { return !!est; },
  };
}
