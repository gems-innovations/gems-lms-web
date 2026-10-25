// Diseñador de personajes de Taps (tema «época»): la lógica del prototipo disenador.html, extraída tal cual (PR-6 del plan,
// producto/taps/disenador-plan-ux.md §5) para que la usen dos páginas con el MISMO comportamiento y las MISMAS claves de
// localStorage (taps.disenador.*):
// - disenador.html (página estática noindex): `montarDisenador(raiz)`; mide por su cuenta con count.js (GoatCounter).
// - La ruta /crear de la web (TapDisenador, Angular): `montarDisenador(raiz, { enviar, alEvento, pasoPublicar })`; la web
//   manda los eventos por AnalyticsService (respeta ?interno=1 y no carga count.js dos veces) y añade su propia capa.
// Nada de aquí corre en el servidor: el módulo se importa solo en el navegador. Todo lo que se añade al documento o a window
// se quita con `destruir()`.
import { CATALOGO, POSES, blendPose, drawHost, lookOf, poseFor, validarLook, ITEMS } from './themes/epoca/rig.js';
import { WORLD_NAMES, GROUND_Y, paintWorld, paintAmbient } from './themes/epoca/scenery.js';
import { PALETAS, NOMBRES, MUNDOS, sombra, sorprenderTodo, sorprenderPestana, sorprenderEscenario, sugerencias } from './themes/epoca/sugerencias.js';
import { CLAVE_BORRADOR, CLAVE_LOOKS, MAX_LOOKS, MAX_NOMBRE, armarBorrador, borrarLook, crearAlmacen, duplicarLook, fechaCorta, guardarLook, parsearBorrador, parsearLooks, renombrarLook, serializarBorrador, serializarLooks } from './themes/epoca/guardado.js';
import { enlaceDeLook, exportarJson, importarJson, lookDesdeHash } from './themes/epoca/compartir.js';
import { PREFIJO, crearMedidor, esAutomatico, esInterno, nombreAbandono, nombreValido, paraGoatCounter } from './themes/epoca/medicion.js';

export const PREFIJO_MEDICION = PREFIJO;
export const CLAVE_GUSTO = 'taps.disenador.gusto';
/** Hoja de estilos del diseñador (todo bajo .dsn), junto a este módulo. */
export const URL_ESTILOS = new URL('./disenador.css', import.meta.url).href;

