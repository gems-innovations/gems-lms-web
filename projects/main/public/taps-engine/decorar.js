// Panel «Decora tu Tap» del paso Listo (/crear): marco, colores, letra, fondo, textos y stickers, y música.
// Solo construye controles; el estado vive en el diseñador (`leer` / `cambiar`) y lo valida estilo.js.
import { FAMILIA, LETRAS, MARCOS, MAX_CAPAS, MAX_TEXTO_CAPA, MUSICAS, PALETAS, PATRONES, STICKERS, capaNueva } from './estilo.js';

const MANIFIESTO = new URL('../taps-musica/musica.json', import.meta.url);
const ESCUCHA_MS = 12_000;                       // la muestra de una pista: suficiente para decidir, no para quedarse sonando

export function montarDecorar(caja, { leer, cambiar }) {
  const doc = caja.ownerDocument;
  const el = (tag, props = {}, ...hijos) => { const n = Object.assign(doc.createElement(tag), props); n.append(...hijos); return n; };
  const icono = d => `<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="${d}" fill="currentColor"/></svg>`;
  const est = () => leer() ?? {};
  const poner = (campo, valor) => { const e = { ...est() }; if (valor === undefined) delete e[campo]; else e[campo] = valor; cambiar(e); };   // quien monta repinta y llama a refrescar()

  // Un grupo de chips de una sola elección: [valor, etiqueta, extra?]; `undefined` = lo de siempre.
  const grupos = [];
  function grupo(titulo, opciones, actual, elegir) {
    const fila = el('div', { className: 'chips', role: 'group' }); fila.setAttribute('aria-label', titulo);
    for (const [valor, texto, decorar] of opciones) {
      const b = el('button', { type: 'button', className: 'chip', textContent: texto });
      decorar?.(b);
      b.onclick = () => elegir(valor);
      b.dataset.valor = valor ?? '';
      fila.append(b);
    }
    grupos.push(() => { const v = actual() ?? ''; for (const b of fila.children) { const on = b.dataset.valor === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } });
    return [el('h4', { textContent: titulo }), fila];
  }

  // ── marco, colores y letra ──
  const marco = grupo('Marco', [[undefined, 'Sin marco'], ...Object.entries(MARCOS)], () => est().marco, v => poner('marco', v));
  const paleta = grupo('Colores de las opciones', [[undefined, 'Los de siempre'], ...Object.entries(PALETAS).map(([id, p]) => [id, p.nombre, b => {
    const m = el('span', { className: 'paleta-mini' }); m.setAttribute('aria-hidden', 'true');
    for (const c of p.colores) m.append(el('i', { style: `background:${c}` }));
    b.prepend(m);
  }])], () => est().paleta, v => poner('paleta', v));
  const letra = grupo('Letra', [[undefined, 'La de siempre'], ...Object.entries(LETRAS).map(([id, n]) => [id, n, b => { b.style.fontFamily = FAMILIA[id]; }])], () => est().letra, v => poner('letra', v));

  // ── fondo: un tinte encima del escenario (el escenario sigue debajo) ──
  const colorFondo = el('input', { type: 'color', value: '#ffd54f' }); colorFondo.setAttribute('aria-label', 'Color del fondo');
  const tipoFondo = () => { const f = est().fondo; return f ? (f.tipo === 'patron' ? f.id : f.tipo) : undefined; };
  const fondoCon = (tipo, c = colorFondo.value) => tipo === undefined ? undefined : tipo === 'color' ? { tipo: 'color', color: c, fuerza: 0.35 } : { tipo: 'patron', id: tipo, color: c, fuerza: 0.4 };
  const fondo = grupo('Fondo', [[undefined, 'Sin fondo'], ['color', 'Color'], ...Object.entries(PATRONES)], tipoFondo, v => poner('fondo', fondoCon(v)));
  colorFondo.oninput = () => { const t = tipoFondo(); poner('fondo', fondoCon(t ?? 'color')); };
  const filaColor = el('label', { className: 'color-fila' }, colorFondo, 'Color del fondo');

  // ── textos y stickers ──
  const colorCapa = el('input', { type: 'color', value: '#ffffff' }); colorCapa.setAttribute('aria-label', 'Color del texto o sticker');
  const texto = el('input', { type: 'text', maxLength: MAX_TEXTO_CAPA, placeholder: 'Ej.: ¡Reto de 7B!', enterKeyHint: 'done' }); texto.setAttribute('aria-label', 'Texto para tu Tap');
  const ponerTexto = el('button', { type: 'button', className: 'chip', textContent: 'Poner texto' });
  const agregar = (tipo, valor) => {
    const capa = capaNueva(est().capas, tipo, valor, colorCapa.value); if (!capa) return;
    poner('capas', [...(est().capas ?? []), capa]);
  };
  ponerTexto.onclick = () => { const t = texto.value.trim(); if (!t) { texto.focus(); return; } agregar('texto', t); texto.value = ''; };
  texto.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ponerTexto.click(); } });
  const stickers = el('div', { className: 'chips stickers', role: 'group' }); stickers.setAttribute('aria-label', 'Stickers');
  for (const [id, s] of Object.entries(STICKERS)) {
    const b = el('button', { type: 'button', className: 'chip', title: s.nombre, innerHTML: icono(s.d) }); b.setAttribute('aria-label', 'Poner ' + s.nombre);
    b.onclick = () => agregar('sticker', id); stickers.append(b);
  }
  const puestas = el('div', { className: 'chips', role: 'group' }); puestas.setAttribute('aria-label', 'Lo que ya pusiste');
  const cuenta = el('p', { className: 'texto pista-capas' });
  function refrescarCapas() {
    const capas = est().capas ?? [], lleno = capas.length >= MAX_CAPAS;
    puestas.replaceChildren(...capas.map((c, i) => {
      const nombre = c.tipo === 'sticker' ? STICKERS[c.id].nombre : `«${c.texto}»`;
      const b = el('button', { type: 'button', className: 'chip quitar', innerHTML: (c.tipo === 'sticker' ? icono(STICKERS[c.id].d) : '') + '<svg class="ic x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg>' });
      if (c.tipo === 'texto') b.prepend(c.texto);
      b.setAttribute('aria-label', 'Quitar ' + nombre);
      b.onclick = () => { const resto = capas.filter((_, k) => k !== i); poner('capas', resto.length ? resto : undefined); };
      return b;
    }));
    cuenta.textContent = lleno ? `Ya tienes ${MAX_CAPAS}: quita uno para poner otro.` : capas.length ? `Puedes poner ${MAX_CAPAS - capas.length} más.` : `Hasta ${MAX_CAPAS} entre textos y stickers.`;
    ponerTexto.disabled = lleno; for (const b of stickers.children) b.disabled = lleno;
  }

  // ── música: elegir una pista la deja sonar unos segundos; «Automática» = la que escoge el Tap según su mundo ──
  let audio = null, corte = 0, manifiesto = null;
  function parar() { clearTimeout(corte); if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; } }
  async function escuchar(id) {
    parar();
    try {
      manifiesto ??= await (await fetch(MANIFIESTO)).json();
      const p = manifiesto.pistas?.find(x => x.id === id), a = new Audio();
      const archivo = p?.archivos?.find(f => a.canPlayType(f.tipo)); if (!archivo) return;
      a.src = new URL(archivo.src, MANIFIESTO).href; a.volume = 0.5; audio = a;
      await a.play(); corte = setTimeout(parar, ESCUCHA_MS);
    } catch { /* sin red o sin permiso de audio: la elección vale igual */ }
  }
  const musica = grupo('Música', [[undefined, 'Automática'], ...Object.entries(MUSICAS)], () => est().musica, v => { poner('musica', v); if (v) escuchar(v); else parar(); });

  caja.replaceChildren(
    ...marco, ...paleta, ...letra, ...fondo, filaColor,
    el('h4', { textContent: 'Textos y stickers' }), el('div', { className: 'texto-fila' }, texto, ponerTexto), el('label', { className: 'color-fila' }, colorCapa, 'Color de lo próximo que pongas'),
    stickers, puestas, cuenta,
    ...musica, el('p', { className: 'texto', textContent: 'Al elegir una pista suena unos segundos para que la escuches.' }),
  );
  function refrescar() { for (const g of grupos) g(); refrescarCapas(); }
  refrescar();
  return { refrescar, parar, destruir() { parar(); caja.replaceChildren(); } };
}
