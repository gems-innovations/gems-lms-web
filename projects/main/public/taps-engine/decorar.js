// Panel «Decora tu Tap» del paso Listo (/crear): marco, colores, letra, fondo, textos y stickers, y música.
// Solo construye controles; el estado vive en el diseñador (`leer` / `cambiar`) y lo valida estilo.js.
import { FAMILIA, LETRAS, MARCOS, MAX_CAPAS, MAX_TEXTO_CAPA, MUSICAS, PALETAS, PATRONES, STICKERS, capaNueva, pintarFondo } from './estilo.js';

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
  // Muestra de cada marco: el mismo marco animado del Tap (disenador.css, .tap-lienzo[data-marco]) en pequeño.
  const conMarco = id => b => { const m = el('span', { className: 'tap-lienzo marco-mini' }); m.setAttribute('aria-hidden', 'true'); if (id) m.dataset.marco = id; b.prepend(m); };
  const marco = grupo('Marco', [[undefined, 'Sin marco', conMarco()], ...Object.entries(MARCOS).map(([id, n]) => [id, n, conMarco(id)])], () => est().marco, v => poner('marco', v));
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
  // Muestra de cada fondo: el mismo pintarFondo del Tap sobre un cuadrito oscuro, con el color elegido (se repinta al cambiarlo).
  const muestrasFondo = [];
  const pintarMuestraFondo = (c, tipo) => {
    const g = c.getContext('2d'); g.fillStyle = '#2a2640'; g.fillRect(0, 0, c.width, c.height);
    try { pintarFondo(g, tipo === undefined ? undefined : { ...fondoCon(tipo), fuerza: 0.7 }, c.width, c.height); } catch { /* sin canvas: queda el cuadrito */ }
  };
  const conFondo = tipo => b => { const c = el('canvas', { className: 'fondo-mini', width: 24, height: 24 }); c.setAttribute('aria-hidden', 'true'); muestrasFondo.push([c, tipo]); b.prepend(c); };
  const fondo = grupo('Fondo', [[undefined, 'Sin fondo', conFondo()], ['color', 'Color', conFondo('color')], ...Object.entries(PATRONES).map(([id, n]) => [id, n, conFondo(id)])], tipoFondo, v => poner('fondo', fondoCon(v)));
  const repintarMuestrasFondo = () => { for (const [c, t] of muestrasFondo) pintarMuestraFondo(c, t); };
  colorFondo.oninput = () => { const t = tipoFondo(); poner('fondo', fondoCon(t ?? 'color')); repintarMuestrasFondo(); };
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

  // ── pestañas (role=tablist + flechas, Inicio y Fin; foco itinerante): una sección a la vez en vez de una lista larga ──
  const trazo = d => `<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="${d}"/></svg>`;   // de línea, como los iconos del diseñador
  const SECCIONES = [
    ['marco', 'Marco', 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8v10H8z', [...marco]],
    ['colores', 'Colores', 'M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM16 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 13a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', [...paleta]],
    ['letra', 'Letra', 'M4 20 10 4h1.5l6 16M6.6 14h8.4', [...letra]],
    ['fondo', 'Fondo', 'M4 4h16v16H4zM4 12h16M12 4v16', [...fondo, filaColor]],
    ['textos', 'Textos', 'M4 5h11M9.5 5v14M17.5 11l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z', [
      el('h4', { textContent: 'Textos y stickers' }), el('div', { className: 'texto-fila' }, texto, ponerTexto), el('label', { className: 'color-fila' }, colorCapa, 'Color de lo próximo que pongas'),
      stickers, puestas, cuenta, el('p', { className: 'texto pista-capas', textContent: 'Arrastra los textos y stickers sobre el Tap para moverlos.' })]],
    ['musica', 'Música', 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', [...musica, el('p', { className: 'texto', textContent: 'Al elegir una pista suena unos segundos para que la escuches.' })]],
  ];
  let seccion = 'marco';
  const lista = el('div', { className: 'pestanas decora-pestanas', role: 'tablist' }); lista.setAttribute('aria-label', 'Qué decorar');
  const paneles = SECCIONES.map(([id, nombre, d, hijos]) => {
    const b = el('button', { type: 'button', id: 'decora-' + id, innerHTML: trazo(d) }); b.append(nombre);
    b.dataset.id = id; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'decora-panel-' + id); b.onclick = () => elegir(id);
    lista.append(b);
    const p = el('div', { className: 'decora-panel', id: 'decora-panel-' + id, role: 'tabpanel' }, ...hijos); p.setAttribute('aria-labelledby', 'decora-' + id); p.dataset.id = id;
    return p;
  });
  function elegir(id, enfocar = false) {
    seccion = id;
    for (const b of lista.children) { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && enfocar) b.focus(); }
    for (const p of paneles) p.hidden = p.dataset.id !== id;
    if (id !== 'musica') parar();
  }
  lista.addEventListener('keydown', e => {
    const ids = SECCIONES.map(s => s[0]), i = ids.indexOf(seccion);
    const destino = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length] : e.key === 'ArrowLeft' ? ids[(i - 1 + ids.length) % ids.length] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids[ids.length - 1] : null;
    if (destino) { e.preventDefault(); elegir(destino, true); }
  });
  caja.replaceChildren(lista, ...paneles);
  elegir(seccion);
  repintarMuestrasFondo();
  function refrescar() { for (const g of grupos) g(); refrescarCapas(); }
  refrescar();
  return { refrescar, parar, elegir, destruir() { parar(); caja.replaceChildren(); } };
}