/** Marcado del diseñador (un solo origen para las dos páginas). Se vuelca en la raíz al montar. */
export const PLANTILLA = "<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\">\n  <symbol id=\"i-cara\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10.5h.01M15.5 10.5h.01M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2\"/></symbol>\n  <symbol id=\"i-pelo\" viewBox=\"0 0 24 24\"><path d=\"M5 14c0-5 3-9 7-9s7 4 7 9M5 14c1.5-1 2.5-3 3-5M19 14c-1.5-1-2.5-3-3-5M9 12c-.5 1.5-1.5 2.5-3 3M15 12c.5 1.5 1.5 2.5 3 3\"/><path d=\"M8 19c1 .8 2.5 1.2 4 1.2s3-.4 4-1.2\"/></symbol>\n  <symbol id=\"i-ropa\" viewBox=\"0 0 24 24\"><path d=\"M8 4l4 2 4-2 4 4-3 2v10H7V10L4 8z\"/><path d=\"M8 4c.5 2 2 3 4 3s3.5-1 4-3\"/></symbol>\n  <symbol id=\"i-objeto\" viewBox=\"0 0 24 24\"><path d=\"M7 11V7a2 2 0 0 1 4 0v4M11 10V5a2 2 0 0 1 4 0v6M15 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 14a2 2 0 0 1 3-2.4\"/></symbol>\n  <symbol id=\"i-deshacer\" viewBox=\"0 0 24 24\"><path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10a6 6 0 0 1 0 12h-3\"/></symbol>\n  <symbol id=\"i-sorpresa\" viewBox=\"0 0 24 24\"><path d=\"M4 6h3l10 12h3M20 6h-3l-2.5 3M4 18h3l2.5-3\"/><path d=\"M17 4l3 2-3 2M17 16l3 2-3 2\"/></symbol>\n  <symbol id=\"i-mas\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></symbol>\n  <symbol id=\"i-puntos\" viewBox=\"0 0 24 24\"><circle cx=\"6\" cy=\"12\" r=\"1.3\"/><circle cx=\"12\" cy=\"12\" r=\"1.3\"/><circle cx=\"18\" cy=\"12\" r=\"1.3\"/></symbol>\n  <symbol id=\"i-atras\" viewBox=\"0 0 24 24\"><path d=\"M15 5l-7 7 7 7\"/></symbol>\n  <symbol id=\"i-sig\" viewBox=\"0 0 24 24\"><path d=\"M9 5l7 7-7 7\"/></symbol>\n  <symbol id=\"i-listo\" viewBox=\"0 0 24 24\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></symbol>\n  <symbol id=\"i-dedo\" viewBox=\"0 0 24 24\"><path d=\"M10 11V5a1.5 1.5 0 0 1 3 0v6M13 10a1.5 1.5 0 0 1 3 0v2M16 12a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.4-1.8L10 15\"/></symbol>\n  <symbol id=\"i-copiar\" viewBox=\"0 0 24 24\"><rect x=\"9\" y=\"9\" width=\"11\" height=\"11\" rx=\"2\"/><path d=\"M5 15V6a2 2 0 0 1 2-2h9\"/></symbol>\n  <symbol id=\"i-idea\" viewBox=\"0 0 24 24\"><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 1 3.6 10.8c-.5.4-.6 1-.6 1.6V16H9v-.6c0-.6-.1-1.2-.6-1.6A6 6 0 0 1 12 3z\"/></symbol>\n  <symbol id=\"i-guardar\" viewBox=\"0 0 24 24\"><path d=\"M5 4h11l3 3v13H5z\"/><path d=\"M8 4v5h7V4M8 20v-6h8v6\"/></symbol>\n  <symbol id=\"i-lapiz\" viewBox=\"0 0 24 24\"><path d=\"M4 20l4-1L19 8l-3-3L5 16z\"/><path d=\"M14 7l3 3\"/></symbol>\n  <symbol id=\"i-papelera\" viewBox=\"0 0 24 24\"><path d=\"M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13\"/><path d=\"M10 11v6M14 11v6\"/></symbol>\n  <symbol id=\"i-reloj\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></symbol>\n  <symbol id=\"i-enlace\" viewBox=\"0 0 24 24\"><path d=\"M10 14a4 4 0 0 0 5.6.4l3-3a4 4 0 0 0-5.6-5.6l-1.5 1.5\"/><path d=\"M14 10a4 4 0 0 0-5.6-.4l-3 3a4 4 0 0 0 5.6 5.6l1.5-1.5\"/></symbol>\n  <symbol id=\"i-bajar\" viewBox=\"0 0 24 24\"><path d=\"M12 4v11M7 10l5 5 5-5\"/><path d=\"M5 20h14\"/></symbol>\n  <symbol id=\"i-subir\" viewBox=\"0 0 24 24\"><path d=\"M12 15V4M7 9l5-5 5 5\"/><path d=\"M5 20h14\"/></symbol>\n  <symbol id=\"i-jugar\" viewBox=\"0 0 24 24\"><path d=\"M8 5v14l11-7z\"/></symbol>\n  <symbol id=\"i-sonrisa\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10h.01M15.5 10h.01\"/><path d=\"M8 14c1 1.8 2.4 2.7 4 2.7s3-.9 4-2.7\"/></symbol>\n  <symbol id=\"i-neutro\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10h.01M15.5 10h.01\"/><path d=\"M8.5 15.5h7\"/></symbol>\n  <symbol id=\"i-cerrar\" viewBox=\"0 0 24 24\"><path d=\"M6 6l12 12M18 6L6 18\"/></symbol>\n  <symbol id=\"i-regalo\" viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"9\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M4 13h16M12 9v11\"/><path d=\"M12 9c-1.5-3-4-4-5.5-2.5S9 9 12 9zm0 0c1.5-3 4-4 5.5-2.5S15 9 12 9z\"/></symbol>\n</svg>\n\n<header>\n  <h1>Haz tu personaje</h1>\n  <ol class=\"progreso\" id=\"progreso\" aria-label=\"Pasos\">\n    <li class=\"ahora\" title=\"Personaje\"><span>Personaje</span></li>\n    <li title=\"Escenario\"><span>Escenario</span></li>\n    <li title=\"Listo\"><span>Listo</span></li>\n  </ol>\n</header>\n\n<section class=\"vista\" id=\"vista\" aria-label=\"Vista previa de tu personaje\">\n  <canvas id=\"lienzo\" role=\"img\" aria-label=\"Tu personaje\"></canvas>\n  <div class=\"bocadillo\" id=\"bocadillo\" aria-live=\"polite\"></div>\n  <div class=\"etiqueta\">Así estaba antes</div>\n  <div class=\"ranura\" id=\"ranuraVista\"></div>\n  <div class=\"pista\" id=\"pista\" hidden><svg class=\"ic\"><use href=\"#i-dedo\"/></svg>Mantén presionado para comparar</div>\n</section>\n\n<div class=\"sugerencia\" id=\"sugerencia\" hidden>\n  <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-idea\"/></svg>\n  <span id=\"sugerenciaTexto\"></span>\n  <button type=\"button\" id=\"sugerenciaAplicar\">Aplicar</button>\n</div>\n\n<div class=\"barra\">\n  <h2 id=\"titulo\">Elige un punto de partida</h2>\n  <button id=\"deshacer\" disabled aria-label=\"Deshacer el último cambio\"><svg class=\"ic\"><use href=\"#i-deshacer\"/></svg>Deshacer</button>\n  <button id=\"sorprender\" aria-label=\"Sorpréndeme con una combinación\"><svg class=\"ic\"><use href=\"#i-sorpresa\"/></svg>Sorpréndeme</button>\n</div>\n\n<main class=\"paso\" id=\"paso\">\n  <section class=\"pantalla activa\" data-p=\"0\">\n    <p class=\"texto\">Todos empiezan con un personaje completo. Elige uno y ajústalo a tu gusto; nada es obligatorio.</p>\n    <div class=\"tarjetas\" id=\"presets\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"1\">\n    <nav class=\"pestanas\" id=\"pestanas\" aria-label=\"Qué ajustar\"></nav>\n    <div id=\"ajustes\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"2\">\n    <p class=\"texto\">Así se ve tu personaje en cada lugar. Elige uno; puedes cambiarlo después.</p>\n    <div class=\"tarjetas escenas\" id=\"escenas\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"3\">\n    <p class=\"texto\" id=\"despedida\">Tu personaje está listo. Toca una reacción para verlo en acción.</p>\n    <div class=\"reacciones\" id=\"reacciones\" role=\"group\" aria-label=\"Reacciones\"></div>\n    <section class=\"muestra-pregunta\" id=\"muestraPregunta\" aria-labelledby=\"muestraTitulo\">\n      <h3 id=\"muestraTitulo\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-jugar\"/></svg>Míralo en un Tap</h3>\n      <p class=\"texto\">Así se verá cuando alguien responda una pregunta con tu personaje. Prueba con una de ejemplo.</p>\n      <button type=\"button\" id=\"probar\" class=\"grande secundario\" style=\"background:var(--panel2);border-color:var(--acc);color:var(--txt)\"><svg class=\"ic\"><use href=\"#i-jugar\"/></svg>Probar con una pregunta</button>\n      <p class=\"enunciado\" id=\"enunciado\" hidden></p>\n      <div class=\"opciones\" id=\"opciones\" role=\"group\" aria-label=\"Opciones de la pregunta de ejemplo\"></div>\n      <p class=\"veredicto\" id=\"veredicto\" role=\"status\" aria-live=\"polite\"></p>\n    </section>\n    <form class=\"guardar\" id=\"formGuardar\" novalidate>\n      <label for=\"nombre\">Ponle nombre (opcional)</label>\n      <div class=\"fila\"><input id=\"nombre\" maxlength=\"20\" autocomplete=\"off\" autocapitalize=\"words\" enterkeyhint=\"done\" spellcheck=\"false\"><small id=\"restan\" aria-hidden=\"true\"></small></div>\n      <button type=\"submit\" id=\"guardar\" class=\"grande\"><svg class=\"ic\"><use href=\"#i-guardar\"/></svg>Guardar en este dispositivo</button>\n      <p class=\"estado\" id=\"estadoGuardado\" role=\"status\" aria-live=\"polite\"></p>\n    </form>\n    <div class=\"gusto\" id=\"gusto\" hidden role=\"group\" aria-labelledby=\"gustoTexto\">\n      <p id=\"gustoTexto\">¿Te gustó hacerlo?</p>\n      <button type=\"button\" class=\"si\" id=\"gustoSi\" aria-label=\"Sí, me gustó\"><svg class=\"ic\"><use href=\"#i-sonrisa\"/></svg></button>\n      <button type=\"button\" id=\"gustoMeh\" aria-label=\"Más o menos\"><svg class=\"ic\"><use href=\"#i-neutro\"/></svg></button>\n      <button type=\"button\" class=\"cerrar\" id=\"gustoNo\" aria-label=\"Ahora no\"><svg class=\"ic\"><use href=\"#i-cerrar\"/></svg></button>\n    </div>\n    <section class=\"mislooks\" id=\"misLooks\" aria-labelledby=\"misLooksTitulo\">\n      <h3 id=\"misLooksTitulo\">Mis looks <small id=\"cuentaLooks\"></small></h3>\n      <p class=\"texto\" id=\"misLooksVacio\">Aquí aparecerán los personajes que guardes. Se quedan en este dispositivo; nada se envía.</p>\n      <div class=\"looks\" id=\"listaLooks\"></div>\n    </section>\n    <section class=\"compartir\" id=\"compartir\" aria-labelledby=\"compartirTitulo\">\n      <h3 id=\"compartirTitulo\" class=\"texto\" style=\"margin:0\">Compártelo con quien quieras. El enlace lleva el personaje completo; nadie necesita cuenta.</h3>\n      <button type=\"button\" id=\"copiarEnlace\" class=\"grande secundario\"><svg class=\"ic\"><use href=\"#i-enlace\"/></svg>Copiar enlace</button>\n      <div class=\"enlace\"><input id=\"enlaceTexto\" readonly aria-label=\"Enlace de tu personaje\"><button type=\"button\" id=\"enlaceSeleccionar\">Seleccionar</button></div>\n      <p class=\"estado\" id=\"estadoCompartir\" role=\"status\" aria-live=\"polite\"></p>\n    </section>\n    <p class=\"texto\">Pronto vas a poder usarlo en tu propio Tap.</p>\n    <details id=\"masDetalles\">\n      <summary><svg class=\"ic\"><use href=\"#i-puntos\"/></svg>Más</summary>\n      <p class=\"texto\" style=\"margin-top:8px\">Llévate el personaje como archivo o trae uno que te hayan pasado.</p>\n      <div class=\"mas-acciones\">\n        <button type=\"button\" id=\"exportar\"><svg class=\"ic\"><use href=\"#i-bajar\"/></svg>Exportar JSON</button>\n        <label class=\"boton\" for=\"archivoImportar\"><svg class=\"ic\"><use href=\"#i-subir\"/></svg>Importar archivo<input type=\"file\" id=\"archivoImportar\" accept=\".json,application/json,text/plain\"></label>\n        <button type=\"button\" id=\"copiar\"><svg class=\"ic\"><use href=\"#i-copiar\"/></svg>Copiar JSON</button>\n      </div>\n      <div class=\"importar\">\n        <label class=\"texto\" for=\"pegarImportar\" style=\"margin:0\">O pega aquí el texto de un personaje</label>\n        <textarea id=\"pegarImportar\" aria-label=\"Texto del personaje para importar\" placeholder='{\"look\": ...}' spellcheck=\"false\"></textarea>\n        <div class=\"fila\"><button type=\"button\" id=\"importarPegado\">Importar lo pegado</button><span class=\"aviso\" id=\"aviso\" aria-live=\"polite\"></span></div>\n      </div>\n      <textarea id=\"json\" readonly aria-label=\"Datos del personaje\"></textarea>\n    </details>\n  </section>\n</main>\n\n<div class=\"continuar\" id=\"continuar\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"continuarTitulo\">\n  <div class=\"hoja\">\n    <img id=\"continuarMini\" alt=\"\" width=\"84\" height=\"112\">\n    <div><h2 id=\"continuarTitulo\">Seguir donde ibas</h2><p id=\"continuarTexto\">Dejaste un personaje a medias en este dispositivo.</p></div>\n    <div class=\"botones\">\n      <button type=\"button\" class=\"primario\" id=\"continuarSi\">Seguir donde ibas</button>\n      <button type=\"button\" id=\"continuarNo\">Empezar otro</button>\n    </div>\n  </div>\n</div>\n\n<div class=\"continuar\" id=\"recibido\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"recibidoTitulo\">\n  <div class=\"hoja\">\n    <img id=\"recibidoMini\" alt=\"\" width=\"84\" height=\"112\">\n    <div><h2 id=\"recibidoTitulo\">Look de un amigo</h2><p id=\"recibidoTexto\">Alguien te mandó su personaje.</p></div>\n    <p class=\"estado\" id=\"recibidoEstado\" role=\"status\" aria-live=\"polite\"></p>\n    <div class=\"botones tres\">\n      <button type=\"button\" class=\"primario\" id=\"recibidoProbar\">Probarlo y ajustarlo</button>\n      <button type=\"button\" id=\"recibidoGuardar\"><svg class=\"ic\"><use href=\"#i-guardar\"/></svg>Guardarlo en Mis looks</button>\n      <button type=\"button\" class=\"terciario\" id=\"recibidoNo\">Seguir con el mío</button>\n    </div>\n  </div>\n</div>\n\n<footer>\n  <button id=\"atras\" hidden><svg class=\"ic\"><use href=\"#i-atras\"/></svg>Atrás</button>\n  <button id=\"siguiente\" class=\"primario\">Siguiente<svg class=\"ic\"><use href=\"#i-sig\"/></svg></button>\n</footer>";

/** Añade la hoja de estilos al documento una sola vez (disenador.html la trae en el <head>; la web no). */
export function asegurarEstilos(doc = document) {
  if (doc.querySelector('link[data-disenador-css]')) return;
  const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = URL_ESTILOS; l.dataset.disenadorCss = '1'; doc.head.append(l);
}

/**
 * Monta el diseñador dentro de `raiz` (un elemento vacío con la clase .dsn) y devuelve `{ ok, registro, destruir }`.
 * Opciones: `enviar(path)` canal de analítica de la página (si falta, el módulo carga count.js); `alEvento(nombreCorto)` aviso
 * por cada evento aceptado; `pasoPublicar: { texto, alTocar }` cuarto punto de progreso visible desde el inicio.
 */
export async function montarDisenador(raiz, opciones = {}) {
  asegurarEstilos(raiz.ownerDocument);
  raiz.classList.add('dsn');
  raiz.innerHTML = PLANTILLA;
  const oyentes = [];
  const escuchar = (t, ev, fn) => { t.addEventListener(ev, fn); oyentes.push([t, ev, fn]); };
  // Todo temporizador pasa por aquí para poder cancelarlo en destruir(): ninguno toca la raíz ya vaciada.
  const temporizadores = new Set();
  const esperar = (fn, ms) => { const id = setTimeout(() => { temporizadores.delete(id); fn(); }, ms); temporizadores.add(id); return id; };
  if (opciones.pasoPublicar) {
    const li = document.createElement('li'); li.className = 'publicar'; li.title = opciones.pasoPublicar.texto;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'publicar'; b.textContent = opciones.pasoPublicar.texto;
    // La página recibe el contexto del gancho (PR-8): el borrador se guarda en el acto (así tiene borradorId aunque el autoguardado
    // de 1 s no haya corrido) y el enlace del look sale de compartir.js. Nada de esto viaja a ningún servidor desde aquí.
    b.onclick = () => {
      try {
        let borradorId = null;
        try { if (almacen.disponible) { guardarBorradorAhora(); borradorId = borradorActual?.borradorId ?? null; } } catch { borradorId = null; }
        opciones.pasoPublicar.alTocar?.({ borradorId, enlace: enlaceActual(), nombre: $('nombre').value.trim() || nombreSugerido() });
      } catch { /* la página decide */ }
    };
    li.append(b); raiz.querySelector('#progreso').append(li);
  }
  const $ = id => raiz.querySelector('#' + id);
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────────────────────── medición (themes/epoca/medicion.js): solo nombres cerrados, nunca el look ─────────────────────────
  // Canal: GoatCounter, el mismo contador sin cookies de la web (index.html + AnalyticsService), que acepta cualquier path
  // `taps/...`; el endpoint de estadísticas por Tap del API solo entiende vista/respuesta/completado/compartido de un Tap del
  // banco, así que no sirve para esto sin cambiarlo. Reglas: `?interno=1` (misma marca `skipgc`) y navegadores automatizados
  // (Playwright, prerender) no cargan count.js ni envían nada; si count.js tarda o falla, los eventos esperan en una cola de
  // 200 y se descartan en silencio. `window.tapsMedicion.registro` deja ver la secuencia (depuración y pruebas).
  let storageNativo = null; try { storageNativo = window.localStorage; } catch { storageNativo = null; }
  const interno = esInterno(location.search, storageNativo);
  const automatico = esAutomatico(navigator.userAgent, navigator.webdriver === true);
  const medidor = crearMedidor({ activo: !interno });
  const abierto = performance.now();
  let contadorListo = false;
  function bombear() {                           // manda lo pendiente: a `enviar` (la web) o a count.js cuando ya está; si no, se queda en la cola
    if (opciones.enviar) { for (const n of medidor.vaciar()) { try { opciones.enviar(PREFIJO + n); } catch { /* sin analítica no pasa nada */ } } return; }
    const gc = window.goatcounter; if (!gc?.count) return;
    for (const n of medidor.vaciar()) { try { gc.count(paraGoatCounter(n)); } catch { /* sin analítica no pasa nada */ } }
  }
  function contar(nombre) {
    try {
      const n = nombreValido(nombre);
      if (!medidor.evento(nombre)) return;
      try { opciones.alEvento?.(n); } catch { /* quien monta decide qué hacer con él */ }
      if (opciones.enviar || contadorListo) bombear();
    } catch { /* ídem */ }
  }
  if (!opciones.enviar && !interno && !automatico) {
    try {
      const s = document.createElement('script'); s.id = 'goatcounter-script'; s.async = true; s.src = 'https://gc.zgo.at/count.js';
      s.dataset.goatcounter = 'https://infogems.goatcounter.com/count';
      s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });   // la página la cuenta el router de la web; aquí solo acciones
      s.addEventListener('load', () => { contadorListo = true; bombear(); }, { once: true });
      document.head.append(s);
    } catch { /* sin script no hay medición: la página sigue igual */ }
  }
  window.tapsMedicion = Object.freeze({ registro: medidor.registro, interno, automatico });

  let theme;
  try { theme = await (await fetch(new URL('./themes/epoca/theme.json', import.meta.url))).json(); }
  catch { contar('error/carga'); $('titulo').textContent = 'No se pudo cargar el tema. Revisa la conexión y vuelve a intentar.'; return { ok: false, destruir() {} }; }

  // ───────────────────────── datos (textos para personas; paletas y afinidades en themes/epoca/sugerencias.js) ─────────────────────────
  const MUNDO_DE = { grabador: 'taller-londres', arqueologa: 'excavacion-egipto', senador: 'foro-roma', escriba: 'excavacion-egipto', artesano: 'sala-medieval', investigadora: 'laboratorio-moderno', periodista: 'laboratorio-moderno' };
  const OBJETO_DE = { grabador: 'pluma', arqueologa: 'cepillo', senador: 'pergamino', escriba: 'pergamino', artesano: 'antorcha', investigadora: 'lupa', periodista: 'libro' };
  const paleta = campo => campo === 'coat' ? (PALETAS.coat[estado.look.outfit] || PALETAS.coat.levita) : PALETAS[campo];
  const FRASES = {
    preset: n => `¡Hola! Soy ${n}.`, hat: ['¿Me queda bien?', 'Buen sombrero.'], hair: ['Nuevo peinado.', '¿Qué tal así?'], outfit: ['¡Mira este cambio!', 'Me gusta esta ropa.'],
    color: ['Buen color.', 'Combina bien.'], face: ['Esta es mi cara.', '¿Me reconoces?'], item: ['Lo llevo en la mano.', '¿Y esto?'], world: ['Aquí me siento en casa.', 'Buen lugar.'],
    sorpresa: ['¡Sorpresa!', 'A ver qué tal.'], deshacer: ['Como antes.'], sugerencia: ['Buena idea.', 'Así va mejor.'],
    guardar: ['¡Guardado!', 'Aquí me quedo.'], cargar: ['¡Aquí estoy otra vez!', 'Me acordaba de ti.'],
  };
  const REACCION = { preset: ['celebrate', 1.3], hat: ['talk', 1], hair: ['talk', 1], outfit: ['dance', 1.1], color: ['talk', 0.8], face: ['talk', 0.8], item: ['think', 1], world: ['talk', 1], sorpresa: ['dance', 1.2], deshacer: ['think', 0.8], sugerencia: ['celebrate', 1], guardar: ['celebrate', 1.4], cargar: ['celebrate', 1.2] };
  // nombre sugerido según el punto de partida (editable, nunca obligatorio)
  const SUGERIDO = { grabador: 'Tomás', arqueologa: 'Capitana Inés', senador: 'Lucio', escriba: 'Nefer', artesano: 'Beltrán', investigadora: 'Marta', periodista: 'Álvaro', sorpresa: 'Mi personaje' };
  const QUIETA = { celebrate: 'happy', dance: 'happy', talk: 'still', think: 'think', hurt: 'oops', sad: 'oops', idle: 'still' };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ───────────────────────── estado ─────────────────────────
  const estado = { base: 'grabador', look: lookOf(theme.characters.grabador), item: 'pluma', world: 'taller-londres' };
  const copia = e => ({ base: e.base, look: { ...e.look }, item: e.item, world: e.world });
  const historial = [];                          // para Deshacer y comparar
  let pantalla = 0, pestana = 'cara';

  function cambiar(tipo, aplicar) {              // todo cambio pasa por aquí: guarda el anterior, aplica, reacciona y repinta
    historial.push(copia(estado)); if (historial.length > 40) historial.shift();
    aplicar();
    if (estado.look.vest === undefined) estado.look.vest = null;
    $('deshacer').disabled = false;
    reaccionar(tipo);
    fondoSucio = fondoSucio || tipo === 'world';
    escenasSucias = true;                        // las miniaturas del paso 2 llevan al personaje: se repintan al volver a verlas
    if (tipo === 'world' && !reducido) entrada = 1;
    refrescarControles(); refrescarSugerencia(); pintar(); pintarEscenas();
    programarAutoguardado();
    if (pantalla === 1 && CAMBIO_DE_PESTANA.has(tipo)) contar('cambio/' + pestana);   // agregado: 1 por pestaña por minuto
    try { navigator.vibrate?.(12); } catch {}
  }
  const CAMBIO_DE_PESTANA = new Set(['face', 'hair', 'outfit', 'color', 'hat', 'item', 'sugerencia']);
  function deshacer() {
    const ant = historial.pop(); if (!ant) return;
    contar('deshacer');
    Object.assign(estado, ant); $('deshacer').disabled = !historial.length;
    fondoSucio = true; escenasSucias = true; reaccionar('deshacer'); construirAjustes(); refrescarControles(); refrescarSugerencia(); pintar(); pintarEscenas();
    programarAutoguardado();
  }
  function ponerPreset(id) {
    const c = theme.characters[id];
    cambiar('preset', () => { estado.base = id; estado.look = lookOf(c); estado.item = OBJETO_DE[id] ?? null; estado.world = MUNDO_DE[id] ?? theme.defaultWorld; });
    decir(FRASES.preset(c.name)); fondoSucio = true; construirAjustes();
    contar('preset/' + id);
  }
  function aplicarResultado(r) { estado.look = r.look; estado.item = r.item; estado.world = r.world; }
  function sorprender() {                        // curado, no un dado: combinaciones coherentes por prenda (tablas de sugerencias.js)
    const ant = estado.world;
    cambiar('sorpresa', () => {
      if (pantalla === 0) { aplicarResultado(sorprenderTodo()); estado.base = 'sorpresa'; }
      else if (pantalla === 1) aplicarResultado(sorprenderPestana(pestana, estado));
      else aplicarResultado(sorprenderEscenario(estado));
    });
    if (estado.world !== ant) { fondoSucio = true; if (!reducido) entrada = 1; pintar(); }
    construirAjustes();
    contar('sorprendeme/' + (pantalla === 0 ? 'todo' : pantalla === 1 ? pestana : 'escenario'));
  }

  // Sugerencia contextual de una línea bajo la vista (paso 1: prenda → sombrero, manga, objeto; paso 2: objeto → escenario)
  let sugerenciaActual = null;
  function refrescarSugerencia() {
    const caja = $('sugerencia');
    const lista = pantalla === 1 ? sugerencias(estado, 'personaje') : pantalla === 2 ? sugerencias(estado, 'escenario') : [];
    sugerenciaActual = lista[0] ?? null;
    caja.hidden = !sugerenciaActual;
    if (sugerenciaActual) { $('sugerenciaTexto').textContent = sugerenciaActual.texto; $('sugerenciaAplicar').setAttribute('aria-label', 'Aplicar: ' + sugerenciaActual.texto); }
  }
  $('sugerenciaAplicar').onclick = () => {
    const s = sugerenciaActual; if (!s) return;
    cambiar('sugerencia', () => { Object.assign(estado.look, s.cambios.look || {}); if ('item' in s.cambios) estado.item = s.cambios.item; if (s.cambios.world) { estado.world = s.cambios.world; fondoSucio = true; if (!reducido) entrada = 1; } });
    construirAjustes(); if (s.cambios.world) pintar();
  };

  // ───────────────────────── pantallas ─────────────────────────
  const TITULOS = ['Punto de partida', 'Ajústalo', 'Escenario', 'Está listo'];
  function irA(p) {
    const destino = Math.max(0, Math.min(3, p));
    if (destino > pantalla && destino >= 2) contar(destino === 2 ? 'paso/escenario' : 'paso/listo');   // solo al avanzar
    pantalla = destino;
    raiz.querySelectorAll('.pantalla').forEach(s => s.classList.toggle('activa', +s.dataset.p === pantalla));
    const punto = pantalla <= 1 ? 0 : pantalla - 1;
    [...raiz.querySelectorAll('#progreso li:not(.publicar)')].forEach((li, i) => { li.classList.toggle('ahora', i === punto); li.classList.toggle('ya', i < punto); li.setAttribute('aria-current', i === punto ? 'step' : 'false'); });
    $('titulo').textContent = TITULOS[pantalla];
    $('atras').hidden = pantalla === 0;
    $('sorprender').hidden = pantalla === 0 || pantalla === 3;
    const sig = $('siguiente');
    sig.innerHTML = pantalla === 3 ? 'Empezar otro' : pantalla === 2 ? 'Listo<svg class="ic"><use href="#i-listo"/></svg>' : 'Siguiente<svg class="ic"><use href="#i-sig"/></svg>';
    $('pista').hidden = !historial.length;
    $('paso').scrollTop = 0;
    if (pantalla === 1) construirAjustes();
    if (pantalla === 2) construirEscenas();
    if (pantalla === 3) { refrescarJson(); prepararGuardar(); reiniciarPregunta(); if (!reducido) reaccionar('preset'); }
    refrescarSugerencia();
    programarAutoguardado();
  }
  $('siguiente').onclick = () => { if (pantalla === 3) { empezarOtro(); } else irA(pantalla + 1); };
  function empezarOtro() {                       // borrador nuevo: se olvida el anterior y el siguiente autoguardado estrena borradorId
    borradorActual = null; almacen.quitar(CLAVE_BORRADOR); $('nombre').value = ''; lookCargado = null;
    ponerPreset('grabador'); irA(0);
    historial.length = 0; $('deshacer').disabled = true; clearTimeout(temporizadorGuardado); temporizadorGuardado = 0;
  }
  $('atras').onclick = () => irA(pantalla - 1);
  $('deshacer').onclick = deshacer;
  $('sorprender').onclick = sorprender;

  // Pantalla A: puntos de partida como tarjetas con miniatura
  function miniatura(look, w = 72, h = 96, r = Math.min(2, devicePixelRatio || 1)) {
    const c = document.createElement('canvas'); c.width = w * r; c.height = h * r;
    const g = c.getContext('2d'); g.scale(r, r);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#2a2640'); grad.addColorStop(1, '#15131f'); g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const s = h * 0.9 / 372; drawHost(g, w / 2, h * 0.94 - 112 * s, s, poseFor('still'), lookOf({ look }), { T: 0 });
    return c;
  }
  function construirPresets() {
    const tarjetas = Object.entries(theme.characters).map(([id, c]) => {
      const b = document.createElement('button'); b.className = 'tarjeta' + (id === estado.base ? ' on' : ''); b.dataset.id = id; b.type = 'button';
      b.append(miniatura(lookOf(c)), Object.assign(document.createElement('b'), { textContent: c.name }), Object.assign(document.createElement('small'), { textContent: MUNDOS[MUNDO_DE[id]]?.[0] ?? '' }));
      b.onclick = () => { ponerPreset(id); marcarPreset(); }; return b;
    });
    const sor = document.createElement('button'); sor.className = 'tarjeta sorpresa'; sor.type = 'button'; sor.dataset.id = 'sorpresa';
    sor.innerHTML = '<span class="dado"><svg class="ic"><use href="#i-sorpresa"/></svg></span><b>Sorpréndeme</b><small>Una mezcla nueva</small>';
    sor.onclick = () => { sorprender(); marcarPreset(); };
    $('presets').replaceChildren(...tarjetas, sor);
  }
  function marcarPreset() { raiz.querySelectorAll('#presets .tarjeta').forEach(b => b.classList.toggle('on', b.dataset.id === estado.base)); }

  // Pantalla B: pestañas Cara / Pelo / Ropa / Objeto
  const PESTANAS = [['cara', 'Cara', 'i-cara'], ['pelo', 'Pelo', 'i-pelo'], ['ropa', 'Ropa', 'i-ropa'], ['objeto', 'Objeto', 'i-objeto']];
  function construirPestanas() {
    $('pestanas').replaceChildren(...PESTANAS.map(([id, nombre, icono]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'tab');
      b.innerHTML = `<svg class="ic"><use href="#${icono}"/></svg>${nombre}`; b.onclick = () => { pestana = id; construirAjustes(); }; return b;
    }));
  }
  function grupo(titulo, ...hijos) { const d = document.createElement('div'); d.className = 'grupo'; const h = document.createElement('h3'); h.textContent = titulo; d.append(h, ...hijos); return d; }
  function chips(campo, valores, tipo, nombres = NOMBRES) {
    const w = document.createElement('div'); w.className = 'chips'; w.setAttribute('role', 'group');
    for (const v of valores) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.campo = campo; b.dataset.v = String(v); b.textContent = nombres[v] ?? v;
      b.onclick = () => cambiar(tipo, () => { if (campo === 'item') estado.item = v === 'none' ? null : v; else estado.look[campo] = v; });
      w.append(b);
    }
    return w;
  }
  function chipSiNo(campo, textoSi, tipo) {
    const w = document.createElement('div'); w.className = 'chips';
    for (const [v, t] of [[false, 'Sin ' + textoSi], [true, 'Con ' + textoSi]]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.campo = campo; b.dataset.v = String(v); b.textContent = t;
      b.onclick = () => cambiar(tipo, () => { estado.look[campo] = campo === 'vest' ? (v ? (PALETAS.vest[0]) : null) : v; }); w.append(b);
    }
    return w;
  }
  function muestras(campo, tipo) {
    const w = document.createElement('div'); w.className = 'muestras'; w.setAttribute('role', 'group');
    for (const col of paleta(campo)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'muestra'; b.dataset.campo = campo; b.dataset.v = col; b.style.background = col; b.setAttribute('aria-label', 'Color ' + col);
      b.onclick = () => ponerColor(campo, col, tipo); w.append(b);
    }
    const mas = document.createElement('label'); mas.className = 'mas'; mas.title = 'Más colores'; mas.innerHTML = '<svg class="ic"><use href="#i-mas"/></svg>';
    const i = document.createElement('input'); i.type = 'color'; i.value = estado.look[campo] || '#888888'; i.setAttribute('aria-label', 'Más colores');
    let t; i.oninput = () => { clearTimeout(t); t = esperar(() => ponerColor(campo, i.value, tipo), 120); };
    mas.append(i); w.append(mas); return w;
  }
  function ponerColor(campo, col, tipo) {
    cambiar(tipo, () => { estado.look[campo] = col; if (campo === 'skin') estado.look.skinShade = sombra(col); if (campo === 'coat') estado.look.coatShade = sombra(col); });
  }
  function construirAjustes() {
    if (pantalla !== 1) return;
    raiz.querySelectorAll('#pestanas button').forEach(b => { b.classList.toggle('on', b.dataset.id === pestana); b.setAttribute('aria-selected', String(b.dataset.id === pestana)); });
    const L = estado.look, g = [];
    if (pestana === 'cara') g.push(grupo('Tono de piel', muestras('skin', 'face')), grupo('Gafas', chipSiNo('glasses', 'gafas', 'face')), grupo('Barba', chips('beard', CATALOGO.beard, 'face')));
    if (pestana === 'pelo') g.push(grupo('Peinado', chips('hairStyle', CATALOGO.hairStyle, 'hair')), grupo('Color de pelo', muestras('hair', 'hair')));
    if (pestana === 'ropa') {
      g.push(grupo('Prenda', chips('outfit', CATALOGO.outfit, 'outfit')), grupo('Color de la prenda', muestras('coat', 'color')), grupo('Manga', chips('sleeve', CATALOGO.sleeve, 'outfit')));
      if (['levita', 'safari', 'medieval', 'traje', 'bata'].includes(L.outfit)) g.push(grupo('Camisa', muestras('shirt', 'color')));
      g.push(grupo('Chaleco', chipSiNo('vest', 'chaleco', 'outfit'))); if (L.vest) g.push(grupo('Color del chaleco', muestras('vest', 'color')));
      g.push(grupo('Pantalón', muestras('trousers', 'color')), grupo('Calzado', muestras('shoes', 'color')), grupo('Detalle', muestras('accent', 'color')));
      g.push(grupo('Sombrero', chips('hat', CATALOGO.hat, 'hat'))); if (L.hat !== 'none') g.push(grupo('Color del sombrero', muestras('hatColor', 'hat')));
    }
    if (pestana === 'objeto') g.push(grupo('En la mano', chips('item', ['none', ...Object.keys(ITEMS)], 'item', { ...NOMBRES, none: 'Nada' })));
    $('ajustes').replaceChildren(...g); refrescarControles();
  }
  function refrescarControles() {               // marca el chip o la muestra activa sin reconstruir
    const L = estado.look;
    raiz.querySelectorAll('#ajustes .chip, #ajustes .muestra').forEach(b => {
      const c = b.dataset.campo, actual = c === 'item' ? (estado.item ?? 'none') : c === 'vest' ? !!L.vest : L[c];
      b.classList.toggle('on', String(actual) === b.dataset.v); b.setAttribute('aria-pressed', String(String(actual) === b.dataset.v));
    });
    raiz.querySelectorAll('#ajustes .mas input').forEach(i => { const c = i.closest('.muestras')?.querySelector('.muestra')?.dataset.campo; if (c && /^#[0-9a-f]{6}$/i.test(L[c] || '')) i.value = L[c]; });
    marcarPreset(); raiz.querySelectorAll('#escenas .tarjeta').forEach(b => b.classList.toggle('on', b.dataset.id === estado.world));
  }

  // Paso 2: tarjetas con TU personaje ya de pie en cada escenario. El fondo de cada mundo se pinta una sola vez y se guarda;
  // el personaje se repinta encima solo cuando cambia el look (escenasSucias), nunca en bucle.
  const MINI_W = 320, MINI_H = 200, fondosMini = {};
  let escenasSucias = true;
  function fondoMini(w) {
    if (fondosMini[w]) return fondosMini[w];
    const c = document.createElement('canvas'); c.width = MINI_W; c.height = MINI_H; paintWorld(c.getContext('2d'), MINI_W, MINI_H, w, {}, null, 1);
    return fondosMini[w] = c;
  }
  function construirEscenas() {
    if (!$('escenas').children.length) {
      $('escenas').replaceChildren(...WORLD_NAMES.map(w => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tarjeta'; b.dataset.id = w;
        const c = document.createElement('canvas'); c.width = MINI_W; c.height = MINI_H; c.setAttribute('aria-hidden', 'true');
        const [n, sub] = MUNDOS[w] ?? [w, ''];
        b.append(c, Object.assign(document.createElement('b'), { textContent: n }), Object.assign(document.createElement('small'), { textContent: sub }));
        b.setAttribute('aria-label', `${n}, ${sub}: tu personaje en este escenario`);
        b.onclick = () => cambiar('world', () => { estado.world = w; }); return b;
      }));
    }
    pintarEscenas(true); refrescarControles();
  }
  function pintarEscenas(forzar = false) {
    if (!escenasSucias || (pantalla !== 2 && !forzar) || !$('escenas').children.length) return;
    const L = lookOf({ look: estado.look }), P = poseFor('still'), s = MINI_H * 0.78 / 372, pies = MINI_H * (GROUND_Y + 0.4), cy = pies - 112 * s;
    for (const b of $('escenas').children) {
      const g = b.querySelector('canvas').getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fondoMini(b.dataset.id), 0, 0);
      g.fillStyle = 'rgba(8,7,16,.32)'; g.beginPath(); g.ellipse(MINI_W / 2, pies + 6 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2); g.fill();
      drawHost(g, MINI_W / 2, cy, s, P, L, { item: estado.item, T: 0 });
    }
    escenasSucias = false;
  }

  // Paso 3: reacciones y «Más»
  function construirReacciones() {
    const lista = [['talk', 'Habla'], ['think', 'Piensa'], ['celebrate', 'Acierta'], ['hurt', 'Falla'], ['dance', 'Baila']];
    $('reacciones').replaceChildren(...lista.map(([a, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t; b.onclick = () => animar(a, 1.6); return b; }));
  }
  // Pregunta de muestra: el personaje juega UNA pregunta de ejemplo (una opción correcta) con las mismas poses que usa el
  // feed (celebrate / hurt). No toca el motor: solo elige la pose según la opción. Opcional: solo si tocas «Probar».
  const PREGUNTA_MUESTRA = {
    texto: '¿Cuál de estos números es primo?',
    opciones: [['9', false], ['7', true], ['15', false]],
    bien: ['¡Correcto! Así celebro.', '¡Eso es!'], mal: ['Casi… era el 7.', 'Uy, no. Era el 7.'],
  };
  let preguntaJugada = false;
  function reiniciarPregunta() {
    const caja = $('muestraPregunta'); caja.classList.remove('jugando'); preguntaJugada = false;
    $('enunciado').hidden = true; $('veredicto').textContent = ''; $('veredicto').classList.remove('bien'); $('opciones').replaceChildren();
  }
  $('probar').onclick = () => {
    contar('probar');
    const caja = $('muestraPregunta'); caja.classList.add('jugando');
    $('enunciado').hidden = false; $('enunciado').textContent = PREGUNTA_MUESTRA.texto;
    $('opciones').replaceChildren(...PREGUNTA_MUESTRA.opciones.map(([t, ok], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span class="letra">${'ABC'[i]}</span>`; b.append(t);
      b.onclick = () => {
        if (preguntaJugada) return; preguntaJugada = true;
        for (const o of $('opciones').children) { o.disabled = true; o.classList.toggle('bien', PREGUNTA_MUESTRA.opciones[[...$('opciones').children].indexOf(o)][1]); }
        if (!ok) b.classList.add('mal');
        const v = $('veredicto'); v.textContent = ok ? 'Acertaste: así celebra tu personaje en un Tap.' : 'Era el 7: así reacciona tu personaje cuando alguien falla.'; v.classList.toggle('bien', ok);
        animar(ok ? 'celebrate' : 'hurt', 1.6); decir(pick(ok ? PREGUNTA_MUESTRA.bien : PREGUNTA_MUESTRA.mal));
        try { navigator.vibrate?.(ok ? 15 : [10, 40, 10]); } catch {}
        const otra = document.createElement('button'); otra.type = 'button'; otra.textContent = 'Jugar otra vez'; otra.onclick = () => { reiniciarPregunta(); $('probar').click(); };
        $('opciones').append(otra);
      };
      return b;
    }));
    if (!reducido) animar('think', 1.2); decir('A ver si sabes…');
  };
  // «¿Te gustó hacerlo?»: una vez por dispositivo, tras guardar, descartable. Solo viaja si/meh; nada más.
  function ofrecerGusto() {
    if (almacen.leer(CLAVE_GUSTO)) return;
    $('gusto').hidden = false;
  }
  function cerrarGusto(respuesta) {
    if (respuesta) contar('gusto/' + respuesta);
    almacen.escribir(CLAVE_GUSTO, respuesta || 'no');
    if (!respuesta) { $('gusto').hidden = true; return; }
    const p = $('gustoTexto'); p.textContent = respuesta === 'si' ? 'Gracias. A nosotros también nos gustó verte crearlo.' : 'Gracias por decirlo. Lo vamos a mejorar.'; p.classList.add('gracias');
    for (const id of ['gustoSi', 'gustoMeh', 'gustoNo']) $(id).hidden = true;
    esperar(() => { $('gusto').hidden = true; }, 3500);
  }
  $('gustoSi').onclick = () => cerrarGusto('si'); $('gustoMeh').onclick = () => cerrarGusto('meh'); $('gustoNo').onclick = () => cerrarGusto(null);

  function datosLook() { const l = { ...estado.look }; if (!l.vest) delete l.vest; return { base: estado.base, look: l, item: estado.item, world: estado.world }; }
  function refrescarJson() { const e = validarLook(estado.look); $('json').value = JSON.stringify(datosLook(), null, 2) + (e.length ? '\n// ' + e.join('; ') : ''); }
  $('copiar').onclick = async () => { contar('compartir/json'); try { await navigator.clipboard.writeText($('json').value); $('aviso').textContent = 'Copiado'; } catch { $('json').select(); $('aviso').textContent = 'Selecciona el texto y cópialo'; } esperar(() => { $('aviso').textContent = ''; }, 2500); };

  // ───────────────────────── guardado en el dispositivo (themes/epoca/guardado.js; nada viaja a ningún servidor) ─────────────────────────
  const almacen = crearAlmacen(storageNativo);
  let misLooks = parsearLooks(almacen.leer(CLAVE_LOOKS), validarLook);
  let borradorActual = parsearBorrador(almacen.leer(CLAVE_BORRADOR), validarLook);
  let lookCargado = null;                        // id del look de «Mis looks» que está en la vista (para marcarlo)
  let temporizadorGuardado = 0, temporizadorEstado = 0;
  const SIN_ALMACEN = 'En este navegador no se puede guardar (modo privado o almacenamiento bloqueado). Puedes seguir creando; para llevarte el personaje, copia sus datos desde «Más».';

  function programarAutoguardado() {             // borrador con ~1 s de espera; conserva el borradorId entre guardados
    if (!almacen.disponible || (!historial.length && pantalla === 0)) return;   // sin tocar nada no hay borrador que ofrecer
    clearTimeout(temporizadorGuardado); temporizadorGuardado = esperar(guardarBorradorAhora, 1000);
  }
  function guardarBorradorAhora() {
    clearTimeout(temporizadorGuardado);
    if (!almacen.disponible) return;
    // La miniatura (PNG de 72×96) va en el borrador para que /instituciones muestre «Tu personaje irá adjunto» sin pintar (PR-8).
    borradorActual = { ...armarBorrador(estado, pantalla, borradorActual), miniatura: pngMiniatura() };
    almacen.escribir(CLAVE_BORRADOR, serializarBorrador(borradorActual));
  }
  escuchar(document, 'visibilitychange', () => { if (document.hidden && temporizadorGuardado) guardarBorradorAhora(); });
  escuchar(window, 'pagehide', () => { if (temporizadorGuardado) guardarBorradorAhora(); });

  function estadoGuardado(texto, bien = false, ms = 4000) {
    const p = $('estadoGuardado'); p.textContent = texto; p.classList.toggle('bien', bien); clearTimeout(temporizadorEstado);
    if (ms) temporizadorEstado = esperar(() => { if (p.textContent === texto) { p.textContent = ''; p.classList.remove('bien'); } }, ms);
  }
  function nombreSugerido() { return SUGERIDO[estado.base] ?? 'Mi personaje'; }
  function prepararGuardar() {                   // al entrar al paso 3: nombre sugerido, contador y lista
    const i = $('nombre'); i.placeholder = nombreSugerido(); contarNombre();
    if (!almacen.disponible) { $('guardar').disabled = true; estadoGuardado(SIN_ALMACEN, false, 0); $('misLooks').hidden = true; }
    pintarMisLooks();
  }
  function contarNombre() { const n = Array.from($('nombre').value).length; $('restan').textContent = n ? `${n}/${MAX_NOMBRE}` : ''; }
  $('nombre').addEventListener('input', contarNombre);

  function pngMiniatura() { try { return miniatura(estado.look, 72, 96, 1).toDataURL('image/png'); } catch { return ''; } }
  function chispas() {                           // celebración breve: chispas ámbar desde la vista; nada con movimiento reducido
    if (reducido) return;
    const caja = $('vista'), r = caja.getBoundingClientRect();
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span'); s.className = 'chispa'; const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3, d = r.width * (0.25 + Math.random() * 0.3);
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d * 0.8 + 'px'); s.style.top = (r.height * 0.55) + 'px';
      s.style.animationDelay = (Math.random() * 120) + 'ms'; caja.append(s); s.addEventListener('animationend', () => s.remove());
    }
    esperar(() => caja.querySelectorAll('.chispa').forEach(s => s.remove()), 1500);
  }
  $('formGuardar').addEventListener('submit', ev => {
    ev.preventDefault();
    if (!almacen.disponible) { estadoGuardado(SIN_ALMACEN, false, 0); return; }
    const nombre = $('nombre').value.trim() || nombreSugerido();
    const r = guardarLook(misLooks, estado, { nombre, miniatura: pngMiniatura() });
    if (r.lleno) { estadoGuardado(`Ya tienes ${MAX_LOOKS} looks guardados, el máximo. Borra uno de «Mis looks» y vuelve a guardar.`, false, 8000); $('misLooks').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }); return; }
    if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(r.lista))) { estadoGuardado('No se pudo guardar: el almacenamiento de este navegador está lleno o bloqueado. Copia sus datos desde «Más».', false, 8000); return; }
    misLooks = r.lista; lookCargado = r.look.id; $('nombre').value = ''; contarNombre();
    estadoGuardado(`«${r.look.nombre}» está en Mis looks.`, true); reaccionar('guardar'); chispas(); pintarMisLooks();
    contar('listo'); ofrecerGusto();
    try { navigator.vibrate?.(15); } catch {}
  });
  function persistirLooks(lista, aviso) {
    if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(lista))) { estadoGuardado('No se pudo guardar el cambio en este navegador.', false, 6000); return false; }
    misLooks = lista; if (aviso) estadoGuardado(aviso, true); pintarMisLooks(); return true;
  }
  function cargarLook(l) {
    cambiar('cargar', () => { estado.base = l.base; estado.look = { ...l.look }; estado.item = l.item; estado.world = l.world; });
    lookCargado = l.id; fondoSucio = true; if (!reducido) entrada = 1; pintar(); construirAjustes(); refrescarJson(); prepararGuardar();
    $('paso').scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  }
  function icono(id) { return `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`; }
  function pintarMisLooks() {
    $('cuentaLooks').textContent = misLooks.length ? `${misLooks.length} de ${MAX_LOOKS}` : '';
    $('misLooksVacio').hidden = !!misLooks.length;
    $('listaLooks').replaceChildren(...misLooks.map(l => {
      const d = document.createElement('div'); d.className = 'look' + (l.id === lookCargado ? ' on' : ''); d.dataset.id = l.id;
      const cargar = document.createElement('button'); cargar.type = 'button'; cargar.className = 'cargar'; cargar.setAttribute('aria-label', `Cargar «${l.nombre}», guardado ${fechaCorta(l.fecha) || 'antes'}`);
      const img = document.createElement('img'); img.alt = ''; img.width = 72; img.height = 96; if (l.miniatura) img.src = l.miniatura;
      cargar.append(img, Object.assign(document.createElement('b'), { textContent: l.nombre }), Object.assign(document.createElement('small'), { textContent: fechaCorta(l.fecha) }));
      cargar.onclick = () => cargarLook(l);
      const puntos = document.createElement('button'); puntos.type = 'button'; puntos.className = 'puntos'; puntos.innerHTML = icono('i-puntos'); puntos.setAttribute('aria-label', `Opciones de «${l.nombre}»`); puntos.setAttribute('aria-expanded', 'false');
      puntos.onclick = () => { const ab = d.classList.toggle('abierto'); puntos.setAttribute('aria-expanded', String(ab)); d.classList.remove('renombrando'); };
      const ren = document.createElement('div'); ren.className = 'renombrar';
      const input = document.createElement('input'); input.maxLength = MAX_NOMBRE; input.value = l.nombre; input.setAttribute('aria-label', 'Nuevo nombre'); input.enterKeyHint = 'done';
      const confirmarNombre = () => { if (!d.classList.contains('renombrando')) return; d.classList.remove('renombrando', 'abierto'); const nuevo = input.value.trim(); if (nuevo && nuevo !== l.nombre) persistirLooks(renombrarLook(misLooks, l.id, nuevo), 'Nombre cambiado.'); else pintarMisLooks(); };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmarNombre(); } if (e.key === 'Escape') { d.classList.remove('renombrando'); pintarMisLooks(); } });
      input.addEventListener('blur', confirmarNombre); ren.append(input);
      const acc = document.createElement('div'); acc.className = 'acciones';
      const bRen = document.createElement('button'); bRen.type = 'button'; bRen.innerHTML = icono('i-lapiz') + 'Renombrar'; bRen.onclick = () => { d.classList.add('renombrando'); input.focus(); input.select(); };
      const bDup = document.createElement('button'); bDup.type = 'button'; bDup.innerHTML = icono('i-copiar') + 'Duplicar';
      bDup.onclick = () => { const r = duplicarLook(misLooks, l.id); if (r.lleno) { estadoGuardado(`Ya tienes ${MAX_LOOKS} looks, el máximo. Borra uno para duplicar.`, false, 8000); return; } persistirLooks(r.lista, `«${r.look.nombre}» está en Mis looks.`); };
      const bBor = document.createElement('button'); bBor.type = 'button'; bBor.className = 'peligro'; bBor.innerHTML = icono('i-papelera') + 'Borrar'; let seguro = 0;
      bBor.onclick = () => {
        if (!seguro) { seguro = esperar(() => { seguro = 0; bBor.innerHTML = icono('i-papelera') + 'Borrar'; }, 3000); bBor.innerHTML = icono('i-papelera') + '¿Seguro?'; bBor.setAttribute('aria-label', 'Toca otra vez para borrar'); return; }
        clearTimeout(seguro); if (lookCargado === l.id) lookCargado = null; persistirLooks(borrarLook(misLooks, l.id), `«${l.nombre}» se borró.`);
      };
      acc.append(bRen, bDup, bBor); d.append(cargar, puntos, ren, acc); return d;
    }));
  }

  // ───────────────────────── compartir (themes/epoca/compartir.js): enlace en el hash, exportar e importar JSON; nada sale a ningún servidor ─────────────────────────
  const OPCIONES_LOOK = { items: Object.keys(ITEMS), mundos: [...WORLD_NAMES] };
  let temporizadorCompartir = 0;
  function estadoCompartir(texto, bien = false, ms = 4000) {
    const p = $('estadoCompartir'); p.textContent = texto; p.classList.toggle('bien', bien); clearTimeout(temporizadorCompartir);
    if (ms) temporizadorCompartir = esperar(() => { if (p.textContent === texto) { p.textContent = ''; p.classList.remove('bien'); } }, ms);
  }
  function enlaceActual() { return enlaceDeLook(location.href, estado, $('nombre').value.trim()); }
  function mostrarEnlace(url) { $('compartir').classList.add('mostrarEnlace'); const i = $('enlaceTexto'); i.value = url; i.focus(); i.select(); }
  $('enlaceSeleccionar').onclick = () => { const i = $('enlaceTexto'); i.focus(); i.select(); try { i.setSelectionRange(0, i.value.length); } catch {} };
  async function copiarTexto(texto) { try { await navigator.clipboard.writeText(texto); return true; } catch { return false; } }
  $('copiarEnlace').onclick = async () => {
    const url = enlaceActual(), nombre = $('nombre').value.trim() || nombreSugerido();
    if (navigator.share) {
      try { await navigator.share({ title: `Mira a ${nombre}`, text: 'Te mando mi personaje. Ábrelo y cámbialo a tu gusto.', url }); estadoCompartir('Enlace compartido.', true); contar('compartir/enlace'); return; }
      catch (e) { if (e?.name === 'AbortError') return; }     // cerró la hoja del sistema: no es un error
    }
    if (await copiarTexto(url)) { estadoCompartir('Enlace copiado. Pégalo donde quieras.', true); reaccionar('guardar'); contar('compartir/enlace'); return; }
    contar('compartir/enlace');
    mostrarEnlace(url); estadoCompartir('No se pudo copiar solo. Selecciona el enlace y cópialo.', false, 8000);
  };
  $('exportar').onclick = () => {
    contar('compartir/json');
    const nombre = $('nombre').value.trim() || nombreSugerido(), archivo = 'personaje-' + nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json';
    try {
      const blob = new Blob([exportarJson(estado, $('nombre').value.trim())], { type: 'application/json' }), url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = archivo; document.body.append(a); a.click(); a.remove(); esperar(() => URL.revokeObjectURL(url), 2000);
      aviso(`Archivo «${archivo}» listo.`);
    } catch { aviso('No se pudo crear el archivo. Copia el JSON de abajo.'); }
  };
  function aviso(texto, ms = 4000) { const a = $('aviso'); a.textContent = texto; clearTimeout(aviso.t); aviso.t = esperar(() => { if (a.textContent === texto) a.textContent = ''; }, ms); }
  function importarTexto(texto) {
    const r = importarJson(texto, validarLook, OPCIONES_LOOK);
    if (!r.ok) { contar('error/look-invalido'); aviso(r.motivo, 7000); return; }
    cambiar('cargar', () => Object.assign(estado, r.estado)); lookCargado = null; fondoSucio = true; if (!reducido) entrada = 1; pintar(); construirAjustes(); refrescarJson(); prepararGuardar();
    if (r.nombre) { $('nombre').value = r.nombre; contarNombre(); }
    $('pegarImportar').value = ''; aviso('Personaje importado. Ya está en la vista; puedes ajustarlo o guardarlo.');
    $('paso').scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  }
  $('importarPegado').onclick = () => importarTexto($('pegarImportar').value);
  $('archivoImportar').addEventListener('change', async ev => {
    const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return;
    if (f.size > 64 * 1024) { aviso('Ese archivo es demasiado grande para ser un personaje.', 7000); return; }
    try { importarTexto(await f.text()); } catch { aviso('No se pudo leer el archivo.', 7000); }
  });

  // Al abrir con `#look=`: «Look de un amigo» con «Probarlo y ajustarlo», «Guardarlo en Mis looks» y «Seguir con el mío».
  // El hash se limpia después para que recargar no vuelva a preguntar. Si es inválido: una línea amable y el diseñador normal.
  function ofrecerRecibido() {
    const r = lookDesdeHash(location.hash, validarLook, OPCIONES_LOOK);
    if (!r) return false;
    // La web (router) limpia el hash a su manera (opciones.limpiarHash); la página suelta usa history directamente.
    try { if (opciones.limpiarHash) opciones.limpiarHash(); else history.replaceState(null, '', location.pathname + location.search); } catch {}
    if (!r.ok) { contar('error/look-invalido'); irA(0); estadoRecibidoInvalido(r.motivo); return false; }
    const quien = r.nombre || 'un personaje';
    try { $('recibidoMini').src = miniatura(r.estado.look, 84, 112, 2).toDataURL('image/png'); } catch {}
    $('recibidoTexto').textContent = `Alguien te mandó ${r.nombre ? 'a ' + r.nombre : 'su personaje'}.` + (borradorActual ? ' Tienes uno a medias en este dispositivo: si pruebas este, el tuyo se reemplaza; si solo lo guardas, el tuyo sigue igual.' : ' Puedes cambiarlo a tu gusto o guardarlo tal cual.');
    $('recibidoGuardar').hidden = !almacen.disponible;
    $('recibidoNo').textContent = borradorActual ? 'Seguir con el mío' : 'Ahora no';
    $('recibido').hidden = false; $('recibidoProbar').focus();
    const cerrar = () => { $('recibido').hidden = true; $('recibidoEstado').textContent = ''; };
    $('recibidoProbar').onclick = () => {
      cerrar(); borradorActual = null; historial.length = 0; $('deshacer').disabled = true;
      Object.assign(estado, { base: r.estado.base, look: { ...r.estado.look }, item: r.estado.item, world: r.estado.world });
      if (r.nombre) { $('nombre').value = r.nombre; contarNombre(); }
      fondoSucio = true; escenasSucias = true; marcarPreset(); irA(1); pintar(); decir(r.nombre ? `¡Hola! Soy ${r.nombre}.` : FRASES.cargar[0]); if (!reducido) animar('celebrate', 1.2);
      programarAutoguardado();
    };
    $('recibidoGuardar').onclick = () => {
      const g = guardarLook(misLooks, r.estado, { nombre: r.nombre || quien, miniatura: (() => { try { return miniatura(r.estado.look, 72, 96, 1).toDataURL('image/png'); } catch { return ''; } })() });
      if (g.lleno) { $('recibidoEstado').textContent = `Ya tienes ${MAX_LOOKS} looks guardados, el máximo. Pruébalo y borra uno de «Mis looks» para guardarlo.`; return; }
      if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(g.lista))) { $('recibidoEstado').textContent = 'No se pudo guardar en este navegador. Pruébalo y cópialo desde «Más».'; return; }
      misLooks = g.lista; cerrar(); estadoGuardado(`«${g.look.nombre}» está en Mis looks.`, true, 6000); pintarMisLooks();
      if (!ofrecerContinuar()) { irA(3); if (!reducido) animar('celebrate', 1.2); }
    };
    $('recibidoNo').onclick = () => { cerrar(); if (!ofrecerContinuar()) { if (!reducido) animar('celebrate', 1.2); decir(FRASES.preset(theme.characters.grabador.name)); } };
    return true;
  }
  function estadoRecibidoInvalido(motivo) {
    $('titulo').textContent = 'Ese enlace no se pudo abrir';
    decir('Haz el tuyo, mejor.');
    const p = document.createElement('p'); p.className = 'texto'; p.id = 'avisoEnlace'; p.setAttribute('role', 'status');
    p.textContent = `${motivo} Pídele a quien te lo mandó que lo copie otra vez, o haz tu propio personaje aquí.`;
    $('presets').before(p);
    esperar(() => { if (pantalla === 0) $('titulo').textContent = TITULOS[0]; }, 6000);
  }

  // Al abrir con borrador: «Seguir donde ibas» con miniatura, o «Empezar otro»
  function ofrecerContinuar() {
    if (!borradorActual) return false;
    const b = borradorActual, nombre = SUGERIDO[b.base] ?? 'tu personaje';
    try { $('continuarMini').src = miniatura(b.look, 84, 112, 2).toDataURL('image/png'); } catch {}
    $('continuarTexto').textContent = `Dejaste a ${nombre} a medias ${fechaCorta(b.fecha) || 'hace poco'}. Sigue en el paso donde ibas o empieza uno nuevo.`;
    $('continuar').hidden = false; $('continuarSi').focus();
    $('continuarSi').onclick = () => {
      $('continuar').hidden = true;
      Object.assign(estado, { base: b.base, look: { ...b.look }, item: b.item, world: b.world });
      fondoSucio = true; escenasSucias = true; marcarPreset(); irA(b.paso); pintar(); decir(FRASES.cargar[0]); if (!reducido) animar('celebrate', 1.2);
    };
    $('continuarNo').onclick = () => { $('continuar').hidden = true; borradorActual = null; almacen.quitar(CLAVE_BORRADOR); programarAutoguardado(); };
    return true;
  }

  // ───────────────────────── vista previa: reacciones, bocadillo, comparar ─────────────────────────
  let anim = 'idle', animT = 0, animFin = 0, entrada = 0, temporizadorQuieto = 0;
  function animar(nombre, dur) {
    if (reducido) { anim = QUIETA[nombre] ?? 'still'; pintar(); clearTimeout(temporizadorQuieto); temporizadorQuieto = esperar(() => { anim = 'still'; pintar(); }, dur * 1000); return; }
    anim = nombre; animT = 0; animFin = dur;
  }
  function reaccionar(tipo) { const [a, d] = REACCION[tipo] ?? ['talk', 0.8]; animar(a, d); if (tipo !== 'preset') decir(pick(FRASES[tipo] ?? FRASES.color)); }
  let temporizadorBocadillo = 0;
  function decir(texto) {
    const b = $('bocadillo'); b.textContent = texto; b.classList.add('ver'); clearTimeout(temporizadorBocadillo);
    temporizadorBocadillo = esperar(() => b.classList.remove('ver'), 1500);
  }
  // mantener presionado la vista para ver cómo estaba antes del último cambio
  let comparando = false, temporizadorComparar = 0;
  const vista = $('vista');
  vista.addEventListener('pointerdown', e => { if (!historial.length) return; e.preventDefault(); clearTimeout(temporizadorComparar); temporizadorComparar = esperar(() => { comparando = true; vista.classList.add('comparando'); fondoSucio = true; pintar(); }, 220); });
  const soltar = () => { clearTimeout(temporizadorComparar); if (comparando) { comparando = false; vista.classList.remove('comparando'); fondoSucio = true; pintar(); } };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) vista.addEventListener(ev, soltar);
  vista.addEventListener('contextmenu', e => e.preventDefault());

  // ───────────────────────── pintura: solo al cambiar o animar; pausa con la pestaña oculta ─────────────────────────
  const lienzo = $('lienzo'), ctx = lienzo.getContext('2d');
  let w = 0, h = 0, dpr = 1, fondo = null, fondoSucio = true, pose = null, T = 0, ultimo = 0, parpadeo = 2.5, parpadeoT = 0, corriendo = false;
  function medir() {
    const r = vista.getBoundingClientRect(); const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height)), nd = Math.min(2, devicePixelRatio || 1);
    if (nw === w && nh === h && nd === dpr) return false;
    w = nw; h = nh; dpr = nd; lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr); fondoSucio = true; return true;
  }
  function bg(world) {
    if (fondo && !fondoSucio && fondo.world === world) return fondo.c;
    const c = document.createElement('canvas'); c.width = lienzo.width; c.height = lienzo.height; const g = c.getContext('2d'); g.scale(dpr, dpr);
    paintWorld(g, w, h, world, {}, null, 1); fondo = { world, c }; fondoSucio = false; return c;
  }
  function cuadro(ahora) {
    if (!corriendo) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000) || 0; ultimo = ahora;
    T += dt; animT += dt;
    if (anim !== 'idle' && animT >= animFin) { anim = 'idle'; animT = 0; }
    if (entrada > 0) entrada = Math.max(0, entrada - dt * 2.4);
    parpadeo -= dt; if (parpadeo <= 0) { parpadeoT = 0.12; parpadeo = 2.4 + Math.random() * 2.4; } if (parpadeoT > 0) parpadeoT -= dt;
    pose = blendPose(pose, poseFor(anim, animT, T), 1 - Math.exp(-dt * 16));
    vigilarFps(ahora, dt);
    dibujar();
    requestAnimationFrame(cuadro);
  }
  // `fps-bajo`: menos de 30 fps durante 2 s seguidos mientras hay una animación (no en idle, no al volver de una pestaña oculta).
  let lentoDesde = 0;
  function vigilarFps(ahora, dt) {
    if (anim === 'idle' || dt <= 0 || dt >= 0.05) { lentoDesde = 0; return; }     // dt tope = 0.05 → un salto (pestaña oculta), no un tirón
    if (dt <= 1 / 30) { lentoDesde = 0; return; }
    if (!lentoDesde) lentoDesde = ahora;
    else if (ahora - lentoDesde >= 2000) { lentoDesde = 0; contar('fps-bajo'); }
  }
  function dibujar() {
    medir();
    const E = comparando && historial.length ? historial[historial.length - 1] : estado;
    if (reducido || !pose) pose = blendPose(null, poseFor(anim, 0, 0), 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(bg(E.world), 0, 0, w, h);
    if (!reducido) paintAmbient(ctx, w, h, E.world, T);
    const s = Math.min(w / 540 * 1.15, h * 0.8 / 372), pies = h * 0.9, cy = pies - 112 * s, a = 1 - entrada;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,7,16,.32)'; ctx.beginPath(); ctx.ellipse(w / 2, pies + 6 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    drawHost(ctx, w / 2, cy + entrada * 40 * s, s, pose, lookOf({ look: E.look }), { item: E.item, blink: parpadeoT > 0, T });
    ctx.restore();
  }
  function pintar() { if (reducido || !corriendo) dibujar(); }   // con animación, el bucle ya repinta en el próximo cuadro
  function arrancar() { if (reducido || corriendo || document.hidden) return; corriendo = true; ultimo = performance.now(); requestAnimationFrame(cuadro); }
  function parar() { corriendo = false; }
  escuchar(document, 'visibilitychange', () => { if (document.hidden) parar(); else { arrancar(); pintar(); } });
  const observador = new ResizeObserver(() => { if (medir()) pintar(); }); observador.observe(vista);

  // ───────────────────────── arranque ─────────────────────────
  construirPresets(); construirPestanas(); construirReacciones(); irA(0);
  medir(); arrancar(); pintar();
  const conEnlace = ofrecerRecibido(), conBorrador = !conEnlace && ofrecerContinuar();
  if (!conEnlace && !conBorrador) { if (!reducido) animar('celebrate', 1.2); decir(FRASES.preset(theme.characters.grabador.name)); }
  contar('abrir/' + (conEnlace ? 'enlace' : conBorrador ? 'continuar' : 'directo'));
  // Al irse: en qué paso estaba y cuántos segundos llevaba (redondeados a 10). Si ya guardó, no es abandono.
  function abandonar() { if (abandonado) return; abandonado = true; if (!medidor.registro.includes('listo')) contar(nombreAbandono(pantalla, performance.now() - abierto)); bombear(); }
  let abandonado = false;
  escuchar(window, 'pagehide', abandonar);

  return {
    ok: true,
    /** Secuencia de eventos aceptados (nombres cortos), para depurar y probar. */
    registro: medidor.registro,
    /** Deja la página como estaba: quita oyentes, para el bucle de pintura, guarda el borrador y cuenta el abandono si no guardó. */
    destruir() {
      if (temporizadorGuardado) guardarBorradorAhora();
      abandonar(); parar(); observador.disconnect();
      for (const [t, ev, fn] of oyentes) t.removeEventListener(ev, fn);
      oyentes.length = 0;
      for (const t of temporizadores) clearTimeout(t);
      temporizadores.clear();
      try { if (window.tapsMedicion?.registro === medidor.registro) delete window.tapsMedicion; } catch { /* window congelado: da igual */ }
      raiz.replaceChildren();
    },
  };
}
