// Diseñador de personajes de Taps (tema «época»): la lógica del prototipo disenador.html, extraída tal cual (PR-6 del plan,
// producto/taps/disenador-plan-ux.md §5) para que la usen dos páginas con el MISMO comportamiento y las MISMAS claves de
// localStorage (taps.disenador.*):
// - disenador.html (página estática noindex): `montarDisenador(raiz)`; mide por su cuenta con count.js (GoatCounter).
// - La ruta /crear de la web (TapDisenador, Angular): `montarDisenador(raiz, { enviar, alEvento, pasoPublicar })`; la web
//   manda los eventos por AnalyticsService (respeta ?interno=1 y no carga count.js dos veces) y añade su propia capa.
// Nada de aquí corre en el servidor: el módulo se importa solo en el navegador. Todo lo que se añade al documento o a window
// se quita con `destruir()`.
import { CATALOGO, POSES, anchorOf, armPoints, blendPose, drawHost, lookOf, poseFor, validarLook, ITEMS } from './themes/epoca/rig.js';
import { WORLD_NAMES, HORAS, HORA_DEFECTO, GROUND_Y, paintWorld, paintAmbient } from './themes/epoca/scenery.js';
import { PALETAS, NOMBRES, MUNDOS, HORAS_NOMBRE, nombreColor, sombra, sorprenderTodo, sorprenderPestana, sorprenderEscenario, sugerencias } from './themes/epoca/sugerencias.js';
import { CLAVE_BORRADOR, CLAVE_LOOKS, MAX_LEMA, MAX_LOOKS, MAX_NOMBRE, armarBorrador, borrarLook, crearAlmacen, duplicarLook, fechaCorta, guardarLook, parsearBorrador, parsearLooks, renombrarLook, serializarBorrador, serializarLooks } from './themes/epoca/guardado.js';
import { enlaceDeLook, exportarJson, importarJson, lookDesdeHash } from './themes/epoca/compartir.js';
import { PREFIJO, crearMedidor, esAutomatico, esInterno, nombreAbandono, nombreValido, paraGoatCounter } from './themes/epoca/medicion.js';
import { COPY_HITOS, ENTENDIDO, PUBLICAR, QUE_ES, conNombre, crearHitos, esEstudiante } from './themes/epoca/hitos.js';
import { CAMARA_MS, QUIETA_REACCION, REACCIONES, encuadreDe, focoDe, mezclarCamara, reaccionDe } from './themes/epoca/reacciones.js';
import { crearParticulas } from './themes/epoca/particulas.js';
import { crearFrases } from './themes/epoca/frases.js';
// La versión (?v=) va en los imports del audio: si cambia efectos.js, una caché vieja no mezcla versiones (como en sonido.js).
import { crearSonido } from './audio/sonido.js?v=3';
import { luminancia } from './audio/efectos.js?v=3';

export const PREFIJO_MEDICION = PREFIJO;
export const CLAVE_GUSTO = 'taps.disenador.gusto';
/** Sonido del creador en disenador.html: 'off' = apagado (en /crear manda el silencio general del feed, `opciones.sonido`). */
export const CLAVE_SONIDO = 'taps.disenador.sonido';
/** Paleta de audio/efectos.js del creador (campanas con madera): suena al tema, no al feed. */
export const PALETA_SONIDO = 'epoca';
/** Ganancias (sobre el 60 % general): −14 dB para lo que se toca decenas de veces y −12 dB para los errores. */
export const GANANCIA_BAJA = 0.2, GANANCIA_ERROR = 0.25;
/** Tope de un `color` cada tantos ms al arrastrar el selector libre. */
export const CADA_COLOR_MS = 80;
/** Cuántas veces se enseña «Mantén presionado para comparar» por navegador (PR-D3, §4) y dónde se cuenta. */
export const CLAVE_PISTA = 'taps.disenador.pista-comparar';
export const VECES_PISTA = 2;
/** Títulos por paso (§2) y textos del botón de avanzar. */
export const TITULOS_PASO = Object.freeze(['Elige quién eres', 'Hazlo tuyo', 'Dónde vive', 'Lo hiciste']);
export const BOTON_SIGUIENTE = Object.freeze(['Siguiente', 'Ponlo en su mundo', 'Terminar', 'Empezar otro']);
/** Hoja de estilos del diseñador (todo bajo .dsn), junto a este módulo. */
export const URL_ESTILOS = new URL('./disenador.css', import.meta.url).href;

/** Marcado del diseñador (un solo origen para las dos páginas). Se vuelca en la raíz al montar. */
export const PLANTILLA = "<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\">\n  <symbol id=\"i-cara\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10.5h.01M15.5 10.5h.01M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2\"/></symbol>\n  <symbol id=\"i-pelo\" viewBox=\"0 0 24 24\"><path d=\"M5 14c0-5 3-9 7-9s7 4 7 9M5 14c1.5-1 2.5-3 3-5M19 14c-1.5-1-2.5-3-3-5M9 12c-.5 1.5-1.5 2.5-3 3M15 12c.5 1.5 1.5 2.5 3 3\"/><path d=\"M8 19c1 .8 2.5 1.2 4 1.2s3-.4 4-1.2\"/></symbol>\n  <symbol id=\"i-ropa\" viewBox=\"0 0 24 24\"><path d=\"M8 4l4 2 4-2 4 4-3 2v10H7V10L4 8z\"/><path d=\"M8 4c.5 2 2 3 4 3s3.5-1 4-3\"/></symbol>\n  <symbol id=\"i-objeto\" viewBox=\"0 0 24 24\"><path d=\"M7 11V7a2 2 0 0 1 4 0v4M11 10V5a2 2 0 0 1 4 0v6M15 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 14a2 2 0 0 1 3-2.4\"/></symbol>\n  <symbol id=\"i-deshacer\" viewBox=\"0 0 24 24\"><path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10a6 6 0 0 1 0 12h-3\"/></symbol>\n  <symbol id=\"i-sorpresa\" viewBox=\"0 0 24 24\"><path d=\"M4 6h3l10 12h3M20 6h-3l-2.5 3M4 18h3l2.5-3\"/><path d=\"M17 4l3 2-3 2M17 16l3 2-3 2\"/></symbol>\n  <symbol id=\"i-mas\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></symbol>\n  <symbol id=\"i-puntos\" viewBox=\"0 0 24 24\"><circle cx=\"6\" cy=\"12\" r=\"1.3\"/><circle cx=\"12\" cy=\"12\" r=\"1.3\"/><circle cx=\"18\" cy=\"12\" r=\"1.3\"/></symbol>\n  <symbol id=\"i-atras\" viewBox=\"0 0 24 24\"><path d=\"M15 5l-7 7 7 7\"/></symbol>\n  <symbol id=\"i-sig\" viewBox=\"0 0 24 24\"><path d=\"M9 5l7 7-7 7\"/></symbol>\n  <symbol id=\"i-listo\" viewBox=\"0 0 24 24\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></symbol>\n  <symbol id=\"i-dedo\" viewBox=\"0 0 24 24\"><path d=\"M10 11V5a1.5 1.5 0 0 1 3 0v6M13 10a1.5 1.5 0 0 1 3 0v2M16 12a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.4-1.8L10 15\"/></symbol>\n  <symbol id=\"i-copiar\" viewBox=\"0 0 24 24\"><rect x=\"9\" y=\"9\" width=\"11\" height=\"11\" rx=\"2\"/><path d=\"M5 15V6a2 2 0 0 1 2-2h9\"/></symbol>\n  <symbol id=\"i-idea\" viewBox=\"0 0 24 24\"><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 1 3.6 10.8c-.5.4-.6 1-.6 1.6V16H9v-.6c0-.6-.1-1.2-.6-1.6A6 6 0 0 1 12 3z\"/></symbol>\n  <symbol id=\"i-guardar\" viewBox=\"0 0 24 24\"><path d=\"M5 4h11l3 3v13H5z\"/><path d=\"M8 4v5h7V4M8 20v-6h8v6\"/></symbol>\n  <symbol id=\"i-lapiz\" viewBox=\"0 0 24 24\"><path d=\"M4 20l4-1L19 8l-3-3L5 16z\"/><path d=\"M14 7l3 3\"/></symbol>\n  <symbol id=\"i-papelera\" viewBox=\"0 0 24 24\"><path d=\"M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13\"/><path d=\"M10 11v6M14 11v6\"/></symbol>\n  <symbol id=\"i-reloj\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></symbol>\n  <symbol id=\"i-enlace\" viewBox=\"0 0 24 24\"><path d=\"M10 14a4 4 0 0 0 5.6.4l3-3a4 4 0 0 0-5.6-5.6l-1.5 1.5\"/><path d=\"M14 10a4 4 0 0 0-5.6-.4l-3 3a4 4 0 0 0 5.6 5.6l1.5-1.5\"/></symbol>\n  <symbol id=\"i-bajar\" viewBox=\"0 0 24 24\"><path d=\"M12 4v11M7 10l5 5 5-5\"/><path d=\"M5 20h14\"/></symbol>\n  <symbol id=\"i-subir\" viewBox=\"0 0 24 24\"><path d=\"M12 15V4M7 9l5-5 5 5\"/><path d=\"M5 20h14\"/></symbol>\n  <symbol id=\"i-jugar\" viewBox=\"0 0 24 24\"><path d=\"M8 5v14l11-7z\"/></symbol>\n  <symbol id=\"i-sonrisa\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10h.01M15.5 10h.01\"/><path d=\"M8 14c1 1.8 2.4 2.7 4 2.7s3-.9 4-2.7\"/></symbol>\n  <symbol id=\"i-neutro\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 10h.01M15.5 10h.01\"/><path d=\"M8.5 15.5h7\"/></symbol>\n  <symbol id=\"i-cerrar\" viewBox=\"0 0 24 24\"><path d=\"M6 6l12 12M18 6L6 18\"/></symbol>\n  <symbol id=\"i-regalo\" viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"9\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M4 13h16M12 9v11\"/><path d=\"M12 9c-1.5-3-4-4-5.5-2.5S9 9 12 9zm0 0c1.5-3 4-4 5.5-2.5S15 9 12 9z\"/></symbol>\n  <symbol id=\"i-altavoz\" viewBox=\"0 0 24 24\"><path d=\"M4 10v4h3l4 3.5v-11L7 10z\"/><path d=\"M15 9.5a3.6 3.6 0 0 1 0 5M17.8 7a7.2 7.2 0 0 1 0 10\"/></symbol>\n  <symbol id=\"i-altavoz-off\" viewBox=\"0 0 24 24\"><path d=\"M4 10v4h3l4 3.5v-11L7 10z\"/><path d=\"M15.5 10l4.5 4.5M20 10l-4.5 4.5\"/></symbol>\n  <symbol id=\"i-dispositivos\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"5\" width=\"13\" height=\"10\" rx=\"1.5\"/><path d=\"M7 19h5M9.5 15v4\"/><rect x=\"17\" y=\"9\" width=\"4\" height=\"10\" rx=\"1\"/><path d=\"M19 16.5h.01\"/></symbol>\n  <symbol id=\"i-cuenta\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"9\" r=\"3.5\"/><path d=\"M5 20a7 7 0 0 1 14 0\"/></symbol>\n  <symbol id=\"i-sol\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4\"/></symbol>\n  <symbol id=\"i-atardecer\" viewBox=\"0 0 24 24\"><path d=\"M7 16a5 5 0 0 1 10 0\"/><path d=\"M3 16h18M12 5v3M5.6 8.6l1.4 1.4M18.4 8.6L17 10M6 20h12\"/></symbol>\n  <symbol id=\"i-luna\" viewBox=\"0 0 24 24\"><path d=\"M15.5 4a8 8 0 1 0 4.5 14.5A9 9 0 0 1 15.5 4z\"/><path d=\"M6 5h.01M4 10h.01\"/></symbol>\n</svg>\n\n<header>\n  <h1 id=\"h1\">Elige quién eres</h1>\n  <ol class=\"progreso\" id=\"progreso\" aria-label=\"Pasos\">\n    <li class=\"ahora\" title=\"Personaje\"><i aria-hidden=\"true\">1</i><span>Personaje</span></li>\n    <li title=\"Escenario\"><i aria-hidden=\"true\">2</i><span>Escenario</span></li>\n    <li title=\"Listo\"><i aria-hidden=\"true\">3</i><span>Listo</span></li>\n  </ol>\n</header>\n\n<section class=\"vista\" id=\"vista\" aria-label=\"Vista previa de tu personaje\">\n  <canvas id=\"lienzo\" role=\"img\" aria-label=\"Tu personaje\"></canvas>\n  <div class=\"bocadillo\" id=\"bocadillo\" aria-live=\"polite\"></div>\n  <div class=\"etiqueta\">Así estaba antes</div>\n  <div class=\"ranura\" id=\"ranuraVista\"></div>\n  <div class=\"pista\" id=\"pista\" hidden><svg class=\"ic\"><use href=\"#i-dedo\"/></svg>Mantén presionado para comparar</div>\n  <div class=\"inversion\" id=\"inversion\" role=\"img\" aria-label=\"Tu personaje: nada cambiado todavía\" title=\"Tu personaje\"><i data-tramo=\"cara\"></i><i data-tramo=\"ropa\"></i><i data-tramo=\"escenario\"></i></div>\n</section>\n\n<div class=\"sugerencia\" id=\"sugerencia\" hidden>\n  <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-idea\"/></svg>\n  <span id=\"sugerenciaTexto\"></span>\n  <button type=\"button\" id=\"sugerenciaAplicar\">Aplicar</button>\n</div>\n\n<div class=\"barra\">\n  <h2 id=\"titulo\">Elige un punto de partida</h2>\n  <button id=\"deshacer\" disabled aria-label=\"Deshacer el último cambio\"><svg class=\"ic\"><use href=\"#i-deshacer\"/></svg>Deshacer</button>\n  <button id=\"sorprender\" aria-label=\"Sorpréndeme con una combinación\"><svg class=\"ic\"><use href=\"#i-sorpresa\"/></svg>Sorpréndeme</button>\n  <button type=\"button\" id=\"sonido\" class=\"altavoz\" aria-pressed=\"true\" aria-label=\"Sonido activado. Silenciar (tecla M)\" title=\"Silenciar (M)\"><svg class=\"ic on\" aria-hidden=\"true\"><use href=\"#i-altavoz\"/></svg><svg class=\"ic off\" aria-hidden=\"true\"><use href=\"#i-altavoz-off\"/></svg></button>\n</div>\n\n<main class=\"paso\" id=\"paso\">\n  <section class=\"pantalla activa\" data-p=\"0\">\n    <p class=\"texto\">Todos empiezan con un personaje completo. Elige uno y ajústalo a tu gusto; nada es obligatorio.</p>\n    <div class=\"tarjetas\" id=\"presets\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"1\">\n    <div class=\"pestanas\" id=\"pestanas\" role=\"tablist\" aria-label=\"Qué ajustar\"></div>\n    <div id=\"ajustes\" role=\"tabpanel\" tabindex=\"-1\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"2\">\n    <p class=\"texto\">Así se ve tu personaje en cada lugar. Elige uno y la hora del día; puedes cambiarlos después.</p>\n    <div class=\"horas\" id=\"horas\" role=\"group\" aria-label=\"Hora del día\"></div>\n    <div class=\"tarjetas escenas\" id=\"escenas\"></div>\n  </section>\n\n  <section class=\"pantalla\" data-p=\"3\">\n    <p class=\"texto\" id=\"despedida\">Tu personaje está listo. Toca una reacción para verlo en acción.</p>\n    <section class=\"que-hacer\" id=\"queHacer\" hidden aria-labelledby=\"queHacerTitulo\"></section>\n    <div class=\"reacciones\" id=\"reacciones\" role=\"group\" aria-label=\"Reacciones\"></div>\n    <section class=\"muestra-pregunta\" id=\"muestraPregunta\" aria-labelledby=\"muestraTitulo\">\n      <h3 id=\"muestraTitulo\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-jugar\"/></svg>Míralo en un Tap</h3>\n      <p class=\"texto\" id=\"muestraTexto\">Así se ve dentro de un Tap: tu personaje presenta las preguntas, dice su lema y reacciona a cada respuesta. Prueba con dos preguntas de verdad.</p>\n      <div class=\"tap-marco\"><canvas id=\"tapMini\" role=\"img\" aria-label=\"Tu personaje dentro de un Tap\"></canvas></div>\n      <button type=\"button\" id=\"probar\" class=\"grande secundario\" style=\"background:var(--panel2);border-color:var(--acc);color:var(--txt)\"><svg class=\"ic\"><use href=\"#i-jugar\"/></svg>Probar con dos preguntas</button>\n      <p class=\"enunciado\" id=\"enunciado\" hidden></p>\n      <div class=\"opciones\" id=\"opciones\" role=\"group\" aria-label=\"Opciones de la pregunta\"></div>\n      <p class=\"veredicto\" id=\"veredicto\" role=\"status\" aria-live=\"polite\"></p>\n      <div class=\"hito-linea cta\" id=\"probadoCuenta\" hidden></div>\n    </section>\n    <form class=\"guardar\" id=\"formGuardar\" novalidate>\n      <label for=\"nombre\">Ponle nombre (opcional)</label>\n      <div class=\"fila\"><input id=\"nombre\" maxlength=\"20\" autocomplete=\"off\" autocapitalize=\"words\" enterkeyhint=\"done\" spellcheck=\"false\"><small id=\"restan\" aria-hidden=\"true\"></small></div>\n      <label for=\"lema\">Su lema (opcional): lo dice al aparecer en el Tap</label>\n      <div class=\"fila\"><input id=\"lema\" maxlength=\"40\" autocomplete=\"off\" autocapitalize=\"sentences\" enterkeyhint=\"done\" placeholder=\"Hoy aprendemos algo nuevo\"><small id=\"restanLema\" aria-hidden=\"true\"></small></div>\n      <button type=\"submit\" id=\"guardar\" class=\"grande\"><svg class=\"ic\"><use href=\"#i-guardar\"/></svg>Guardar en este dispositivo</button>\n      <p class=\"estado\" id=\"estadoGuardado\" role=\"status\" aria-live=\"polite\"></p>\n    </form>\n    <div class=\"gusto\" id=\"gusto\" hidden role=\"group\" aria-labelledby=\"gustoTexto\">\n      <p id=\"gustoTexto\">¿Te gustó hacerlo?</p>\n      <button type=\"button\" class=\"si\" id=\"gustoSi\" aria-label=\"Sí, me gustó\"><svg class=\"ic\"><use href=\"#i-sonrisa\"/></svg></button>\n      <button type=\"button\" id=\"gustoMeh\" aria-label=\"Más o menos\"><svg class=\"ic\"><use href=\"#i-neutro\"/></svg></button>\n      <button type=\"button\" class=\"cerrar\" id=\"gustoNo\" aria-label=\"Ahora no\"><svg class=\"ic\"><use href=\"#i-cerrar\"/></svg></button>\n    </div>\n    <section class=\"mislooks\" id=\"misLooks\" aria-labelledby=\"misLooksTitulo\">\n      <h3 id=\"misLooksTitulo\">Mis looks <small id=\"cuentaLooks\"></small></h3>\n      <div class=\"vacio\" id=\"misLooksVacio\"><svg viewBox=\"0 0 120 56\" aria-hidden=\"true\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"24\" cy=\"18\" r=\"8\"/><path d=\"M8 50c0-11 7-18 16-18s16 7 16 18\"/><circle cx=\"60\" cy=\"15\" r=\"9\"/><path d=\"M42 50c0-12 8-20 18-20s18 8 18 20M52 9h16\"/><circle cx=\"96\" cy=\"18\" r=\"8\"/><path d=\"M80 50c0-11 7-18 16-18s16 7 16 18\"/></g></svg><p class=\"texto\">Aquí van los personajes que guardes. Se quedan en este dispositivo; nada se envía.</p></div>\n      <div class=\"looks\" id=\"listaLooks\"></div>\n      <p class=\"hito-linea\" id=\"misLooksCuenta\" hidden></p>\n    </section>\n    <section class=\"compartir\" id=\"compartir\" aria-labelledby=\"compartirTitulo\">\n      <h3 id=\"compartirTitulo\" class=\"texto\" style=\"margin:0\">Compártelo con quien quieras. El enlace lleva el personaje completo; nadie necesita cuenta.</h3>\n      <button type=\"button\" id=\"copiarEnlace\" class=\"grande secundario\"><svg class=\"ic\"><use href=\"#i-enlace\"/></svg>Copiar enlace</button>\n      <div class=\"enlace\"><input id=\"enlaceTexto\" readonly aria-label=\"Enlace de tu personaje\"><button type=\"button\" id=\"enlaceSeleccionar\">Seleccionar</button></div>\n      <p class=\"estado\" id=\"estadoCompartir\" role=\"status\" aria-live=\"polite\"></p>\n    </section>\n    <p class=\"texto\" id=\"pronto\">Pronto vas a poder usarlo en tu propio Tap.</p>\n    <details id=\"masDetalles\">\n      <summary><svg class=\"ic\"><use href=\"#i-puntos\"/></svg>Más</summary>\n      <p class=\"texto\" style=\"margin-top:8px\">Llévate el personaje como archivo para guardarlo donde quieras, o trae uno que te hayan pasado.</p>\n      <div class=\"mas-acciones\">\n        <button type=\"button\" id=\"exportar\"><svg class=\"ic\"><use href=\"#i-bajar\"/></svg>Descargar archivo del personaje</button>\n        <label class=\"boton\" for=\"archivoImportar\"><svg class=\"ic\"><use href=\"#i-subir\"/></svg>Abrir un archivo<input type=\"file\" id=\"archivoImportar\" accept=\".json,application/json,text/plain\"></label>\n      </div>\n      <div class=\"importar\">\n        <label class=\"texto\" for=\"pegarImportar\" style=\"margin:0\">O pega aquí el texto de un archivo de personaje</label>\n        <textarea id=\"pegarImportar\" aria-label=\"Texto del personaje para traer\" placeholder=\"Pega aquí el texto del archivo\" spellcheck=\"false\"></textarea>\n        <div class=\"fila\"><button type=\"button\" id=\"importarPegado\">Traer este personaje</button><span class=\"aviso\" id=\"aviso\" aria-live=\"polite\"></span></div>\n      </div>\n      <textarea id=\"json\" readonly aria-label=\"Datos del personaje (modo desarrollo)\" hidden></textarea>\n    </details>\n  </section>\n</main>\n\n<div class=\"continuar\" id=\"continuar\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"continuarTitulo\">\n  <div class=\"hoja\">\n    <img id=\"continuarMini\" alt=\"\" width=\"84\" height=\"112\">\n    <div><h2 id=\"continuarTitulo\">Seguir donde ibas</h2><p id=\"continuarTexto\">Dejaste un personaje a medias en este dispositivo.</p></div>\n    <div class=\"botones\">\n      <button type=\"button\" class=\"primario\" id=\"continuarSi\">Seguir donde ibas</button>\n      <button type=\"button\" id=\"continuarNo\">Empezar otro</button>\n    </div>\n  </div>\n</div>\n\n<div class=\"continuar\" id=\"recibido\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"recibidoTitulo\">\n  <div class=\"hoja\">\n    <img id=\"recibidoMini\" alt=\"\" width=\"84\" height=\"112\">\n    <div><h2 id=\"recibidoTitulo\">Look de un amigo</h2><p id=\"recibidoTexto\">Alguien te mandó su personaje.</p></div>\n    <p class=\"estado\" id=\"recibidoEstado\" role=\"status\" aria-live=\"polite\"></p>\n    <div class=\"botones tres\">\n      <button type=\"button\" class=\"primario\" id=\"recibidoProbar\">Probarlo y ajustarlo</button>\n      <button type=\"button\" id=\"recibidoGuardar\"><svg class=\"ic\"><use href=\"#i-guardar\"/></svg>Guardarlo en Mis looks</button>\n      <button type=\"button\" class=\"terciario\" id=\"recibidoNo\">Seguir con el mío</button>\n    </div>\n  </div>\n</div>\n\n<footer>\n  <button id=\"atras\" hidden><svg class=\"ic\"><use href=\"#i-atras\"/></svg>Atrás</button>\n  <button id=\"siguiente\" class=\"primario\">Siguiente<svg class=\"ic\"><use href=\"#i-sig\"/></svg></button>\n</footer>";

/** Añade la hoja de estilos al documento una sola vez (disenador.html la trae en el <head>; la web no). */
export function asegurarEstilos(doc = document) {
  if (doc.querySelector('link[data-disenador-css]')) return;
  const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = URL_ESTILOS; l.dataset.disenadorCss = '1'; doc.head.append(l);
}

/**
 * Monta el diseñador dentro de `raiz` (un elemento vacío con la clase .dsn) y devuelve `{ ok, registro, destruir }`.
 * Opciones: `enviar(path)` canal de analítica de la página (si falta, el módulo carga count.js); `alEvento(nombreCorto)` aviso
 * por cada evento aceptado; `pasoPublicar: { texto, alTocar }` cuarto punto de progreso visible desde el inicio;
 * `sonido: { activo(): boolean, cambiar(on) }` enlaza el altavoz del creador con el silencio general de Taps (en /crear) en vez
 * de la clave propia CLAVE_SONIDO.
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
    b.onclick = () => { try { opciones.pasoPublicar.alTocar?.(contextoCuenta(null, 'publicar')); } catch { /* la página decide */ } };
    li.append(b); raiz.querySelector('#progreso').append(li);
  }
  const $ = id => raiz.querySelector('#' + id);
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Partículas en canvas (PR-D5, themes/epoca/particulas.js): pool fijo de 40, nada con movimiento reducido; se avanzan en
  // `cuadro()` y se pintan al final de `dibujar()` en píxeles de la vista. Con `fps-bajo` se degradan (mitad de ráfaga, sin brillo).
  const particulas = crearParticulas({ reducido });

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
  catch {
    // Fallo de carga: mensaje y «Reintentar» (vuelve a montar en la misma raíz). El objeto devuelto sigue siendo válido para quien
    // montó: `destruir` y `apagarHitos` llegan al diseñador que nazca del reintento.
    contar('error/carga');
    let siguiente = null;
    $('titulo').textContent = 'No se pudo cargar el tema.';
    const aviso = document.createElement('div'); aviso.className = 'fallo-carga'; aviso.setAttribute('role', 'alert');
    const p = document.createElement('p'); p.className = 'texto'; p.textContent = 'Revisa la conexión y vuelve a intentar. No se perdió nada.';
    const b = document.createElement('button'); b.type = 'button'; b.id = 'reintentar'; b.className = 'primario'; b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-deshacer"/></svg>Reintentar';
    b.onclick = async () => { b.disabled = true; for (const [t, ev, fn] of oyentes) t.removeEventListener(ev, fn); oyentes.length = 0; raiz.replaceChildren(); siguiente = await montarDisenador(raiz, opciones); };
    aviso.append(p, b); $('paso').replaceChildren(aviso); $('siguiente').hidden = true; b.focus();
    return { ok: false, registro: medidor.registro, apagarHitos() { siguiente?.apagarHitos?.(); }, destruir() { if (siguiente) siguiente.destruir(); else { for (const [t, ev, fn] of oyentes) t.removeEventListener(ev, fn); oyentes.length = 0; raiz.replaceChildren(); } } };
  }

  // ───────────────────────── datos (textos para personas; paletas y afinidades en themes/epoca/sugerencias.js) ─────────────────────────
  const MUNDO_DE = { grabador: 'taller-londres', arqueologa: 'excavacion-egipto', senador: 'foro-roma', escriba: 'excavacion-egipto', artesano: 'sala-medieval', investigadora: 'laboratorio-moderno', periodista: 'laboratorio-moderno' };
  const OBJETO_DE = { grabador: 'pluma', arqueologa: 'cepillo', senador: 'pergamino', escriba: 'pergamino', artesano: 'antorcha', investigadora: 'lupa', periodista: 'libro' };
  const paleta = campo => campo === 'coat' ? (PALETAS.coat[estado.look.outfit] || PALETAS.coat.levita) : PALETAS[campo];
  // Frases (themes/epoca/frases.js, PR-D4): seis por tipo, en la voz del punto de partida y sin repetir las tres últimas.
  const frases = crearFrases();
  // Reacciones de rig.js para lo que no tiene una propia; las de pieza (sombrero, peinado, prenda, color, objeto, gafas, barba) salen de reaccionDe().
  const REACCION = { preset: ['celebrate', 1.3], hat: ['talk', 1], hair: ['talk', 1], outfit: ['dance', 1.1], color: ['talk', 0.8], face: ['talk', 0.8], item: ['think', 1], world: ['talk', 1], hora: ['talk', 0.8], sorpresa: ['dance', 1.2], deshacer: ['think', 0.8], sugerencia: ['celebrate', 1], guardar: ['celebrate', 1.4], cargar: ['celebrate', 1.2] };
  // nombre sugerido según el punto de partida (editable, nunca obligatorio)
  const SUGERIDO = { grabador: 'Tomás', arqueologa: 'Capitana Inés', senador: 'Lucio', escriba: 'Nefer', artesano: 'Beltrán', investigadora: 'Marta', periodista: 'Álvaro', sorpresa: 'Mi personaje' };
  const QUIETA = { celebrate: 'happy', dance: 'happy', talk: 'still', think: 'think', hurt: 'oops', sad: 'oops', idle: 'still' };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ───────────────────────── estado ─────────────────────────
  // `hora` (PR-D8) es del escenario: `dia` pinta el mundo tal cual (lo de siempre); atardecer y noche son velos encima.
  const estado = { base: 'grabador', look: lookOf(theme.characters.grabador), item: 'pluma', world: 'taller-londres', hora: HORA_DEFECTO };
  const copia = e => ({ base: e.base, look: { ...e.look }, item: e.item, world: e.world, hora: e.hora });
  const horaValida = h => HORAS.includes(h) ? h : HORA_DEFECTO;
  const historial = [];                          // para Deshacer y comparar
  let pantalla = 0, pestana = 'cara';

  function cambiar(tipo, aplicar, detalle) {     // todo cambio pasa por aquí: guarda el anterior, aplica, reacciona, suena y repinta
    historial.push(copia(estado)); if (historial.length > 40) historial.shift();
    aplicar();
    if (estado.look.vest === undefined) estado.look.vest = null;
    $('deshacer').disabled = false;
    reaccionar(tipo, detalle); sonarCambio(tipo, detalle);
    fondoSucio = fondoSucio || tipo === 'world' || tipo === 'hora';
    escenasSucias = true;                        // las miniaturas del paso 2 llevan al personaje: se repintan al volver a verlas
    if (tipo === 'world' && !reducido) entrada = 1;
    // Prenda, sombrero y chaleco cambian qué grupos existen en Ropa (color del sombrero, del chaleco, camisa): se reconstruye con el foco a salvo.
    if (pantalla === 1 && pestana === 'ropa' && REHACE_ROPA.has(tipo)) construirAjustes(); else refrescarControles();
    refrescarSugerencia(); pintar(); pintarEscenas();
    celebrarCambio(tipo, detalle ?? {});
    programarAutoguardado();
    if (pantalla === 1 && CAMBIO_DE_PESTANA.has(tipo)) contar('cambio/' + pestana);   // agregado: 1 por pestaña por minuto
    invertir(tipo); mostrarPista();
    try { navigator.vibrate?.(12); } catch {}
  }
  const CAMBIO_DE_PESTANA = new Set(['face', 'hair', 'outfit', 'color', 'hat', 'item', 'sugerencia']);
  const REHACE_ROPA = new Set(['outfit', 'hat']);
  // Escalera de inversión (§2): la barra «Tu personaje» bajo la vista tiene 3 tramos (Cara · Ropa · Escenario) que pasan de contorno
  // a relleno con el primer cambio de cada zona; a los 5 cambios (o 60 s con algún cambio) se cuenta `invertido/5` una vez.
  const TRAMO_DE = { face: 'cara', hair: 'cara', outfit: 'ropa', color: 'ropa', hat: 'ropa', item: 'ropa', world: 'escenario', hora: 'escenario' };
  const NOMBRE_TRAMO = { cara: 'cara', ropa: 'ropa', escenario: 'escenario' };
  const invertido = new Set(); let cambios = 0, temporizadorInvertido = 0;
  function invertir(tipo) {
    const tramo = tipo === 'sugerencia' ? (pantalla === 2 ? 'escenario' : 'ropa') : (TRAMO_DE[tipo] ?? null);
    if (tramo) invertido.add(tramo);
    if (tipo !== 'preset' && tipo !== 'cargar' && tipo !== 'deshacer') cambios++;
    if (cambios === 5) { contar('invertido/5'); clearTimeout(temporizadorInvertido); }
    else if (cambios === 1 && !temporizadorInvertido) temporizadorInvertido = esperar(() => { if (cambios < 5) contar('invertido/5'); }, 60_000);
    pintarInversion();
  }
  function pintarInversion() {
    const barra = $('inversion');
    for (const i of barra.children) i.classList.toggle('on', invertido.has(i.dataset.tramo));
    const hechos = [...barra.children].filter(i => invertido.has(i.dataset.tramo)).map(i => NOMBRE_TRAMO[i.dataset.tramo]);
    barra.setAttribute('aria-label', hechos.length ? `Tu personaje: ya cambiaste ${hechos.join(', ')}` : 'Tu personaje: nada cambiado todavía');
  }
  // La pista «Mantén presionado para comparar» se enseña 2 veces por navegador y luego desaparece (taps.disenador.pista-comparar).
  let pistaContada = false;
  function mostrarPista() {
    if (!historial.length || pistaContada) return;
    const veces = Number(almacen.leer(CLAVE_PISTA) || 0);
    if (veces >= VECES_PISTA) return;
    pistaContada = true; almacen.escribir(CLAVE_PISTA, String(veces + 1));
    $('pista').hidden = false; esperar(() => { $('pista').hidden = true; }, 6000);
  }
  function deshacer() {
    const ant = historial.pop(); if (!ant) return;
    contar('deshacer');
    Object.assign(estado, ant); $('deshacer').disabled = !historial.length;
    fondoSucio = true; escenasSucias = true; reaccionar('deshacer'); sonarCambio('deshacer'); construirAjustes(); refrescarControles(); refrescarSugerencia(); pintar(); pintarEscenas();
    programarAutoguardado();
  }
  function ponerPreset(id) {
    const c = theme.characters[id];
    cambiar('preset', () => { estado.base = id; estado.look = lookOf(c); estado.item = OBJETO_DE[id] ?? null; estado.world = MUNDO_DE[id] ?? theme.defaultWorld; });
    decir(frases.saludo(c.name)); fondoSucio = true; construirAjustes();
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
    if (destino !== pantalla) { sonar(destino === 3 ? 'logro' : 'blip'); limpiarHitos(); }          // cambiar de paso; Listo celebra; los avisos de cuenta no viajan entre pasos
    const cambia = destino !== pantalla;
    pantalla = destino;
    // Transición de pantalla (PR-D5, §4): el panel entra desde abajo 220 ms y el h1 se funde; `entra` se reinicia en cada cambio
    // para que la animación CSS vuelva a correr. Con movimiento reducido el CSS anula las animaciones (corte directo).
    raiz.querySelectorAll('.pantalla').forEach(s => { const on = +s.dataset.p === pantalla; s.classList.toggle('activa', on); s.classList.remove('entra'); if (on && cambia) { void s.offsetWidth; s.classList.add('entra'); } });
    if (cambia) { const h1 = $('h1'); h1.classList.remove('funde'); void h1.offsetWidth; h1.classList.add('funde'); }
    const punto = pantalla <= 1 ? 0 : pantalla - 1;
    [...raiz.querySelectorAll('#progreso li:not(.publicar)')].forEach((li, i) => { li.classList.toggle('ahora', i === punto); li.classList.toggle('ya', i < punto); li.setAttribute('aria-current', i === punto ? 'step' : 'false'); });
    $('titulo').textContent = TITULOS[pantalla];
    $('h1').textContent = TITULOS_PASO[pantalla];
    $('atras').hidden = pantalla === 0;
    $('sorprender').hidden = pantalla === 0 || pantalla === 3;
    const sig = $('siguiente');
    sig.innerHTML = BOTON_SIGUIENTE[pantalla] + (pantalla === 3 ? '' : `<svg class="ic"><use href="#${pantalla === 2 ? 'i-listo' : 'i-sig'}"/></svg>`);
    $('paso').scrollTop = 0;
    if (pantalla === 1) construirAjustes();
    if (pantalla === 2) construirEscenas();
    // Listo (PR-D6): «Terminar» celebra con `logro` (arriba) y confeti; el personaje dice su lema si tiene; el marco del Tap se pinta.
    if (pantalla === 3) { refrescarJson(); prepararGuardar(); reiniciarPregunta(); cargarTapMuestra(); if (!reducido) { reaccionar('preset'); if (cambia) confetiLook(); } if (cambia && lemaActual()) decir(lemaActual()); }
    encuadrar(); refrescarSugerencia();
    programarAutoguardado();
    // Hitos de cuenta (§2): al entrar al escenario, un chip bajo la vista; en Listo, el bloque «Lo que puedes hacer con X».
    if (pantalla === 2 && historial.length) chipHito('navegador', COPY_HITOS.navegador.texto);
    if (pantalla === 3) bloqueListo();
  }
  $('siguiente').onclick = () => { if (pantalla === 3) { empezarOtro(); } else irA(pantalla + 1); };
  function empezarOtro() {                       // borrador nuevo: se olvida el anterior y el siguiente autoguardado estrena borradorId
    borradorActual = null; almacen.quitar(CLAVE_BORRADOR); $('nombre').value = ''; $('lema').value = ''; lookCargado = null;
    estado.hora = HORA_DEFECTO; ponerPreset('grabador'); irA(0);
    historial.length = 0; $('deshacer').disabled = true; clearTimeout(temporizadorGuardado); temporizadorGuardado = 0;
    invertido.clear(); cambios = 0; pintarInversion();
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
  // Pestañas accesibles (role=tablist + flechas, Inicio y Fin; foco itinerante: solo la activa entra con Tab).
  function elegirPestana(id, enfocar = false) {
    if (pestana !== id) sonar('toque', { vol: GANANCIA_BAJA });
    pestana = id; construirAjustes(); encuadrar();
    if (enfocar) raiz.querySelector(`#pestanas [data-id="${id}"]`)?.focus();
  }
  function construirPestanas() {
    $('pestanas').replaceChildren(...PESTANAS.map(([id, nombre, icono]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.id = 'pestana-' + id; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'ajustes');
      b.innerHTML = `<svg class="ic"><use href="#${icono}"/></svg>${nombre}`; b.onclick = () => elegirPestana(id); return b;
    }));
    $('pestanas').addEventListener('keydown', e => {
      const ids = PESTANAS.map(p => p[0]), i = ids.indexOf(pestana);
      const destino = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length] : e.key === 'ArrowLeft' ? ids[(i - 1 + ids.length) % ids.length] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids[ids.length - 1] : null;
      if (!destino) return;
      e.preventDefault(); elegirPestana(destino, true);
    });
  }
  function grupo(titulo, ...hijos) { const d = document.createElement('div'); d.className = 'grupo'; const h = document.createElement('h3'); h.textContent = titulo; d.append(h, ...hijos); return d; }
  // Subgrupo plegable de Ropa (PR-D3): <details> con el estado abierto/cerrado recordado mientras dura la sesión.
  const plegados = { prenda: true, colores: false, sombrero: false };
  function subgrupo(id, titulo, ...hijos) {
    const d = document.createElement('details'); d.className = 'subgrupo'; d.dataset.id = id; d.open = !!plegados[id];
    const s = document.createElement('summary'); s.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-sig"/></svg>`; s.append(titulo);
    const cuerpo = document.createElement('div'); cuerpo.className = 'cuerpo'; cuerpo.append(...hijos);
    d.addEventListener('toggle', () => { if (d.open === !!plegados[id]) return; plegados[id] = d.open; if (d.open) sonar('toque', { vol: GANANCIA_BAJA }); });   // el toggle inicial (estado recordado) no suena
    d.append(s, cuerpo); return d;
  }
  // Miniatura de una pieza (canvas 40×40): el personaje actual con esa pieza puesta, encuadrado en la zona que cambia
  // (cabeza para pelo, barba y sombrero; torso para la prenda; mano para el objeto). Así «Bicornio» o «Recogido» se ven antes de tocar.
  const ENCUADRE_PIEZA = { hairStyle: ['head', 2.1], beard: ['head', 2.1], hat: ['top', 1.6], outfit: ['chest', 0.9], item: ['hand', 1.5] };
  function miniaturaPieza(campo, v, tam = 40, r = Math.min(2, devicePixelRatio || 1)) {
    const c = document.createElement('canvas'); c.width = tam * r; c.height = tam * r; c.className = 'mini'; c.setAttribute('aria-hidden', 'true');
    const g = c.getContext('2d'); g.scale(r, r);
    g.fillStyle = '#15131f'; g.beginPath(); g.roundRect(0, 0, tam, tam, 8); g.fill(); g.clip();
    const L = lookOf({ look: estado.look }); let item = estado.item;
    if (campo === 'item') item = v === 'none' ? null : v; else L[campo] = v;
    if (campo === 'hairStyle') L.hat = 'none';                    // el sombrero taparía el peinado
    if (campo === 'beard') L.hat = 'none';
    const [ancla, zoom] = ENCUADRE_PIEZA[campo] ?? ['chest', 0.5], P = poseFor('still'), s = (tam / 372) * 2.2 * zoom;
    // drawHost centra el cuerpo en (x, y): se coloca de modo que el ancla quede en el centro de la miniatura (la mano, por armPoints).
    let ax, ay;
    if (ancla === 'hand') { const m = armPoints(1, P.armR); ax = (P.x + m.hx) * s; ay = (P.y + m.hy + 10) * s; }
    else { [ax, ay] = anchorOf(ancla, 0, 0, s, P); if (ancla === 'top') ay += 40 * s; if (ancla === 'head') ay += (campo === 'beard' ? 18 : 6) * s; }
    drawHost(g, tam / 2 - ax, tam / 2 - ay, s, P, L, { item, T: 0 });
    return c;
  }
  const CON_MINIATURA = new Set(['hairStyle', 'beard', 'hat', 'outfit', 'item']);
  function chips(campo, valores, tipo, nombres = NOMBRES) {
    const w = document.createElement('div'); w.className = 'chips' + (CON_MINIATURA.has(campo) ? ' con-mini' : ''); w.setAttribute('role', 'group');
    for (const v of valores) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.campo = campo; b.dataset.v = String(v);
      if (CON_MINIATURA.has(campo)) { try { b.append(miniaturaPieza(campo, v)); } catch { /* sin canvas: solo texto */ } }
      b.append(Object.assign(document.createElement('span'), { textContent: nombres[v] ?? v }));
      b.onclick = () => cambiar(tipo, () => { if (campo === 'item') estado.item = v === 'none' ? null : v; else estado.look[campo] = v; }, { indice: valores.indexOf(v), total: valores.length, campo });
      w.append(b);
    }
    return w;
  }
  function chipSiNo(campo, textoSi, tipo) {
    const w = document.createElement('div'); w.className = 'chips';
    for (const [v, t] of [[false, 'Sin ' + textoSi], [true, 'Con ' + textoSi]]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.campo = campo; b.dataset.v = String(v); b.textContent = t;
      b.onclick = () => cambiar(tipo, () => { estado.look[campo] = campo === 'vest' ? (v ? (PALETAS.vest[0]) : null) : v; }, { indice: v ? 1 : 0, total: 2, campo }); w.append(b);
    }
    return w;
  }
  function muestras(campo, tipo) {
    const w = document.createElement('div'); w.className = 'muestras'; w.setAttribute('role', 'group');
    for (const col of paleta(campo)) {
      const nombre = nombreColor(col);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'muestra'; b.dataset.campo = campo; b.dataset.v = col; b.style.background = col; b.setAttribute('aria-label', nombre); b.title = nombre;
      b.onclick = () => ponerColor(campo, col, tipo); w.append(b);
    }
    const mas = document.createElement('label'); mas.className = 'mas'; mas.title = 'Más colores'; mas.innerHTML = '<svg class="ic"><use href="#i-mas"/></svg>';
    const i = document.createElement('input'); i.type = 'color'; i.value = estado.look[campo] || '#888888'; i.setAttribute('aria-label', 'Más colores');
    // Al arrastrar el selector libre el bocadillo no anuncia nada (aria-live apagado hasta 700 ms después del último cambio).
    let t; i.oninput = () => { arrastreColor = performance.now(); clearTimeout(t); t = esperar(() => ponerColor(campo, i.value, tipo), 120); };
    mas.append(i); w.append(mas); return w;
  }
  let arrastreColor = 0;
  function ponerColor(campo, col, tipo) {
    cambiar(tipo, () => { estado.look[campo] = col; if (campo === 'skin') estado.look.skinShade = sombra(col); if (campo === 'coat') estado.look.coatShade = sombra(col); }, { color: col, campo });
  }
  function construirAjustes() {
    if (pantalla !== 1) return;
    raiz.querySelectorAll('#pestanas button').forEach(b => { const on = b.dataset.id === pestana; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    const L = estado.look, g = [];
    if (pestana === 'cara') g.push(grupo('Tono de piel', muestras('skin', 'face')), grupo('Gafas', chipSiNo('glasses', 'gafas', 'face')), grupo('Barba', chips('beard', CATALOGO.beard, 'face')));
    if (pestana === 'pelo') g.push(grupo('Peinado', chips('hairStyle', CATALOGO.hairStyle, 'hair')), grupo('Color de pelo', muestras('hair', 'hair')));
    if (pestana === 'ropa') {
      // Tres subgrupos plegables (PR-D3): primero la prenda y su color; los demás colores y el sombrero, plegados hasta que se abren.
      const prenda = [grupo('Prenda', chips('outfit', CATALOGO.outfit, 'outfit')), grupo('Color de la prenda', muestras('coat', 'color')), grupo('Manga', chips('sleeve', CATALOGO.sleeve, 'outfit'))];
      const colores = [];
      if (['levita', 'safari', 'medieval', 'traje', 'bata'].includes(L.outfit)) colores.push(grupo('Camisa', muestras('shirt', 'color')));
      colores.push(grupo('Chaleco', chipSiNo('vest', 'chaleco', 'outfit'))); if (L.vest) colores.push(grupo('Color del chaleco', muestras('vest', 'color')));
      colores.push(grupo('Pantalón', muestras('trousers', 'color')), grupo('Calzado', muestras('shoes', 'color')), grupo('Detalle', muestras('accent', 'color')));
      const sombrero = [grupo('Sombrero', chips('hat', CATALOGO.hat, 'hat'))]; if (L.hat !== 'none') sombrero.push(grupo('Color del sombrero', muestras('hatColor', 'hat')));
      g.push(subgrupo('prenda', 'Prenda', ...prenda), subgrupo('colores', 'Colores', ...colores), subgrupo('sombrero', 'Sombrero', ...sombrero));
    }
    if (pestana === 'objeto') g.push(grupo('En la mano', chips('item', ['none', ...Object.keys(ITEMS)], 'item', { ...NOMBRES, none: 'Nada' })));
    // Si el foco estaba en un control de este panel, vuelve al mismo (mismo campo y valor) tras reconstruir.
    const activo = raiz.ownerDocument.activeElement, enfocado = activo && $('ajustes').contains(activo) ? activo.closest('[data-campo]') : null;
    const clave = enfocado ? [enfocado.dataset.campo, enfocado.dataset.v] : null;
    $('ajustes').setAttribute('aria-labelledby', 'pestana-' + pestana);
    $('ajustes').replaceChildren(...g); refrescarControles();
    if (clave) { const b = $('ajustes').querySelector(`[data-campo="${clave[0]}"][data-v="${CSS.escape(clave[1])}"]`); b?.focus({ preventScroll: true }); }
  }
  function refrescarControles() {               // marca el chip o la muestra activa sin reconstruir
    const L = estado.look;
    raiz.querySelectorAll('#ajustes .chip, #ajustes .muestra').forEach(b => {
      const c = b.dataset.campo, actual = c === 'item' ? (estado.item ?? 'none') : c === 'vest' ? !!L.vest : L[c];
      b.classList.toggle('on', String(actual) === b.dataset.v); b.setAttribute('aria-pressed', String(String(actual) === b.dataset.v));
    });
    raiz.querySelectorAll('#ajustes .mas input').forEach(i => { const c = i.closest('.muestras')?.querySelector('.muestra')?.dataset.campo; if (c && /^#[0-9a-f]{6}$/i.test(L[c] || '')) i.value = L[c]; });
    marcarPreset(); raiz.querySelectorAll('#escenas .tarjeta').forEach(b => b.classList.toggle('on', b.dataset.id === estado.world));
    raiz.querySelectorAll('#horas .chip').forEach(b => { const on = b.dataset.id === estado.hora; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }

  // Paso 2: tarjetas con TU personaje ya de pie en cada escenario. El fondo de cada mundo se pinta una sola vez y se guarda;
  // el personaje se repinta encima solo cuando cambia el look (escenasSucias), nunca en bucle.
  const MINI_W = 320, MINI_H = 200, fondosMini = {};
  let escenasSucias = true;
  function fondoMini(w, hora = HORA_DEFECTO) {          // una miniatura por mundo y hora (8 × 3 como mucho), pintada la primera vez que se ve
    const k = `${w}|${hora}`;
    if (fondosMini[k]) return fondosMini[k];
    const c = document.createElement('canvas'); c.width = MINI_W; c.height = MINI_H; paintWorld(c.getContext('2d'), MINI_W, MINI_H, w, {}, null, 1, hora);
    return fondosMini[k] = c;
  }
  const ICONO_HORA = { dia: 'i-sol', atardecer: 'i-atardecer', noche: 'i-luna' };
  // Selector de hora del día (PR-D8): tres chips con icono dibujado; cambia la vista, las tarjetas de abajo y el marco del Tap.
  function construirHoras() {
    if ($('horas').children.length) return;
    $('horas').replaceChildren(...HORAS.map(h => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.id = h; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = icono(ICONO_HORA[h]) + HORAS_NOMBRE[h];
      b.onclick = () => { if (estado.hora === h) return; cambiar('hora', () => { estado.hora = h; }); contar('hora/' + h); }; return b;
    }));
  }
  function construirEscenas() {
    construirHoras();
    if (!$('escenas').children.length) {
      $('escenas').replaceChildren(...WORLD_NAMES.map(w => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tarjeta'; b.dataset.id = w;
        const c = document.createElement('canvas'); c.width = MINI_W; c.height = MINI_H; c.setAttribute('aria-hidden', 'true');
        const [n, sub] = MUNDOS[w] ?? [w, ''];
        b.append(c, Object.assign(document.createElement('b'), { textContent: n }), Object.assign(document.createElement('small'), { textContent: sub }));
        b.setAttribute('aria-label', `${n}, ${sub}: tu personaje en este escenario`);
        b.onclick = () => { if (estado.world !== w) volarAVista(c); cambiar('world', () => { estado.world = w; }); }; return b;
      }));
    }
    pintarEscenas(true); refrescarControles();
  }
  function pintarEscenas(forzar = false) {
    if (!escenasSucias || (pantalla !== 2 && !forzar) || !$('escenas').children.length) return;
    const L = lookOf({ look: estado.look }), P = poseFor('still'), s = MINI_H * 0.78 / 372, pies = MINI_H * (GROUND_Y + 0.4), cy = pies - 112 * s;
    for (const b of $('escenas').children) {
      const g = b.querySelector('canvas').getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fondoMini(b.dataset.id, estado.hora), 0, 0);
      g.fillStyle = 'rgba(8,7,16,.32)'; g.beginPath(); g.ellipse(MINI_W / 2, pies + 6 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2); g.fill();
      drawHost(g, MINI_W / 2, cy, s, P, L, { item: estado.item, T: 0 });
    }
    escenasSucias = false;
  }

  // Paso 3: reacciones y «Más»
  function construirReacciones() {
    const lista = [['talk', 'Habla'], ['think', 'Piensa'], ['celebrate', 'Acierta'], ['hurt', 'Falla'], ['dance', 'Baila']];
    $('reacciones').replaceChildren(...lista.map(([a, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t; b.onclick = () => { sonar('toque', { vol: GANANCIA_BAJA }); animar(a, 1.6); }; return b; }));
  }
  // ───────────────────────── vista previa en Tap (PR-D6, disenador-v2-plan.md §5) ─────────────────────────
  // Un marco 9:16 dibujado en canvas (el motor de verdad con `stage.registerCharacter` es PR-D10): arriba el escenario del
  // personaje con él de anfitrión diciendo su lema; abajo el panel de pregunta y opciones como en el feed. Juega DOS preguntas
  // reales del banco del motor (taps/<id>.json, las dos primeras de 4 opciones) con los sonidos del feed (`acierto`/`fallo`)
  // y las mismas poses (celebrate / hurt). Si el banco no carga, hay dos preguntas de reserva: la vista nunca queda vacía.
  // Las opciones se tocan en el marco (hit-test) o en los botones de abajo (accesibles): mismo camino.
  const TAP_MUESTRA = new URL('./taps/ciencia-curiosa.json', import.meta.url);
  const PREGUNTAS_RESERVA = Object.freeze([
    { q: '¿Cuál de estos números es primo?', options: ['9', '7', '15', '21'], answer: 1, why: 'El 7 solo se divide por 1 y por sí mismo.' },
    { q: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], answer: 1, why: 'Hexa- quiere decir seis.' },
  ]);
  const preguntaValida = q => q && typeof q.q === 'string' && q.q.length <= 120 && Array.isArray(q.options) && q.options.length === 4 && q.options.every(o => typeof o === 'string' && o.length <= 25) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && (!q.escena) && (q.tipo === undefined || q.tipo === 'clasica');
  let tapMuestra = { titulo: 'Tap de muestra', kicker: 'Dos preguntas', backdrop: ['#1E1B4B', '#3B2F86'], preguntas: PREGUNTAS_RESERVA };
  let tapPedido = false;
  async function cargarTapMuestra() {
    if (tapPedido) return; tapPedido = true;
    try {
      const t = await (await fetch(TAP_MUESTRA)).json();
      const preguntas = (Array.isArray(t.questions) ? t.questions : []).filter(preguntaValida).slice(0, 2);
      if (preguntas.length === 2) tapMuestra = { titulo: String(t.title || tapMuestra.titulo).slice(0, 40), kicker: String(t.kicker || '').slice(0, 30), backdrop: Array.isArray(t.backdrop) && t.backdrop.length === 2 ? t.backdrop : tapMuestra.backdrop, preguntas };
    } catch { /* sin banco: quedan las de reserva */ }
    pintarTap();
  }
  const FRASES_TAP = { bien: ['¡Eso es!', '¡Correcto! Así celebro.', 'Lo sabías.'], mal: ['Casi…', 'Uy, no.', 'La próxima sale.'] };
  // Estado del juego: activo (se tocó «Probar»), índice de la pregunta, qué se respondió en la actual (null = nada), aciertos.
  const juego = { activo: false, indice: 0, elegida: null, aciertos: 0, fin: false };
  let zonasTap = [];                             // rectángulos de las opciones del último pintado (para tocar el marco)
  const letraTap = i => 'ABCD'[i];
  function preguntaActual() { return tapMuestra.preguntas[juego.indice]; }
  function reiniciarPregunta() {
    const caja = $('muestraPregunta'); caja.classList.remove('jugando');
    Object.assign(juego, { activo: false, indice: 0, elegida: null, aciertos: 0, fin: false });
    $('enunciado').hidden = true; $('veredicto').textContent = ''; $('veredicto').classList.remove('bien'); $('opciones').replaceChildren();
    $('probadoCuenta').hidden = true; $('probadoCuenta').replaceChildren();
    pintarTap();
  }
  function construirOpcionesTap() {
    const p = preguntaActual();
    $('enunciado').hidden = false; $('enunciado').textContent = `${juego.indice + 1} de ${tapMuestra.preguntas.length}: ${p.q}`;
    $('opciones').replaceChildren(...p.options.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.i = String(i); b.innerHTML = `<span class="letra">${letraTap(i)}</span>`; b.append(t);
      b.onclick = () => responderTap(i); return b;
    }));
    $('veredicto').textContent = ''; $('veredicto').classList.remove('bien');
  }
  function responderTap(i) {
    if (!juego.activo || juego.elegida !== null || juego.fin) return;
    const p = preguntaActual(), ok = i === p.answer; juego.elegida = i; if (ok) juego.aciertos++;
    for (const o of $('opciones').children) { o.disabled = true; const k = Number(o.dataset.i); o.classList.toggle('bien', k === p.answer); o.classList.toggle('mal', k === i && !ok); }
    const v = $('veredicto'); v.textContent = (ok ? 'Acertaste. ' : `Era «${p.options[p.answer]}». `) + String(p.why || ''); v.classList.toggle('bien', ok);
    animar(ok ? 'celebrate' : 'hurt', 1.6); decir(pick(ok ? FRASES_TAP.bien : FRASES_TAP.mal));
    sonar(ok ? 'acierto' : 'fallo');                                     // los del feed: así sonará en un Tap de verdad
    try { navigator.vibrate?.(ok ? 15 : [10, 40, 10]); } catch {}
    const ultima = juego.indice >= tapMuestra.preguntas.length - 1;
    const sig = document.createElement('button'); sig.type = 'button'; sig.className = 'siguiente'; sig.innerHTML = icono(ultima ? 'i-listo' : 'i-sig'); sig.append(ultima ? 'Ver el resultado' : 'Siguiente pregunta');
    sig.onclick = () => { sonar('toque', { vol: GANANCIA_BAJA }); if (ultima) terminarTap(); else { juego.indice++; juego.elegida = null; construirOpcionesTap(); if (!reducido) animar('think', 1.2); pintarTap(); } };
    $('opciones').append(sig);
    pintarTap();
    ctaProbado();                                                        // tras el primer veredicto: «Así lo verían tus estudiantes…» (§2)
  }
  function terminarTap() {
    juego.fin = true;
    const n = juego.aciertos, total = tapMuestra.preguntas.length;
    const v = $('veredicto'); v.textContent = n === total ? `${n} de ${total}. Así termina un Tap: tu personaje celebra con quien lo jugó.` : `${n} de ${total}. Así termina un Tap: tu personaje anima a intentarlo otra vez.`; v.classList.toggle('bien', n === total);
    $('enunciado').hidden = true;
    const otra = document.createElement('button'); otra.type = 'button'; otra.innerHTML = icono('i-deshacer'); otra.append('Jugar otra vez'); otra.onclick = () => { reiniciarPregunta(); $('probar').click(); };
    $('opciones').replaceChildren(otra);
    animar(n ? 'celebrate' : 'talk', 1.6); if (!reducido) confetiLook(); sonar(n === total ? 'logro' : 'toque');
    pintarTap();
  }
  $('probar').onclick = () => {
    contar('probar');
    Object.assign(juego, { activo: true, indice: 0, elegida: null, aciertos: 0, fin: false });
    $('muestraPregunta').classList.add('jugando'); construirOpcionesTap();
    if (!reducido) animar('think', 1.2); decir('A ver si sabes…'); sonar('toque', { vol: GANANCIA_BAJA });
    pintarTap();
  };
  // Tocar una opción dentro del marco: el mismo camino que los botones de abajo.
  $('tapMini').addEventListener('click', e => {
    if (!juego.activo || juego.elegida !== null || juego.fin) return;
    const r = $('tapMini').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const z = zonasTap.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    if (z) responderTap(z.i);
  });
  /** Parte `texto` en líneas que caben en `maxW` con la fuente actual de `g`; como mucho `max` líneas (la última con «…»). */
  function lineasDe(g, texto, maxW, max) {
    const palabras = String(texto).split(' '), lineas = []; let actual = '';
    for (const p of palabras) { const prueba = actual ? actual + ' ' + p : p; if (g.measureText(prueba).width <= maxW || !actual) actual = prueba; else { lineas.push(actual); actual = p; } }
    if (actual) lineas.push(actual);
    if (lineas.length > max) { const corte = lineas.slice(0, max); let u = corte[max - 1]; while (u && g.measureText(u + '…').width > maxW) u = u.slice(0, -1).trimEnd(); corte[max - 1] = u + '…'; return corte; }
    return lineas;
  }
  function redondo(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }   // navegadores sin roundRect: esquinas rectas, nada se rompe
  /** Pinta el marco 9:16: escenario + personaje + lema arriba; pregunta y opciones abajo, con el estado del juego. */
  function pintarTap() {
    const c = $('tapMini'); if (!c) return;
    const rect = c.getBoundingClientRect(); if (!rect.width) return;
    const W = Math.round(rect.width), H = Math.round(rect.width * 16 / 9), r = Math.min(2, devicePixelRatio || 1);
    if (c.width !== W * r || c.height !== H * r) { c.width = W * r; c.height = H * r; }
    const g = c.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H);
    g.font = '10px system-ui, sans-serif'; g.textBaseline = 'top';
    // fondo del Tap: degradado del banco; escena del personaje en el 54 % de arriba, recortada
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, tapMuestra.backdrop[0]); grad.addColorStop(1, tapMuestra.backdrop[1]); g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const ZH = H * 0.54;
    g.save(); g.beginPath(); g.rect(0, 0, W, ZH); g.clip(); paintWorld(g, W, ZH, estado.world, {}, null, 1, estado.hora); g.restore();
    const s = ZH * 0.62 / 372, pies = ZH * 0.95, cy = pies - 112 * s, L = lookOf({ look: estado.look });
    g.fillStyle = 'rgba(8,7,16,.32)'; g.beginPath(); g.ellipse(W / 2, pies + 4 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2); g.fill();
    const poseTap = juego.fin ? poseFor(juego.aciertos ? 'celebrate' : 'talk', 0.5, 0) : juego.elegida !== null ? poseFor(juego.elegida === preguntaActual().answer ? 'celebrate' : 'hurt', 0.5, 0) : juego.activo ? poseFor('think', 0.5, 0) : poseFor('still');
    drawHost(g, W / 2, cy, s, blendPose(null, poseTap, 1), L, { item: estado.item, T: 0 });
    // cabecera: kicker y título del Tap, como en el feed
    g.fillStyle = 'rgba(15,14,23,.55)'; redondo(g, 8, 8, W - 16, 26, 8); g.fill();
    g.fillStyle = 'rgba(236,235,245,.75)'; g.font = '600 7px system-ui, sans-serif'; g.fillText(tapMuestra.kicker.toUpperCase(), 14, 12);
    g.fillStyle = '#ecebf5'; g.font = '700 9px system-ui, sans-serif'; g.fillText(lineasDe(g, tapMuestra.titulo, W - 60, 1)[0] ?? '', 14, 21);
    g.font = '600 8px system-ui, sans-serif'; g.fillStyle = 'rgba(236,235,245,.75)'; g.textAlign = 'right'; g.fillText(juego.activo && !juego.fin ? `${juego.indice + 1}/${tapMuestra.preguntas.length}` : `${tapMuestra.preguntas.length} preg.`, W - 14, 16); g.textAlign = 'left';
    // bocadillo del personaje: lema (o saludo con el nombre); al responder, su reacción
    const nombre = nombreActual(), lema = lemaActual();
    const dicho = juego.fin ? (juego.aciertos ? '¡Lo lograste!' : '¡Otra vez!') : juego.elegida !== null ? (juego.elegida === preguntaActual().answer ? '¡Eso es!' : 'Casi…') : (lema || `Hola, soy ${nombre}`);
    g.font = '600 9px system-ui, sans-serif';
    const lineasB = lineasDe(g, dicho, W - 60, 2), bw = Math.min(W - 24, Math.max(...lineasB.map(l => g.measureText(l).width)) + 16), bh = 10 + lineasB.length * 12, bx = W / 2 - bw / 2, by = 42;
    g.fillStyle = '#fff'; redondo(g, bx, by, bw, bh, 9); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 5, by + bh - 1); g.lineTo(W / 2, by + bh + 6); g.lineTo(W / 2 + 5, by + bh - 1); g.fill();
    g.fillStyle = '#1a1726'; g.textAlign = 'center'; lineasB.forEach((l, i) => g.fillText(l, W / 2, by + 5 + i * 12)); g.textAlign = 'left';
    // panel inferior: pregunta y 4 opciones (como el feed: letra en círculo, barra por opción)
    const py = ZH, ph = H - ZH, pad = 10;
    g.fillStyle = 'rgba(15,14,23,.78)'; redondo(g, 0, py - 10, W, ph + 10, 14); g.fill();
    const p = preguntaActual(); g.fillStyle = '#ecebf5'; g.font = '700 10px system-ui, sans-serif';
    const lq = lineasDe(g, p.q, W - pad * 2, 3); lq.forEach((l, i) => g.fillText(l, pad, py + 2 + i * 13));
    zonasTap = [];
    const oy = py + 6 + lq.length * 13, oh = 22, gap = 5, ow = W - pad * 2;
    const altoDisponible = H - oy - 8, filas = Math.min(4, Math.floor((altoDisponible + gap) / (oh + gap)));
    g.font = '600 9px system-ui, sans-serif';
    p.options.slice(0, Math.max(0, filas)).forEach((t, i) => {
      const y = oy + i * (oh + gap), bien = juego.elegida !== null && i === p.answer, mal = juego.elegida === i && i !== p.answer;
      g.fillStyle = bien ? 'rgba(52,211,153,.22)' : mal ? 'rgba(243,160,160,.22)' : 'rgba(236,235,245,.1)'; redondo(g, pad, y, ow, oh, 8); g.fill();
      g.strokeStyle = bien ? '#34d399' : mal ? '#f3a0a0' : 'rgba(236,235,245,.22)'; g.lineWidth = 1; redondo(g, pad + 0.5, y + 0.5, ow - 1, oh - 1, 8); g.stroke();
      g.fillStyle = bien ? '#34d399' : 'rgba(236,235,245,.16)'; g.beginPath(); g.arc(pad + 12, y + oh / 2, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = bien ? '#1a1408' : '#ecebf5'; g.textAlign = 'center'; g.fillText(letraTap(i), pad + 12, y + oh / 2 - 5); g.textAlign = 'left';
      g.fillStyle = juego.elegida !== null && !bien && !mal ? 'rgba(236,235,245,.55)' : '#ecebf5'; g.fillText(lineasDe(g, t, ow - 34, 1)[0] ?? '', pad + 24, y + oh / 2 - 5);
      zonasTap.push({ i, x: pad, y, w: ow, h: oh });
    });
    if (juego.fin) {     // resultado encima de las opciones
      g.fillStyle = 'rgba(15,14,23,.9)'; redondo(g, pad, oy, ow, Math.max(oh, H - oy - 8), 10); g.fill();
      g.fillStyle = '#ecebf5'; g.font = '700 13px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(`${juego.aciertos} de ${tapMuestra.preguntas.length}`, W / 2, oy + 10);
      g.font = '600 9px system-ui, sans-serif'; g.fillStyle = 'rgba(236,235,245,.75)'; g.fillText(juego.aciertos === tapMuestra.preguntas.length ? 'Pleno' : 'Buen intento', W / 2, oy + 28); g.textAlign = 'left';
      zonasTap = [];
    } else if (!juego.activo) {     // pista: toca «Probar»
      g.fillStyle = 'rgba(236,235,245,.6)'; g.font = '600 8px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Toca «Probar» para jugarlo', W / 2, H - 14); g.textAlign = 'left';
    }
  }
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

  function datosLook() { const l = { ...estado.look }; if (!l.vest) delete l.vest; const d = { base: estado.base, look: l, item: estado.item, world: estado.world }; if (estado.hora !== HORA_DEFECTO) d.hora = estado.hora; return d; }
  // El JSON crudo solo se ve con ?dev=1 (para quien desarrolla); para las personas queda el archivo y el enlace.
  const modoDev = /(^|[?&])dev=1(&|$)/.test(location.search);
  $('json').hidden = !modoDev;
  function refrescarJson() { if (!modoDev) return; const e = validarLook(estado.look); $('json').value = JSON.stringify(datosLook(), null, 2) + (e.length ? '\n// ' + e.join('; ') : ''); }

  // ───────────────────────── guardado en el dispositivo (themes/epoca/guardado.js; nada viaja a ningún servidor) ─────────────────────────
  const almacen = crearAlmacen(storageNativo);
  let misLooks = parsearLooks(almacen.leer(CLAVE_LOOKS), validarLook);
  let borradorActual = parsearBorrador(almacen.leer(CLAVE_BORRADOR), validarLook);
  let lookCargado = null;                        // id del look de «Mis looks» que está en la vista (para marcarlo)
  let temporizadorGuardado = 0, temporizadorEstado = 0;
  const SIN_ALMACEN = 'En este navegador no se puede guardar (modo privado o almacenamiento bloqueado). Puedes seguir creando; para llevarte el personaje, descarga su archivo desde «Más» o copia el enlace.';

  function programarAutoguardado() {             // borrador con ~1 s de espera; conserva el borradorId entre guardados
    if (!almacen.disponible || (!historial.length && pantalla === 0)) return;   // sin tocar nada no hay borrador que ofrecer
    clearTimeout(temporizadorGuardado); temporizadorGuardado = esperar(guardarBorradorAhora, 1000);
  }
  function guardarBorradorAhora() {
    clearTimeout(temporizadorGuardado);
    if (!almacen.disponible) return;
    // La miniatura (PNG de 72×96) va en el borrador para que /instituciones muestre «Tu personaje irá adjunto» sin pintar (PR-8).
    borradorActual = { ...armarBorrador(estado, pantalla, borradorActual, Date.now(), { lema: lemaActual() }), miniatura: pngMiniatura() };
    almacen.escribir(CLAVE_BORRADOR, serializarBorrador(borradorActual));
  }
  escuchar(document, 'visibilitychange', () => { if (document.hidden && temporizadorGuardado) guardarBorradorAhora(); });
  escuchar(window, 'pagehide', () => { if (temporizadorGuardado) guardarBorradorAhora(); });

  function estadoGuardado(texto, bien = false, ms = 4000) {
    const p = $('estadoGuardado'); p.textContent = texto; p.classList.toggle('bien', bien); clearTimeout(temporizadorEstado);
    if (ms) temporizadorEstado = esperar(() => { if (p.textContent === texto) { p.textContent = ''; p.classList.remove('bien'); } }, ms);
  }
  function nombreSugerido() { return SUGERIDO[estado.base] ?? 'Mi personaje'; }
  function prepararGuardar() {                   // al entrar al paso 3: nombre sugerido, contadores, lista y marco del Tap
    const i = $('nombre'); i.placeholder = nombreSugerido(); contarNombre(); contarLema();
    if (!almacen.disponible) { $('guardar').disabled = true; estadoGuardado(SIN_ALMACEN, false, 0); $('misLooks').hidden = true; }
    pintarMisLooks(); pintarTap();
  }
  function contarNombre() { const n = Array.from($('nombre').value).length; $('restan').textContent = n ? `${n}/${MAX_NOMBRE}` : ''; }
  /** Lema del personaje (PR-D6): hasta MAX_LEMA caracteres; viaja en el enlace (`m`), en Mis looks y en el borrador, nunca en la solicitud. */
  function lemaActual() { return Array.from($('lema').value.replace(/\s+/g, ' ').trim()).slice(0, MAX_LEMA).join(''); }
  function contarLema() { const n = Array.from($('lema').value).length; $('restanLema').textContent = n ? `${n}/${MAX_LEMA}` : ''; }
  $('nombre').addEventListener('input', () => { contarNombre(); const h = $('queHacerTitulo'); if (h) h.textContent = conNombre(COPY_HITOS.listo.titulo, nombreActual()); pintarTap(); });
  $('lema').addEventListener('input', () => { contarLema(); pintarTap(); });

  function pngMiniatura() { try { return miniatura(estado.look, 72, 96, 1).toDataURL('image/png'); } catch { return ''; } }
  // ───────────────────────── partículas y transiciones (PR-D5, §4) ─────────────────────────
  // Todo se pinta en el canvas de la vista (nada en DOM): polvo dorado desde el chip al cambiar una pieza, anillo de luz del chip
  // al personaje al elegir color, confeti con los colores del look en Listo y al guardar. Los puntos de origen salen del control
  // tocado (getBoundingClientRect) llevados a coordenadas de la vista y pegados a su borde: el control está debajo de la vista.
  const CON_POLVO = new Set(['face', 'hair', 'outfit', 'hat', 'item', 'sugerencia', 'sorpresa']);
  function enVista(el, margen = 8) {
    const rv = vista.getBoundingClientRect();
    if (!el) return [w / 2, h - margen];
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - rv.left, cy = r.top + r.height / 2 - rv.top;
    return [Math.max(margen, Math.min(w - margen, cx)), Math.max(margen, Math.min(h - margen, cy))];
  }
  function controlDe(detalle) {
    if (!detalle.campo) return null;
    const activo = raiz.querySelector(`#ajustes .on[data-campo="${detalle.campo}"]`);
    if (activo) return activo;
    // Color libre (ningún círculo encendido): el origen es el botón «Más colores» de ese grupo.
    return raiz.querySelector(`#ajustes .muestra[data-campo="${detalle.campo}"]`)?.closest('.muestras')?.querySelector('.mas') ?? null;
  }
  function celebrarCambio(tipo, detalle) {
    if (reducido) return;
    if (tipo === 'color' || detalle.color) { const [x, y] = enVista(controlDe(detalle)); particulas.anillo(x, y, w / 2, h / 2, { color: detalle.color || undefined, r1: Math.min(w, h) * 0.32 }); }
    else if (CON_POLVO.has(tipo)) { const [x, y] = enVista(controlDe(detalle)); particulas.polvo(x, y); }
  }
  /** Confeti de papel con los colores del look actual, desde arriba de la vista (Listo y guardar). */
  function confetiLook() {
    if (reducido) return;
    const L = estado.look; particulas.confeti(w / 2, h * 0.22, [L.coat, L.accent, L.trousers, L.hair, L.shirt, '#f0d08a'], { ancho: w * 0.6 });
  }
  /** Tarjeta de escenario → vista: una copia de la miniatura crece desde la tarjeta hasta la vista (300 ms) y se quita sola. */
  function volarAVista(mini) {
    if (reducido || typeof mini?.animate !== 'function') return;
    const r0 = mini.getBoundingClientRect(), r1 = vista.getBoundingClientRect(), rr = raiz.getBoundingClientRect();
    if (!r0.width || !r1.width) return;
    const c = document.createElement('canvas'); c.width = mini.width; c.height = mini.height; c.className = 'vuelo'; c.setAttribute('aria-hidden', 'true');
    try { c.getContext('2d').drawImage(mini, 0, 0); } catch { return; }
    Object.assign(c.style, { left: (r0.left - rr.left) + 'px', top: (r0.top - rr.top) + 'px', width: r0.width + 'px', height: r0.height + 'px' });
    raiz.append(c);
    const quitar = () => c.remove();
    const a = c.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0.95, borderRadius: '10px' },
      { transform: `translate(${r1.left - r0.left + (r1.width - r0.width) / 2}px, ${r1.top - r0.top + (r1.height - r0.height) / 2}px) scale(${r1.width / r0.width}, ${r1.height / r0.height})`, opacity: 0, borderRadius: '4px' },
    ], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    a.onfinish = quitar; a.oncancel = quitar; esperar(quitar, 400);
  }
  $('formGuardar').addEventListener('submit', ev => {
    ev.preventDefault();
    if (!almacen.disponible) { estadoGuardado(SIN_ALMACEN, false, 0); sonarError(); return; }
    const nombre = $('nombre').value.trim() || nombreSugerido();
    const r = guardarLook(misLooks, estado, { nombre, lema: lemaActual(), miniatura: pngMiniatura() });
    if (r.lleno) { estadoGuardado(`Ya tienes ${MAX_LOOKS} looks guardados, el máximo. Borra uno de «Mis looks» y vuelve a guardar.`, false, 8000); sonarError(); $('misLooks').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }); return; }
    if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(r.lista))) { estadoGuardado('No se pudo guardar: el almacenamiento de este navegador está lleno o bloqueado. Descarga su archivo desde «Más» o copia el enlace.', false, 8000); sonarError(); return; }
    misLooks = r.lista; lookCargado = r.look.id; $('nombre').value = ''; contarNombre();
    estadoGuardado(`«${r.look.nombre}» está en Mis looks.`, true); reaccionar('guardar'); sonar('guardar'); confetiLook(); pintarMisLooks();
    contar('listo'); ofrecerGusto(); lineaGuardado();
    try { navigator.vibrate?.(15); } catch {}
  });
  function persistirLooks(lista, aviso) {
    if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(lista))) { estadoGuardado('No se pudo guardar el cambio en este navegador.', false, 6000); return false; }
    misLooks = lista; if (aviso) estadoGuardado(aviso, true); pintarMisLooks(); return true;
  }
  function cargarLook(l) {
    cambiar('cargar', () => { estado.base = l.base; estado.look = { ...l.look }; estado.item = l.item; estado.world = l.world; estado.hora = horaValida(l.hora); });
    $('lema').value = l.lema || '';
    lookCargado = l.id; fondoSucio = true; if (!reducido) entrada = 1; pintar(); construirAjustes(); refrescarJson(); prepararGuardar();
    $('paso').scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    chipHito('vuelve', conNombre(COPY_HITOS.vuelve.texto, l.nombre));       // volvió por un look guardado (§2)
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
  const OPCIONES_LOOK = { items: Object.keys(ITEMS), mundos: [...WORLD_NAMES], horas: [...HORAS] };
  let temporizadorCompartir = 0;
  function estadoCompartir(texto, bien = false, ms = 4000) {
    const p = $('estadoCompartir'); p.textContent = texto; p.classList.toggle('bien', bien); clearTimeout(temporizadorCompartir);
    if (ms) temporizadorCompartir = esperar(() => { if (p.textContent === texto) { p.textContent = ''; p.classList.remove('bien'); } }, ms);
  }
  function enlaceActual() { return enlaceDeLook(location.href, estado, $('nombre').value.trim(), lemaActual()); }
  function mostrarEnlace(url) { $('compartir').classList.add('mostrarEnlace'); const i = $('enlaceTexto'); i.value = url; i.focus(); i.select(); }
  $('enlaceSeleccionar').onclick = () => { const i = $('enlaceTexto'); i.focus(); i.select(); try { i.setSelectionRange(0, i.value.length); } catch {} };
  async function copiarTexto(texto) { try { await navigator.clipboard.writeText(texto); return true; } catch { return false; } }
  $('copiarEnlace').onclick = async () => {
    const url = enlaceActual(), nombre = $('nombre').value.trim() || nombreSugerido();
    if (navigator.share) {
      try { await navigator.share({ title: `Mira a ${nombre}`, text: 'Te mando mi personaje. Ábrelo y cámbialo a tu gusto.', url }); estadoCompartir('Enlace compartido.', true); sonar('racha', { nivel: 1 }); contar('compartir/enlace'); return; }
      catch (e) { if (e?.name === 'AbortError') return; }     // cerró la hoja del sistema: no es un error
    }
    if (await copiarTexto(url)) { estadoCompartir('Enlace copiado. Pégalo donde quieras.', true); reaccionar('guardar'); sonar('racha', { nivel: 1 }); contar('compartir/enlace'); return; }
    contar('compartir/enlace');
    mostrarEnlace(url); estadoCompartir('No se pudo copiar solo. Selecciona el enlace y cópialo.', false, 8000);
  };
  $('exportar').onclick = () => {
    contar('compartir/json');
    const nombre = $('nombre').value.trim() || nombreSugerido(), archivo = 'personaje-' + nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json';
    try {
      const blob = new Blob([exportarJson(estado, $('nombre').value.trim(), lemaActual())], { type: 'application/json' }), url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = archivo; document.body.append(a); a.click(); a.remove(); esperar(() => URL.revokeObjectURL(url), 2000);
      aviso(`Archivo «${archivo}» listo.`); sonar('racha', { nivel: 1 });
    } catch { aviso('No se pudo crear el archivo. Prueba con «Copiar enlace».'); sonarError(); }
  };
  function aviso(texto, ms = 4000) { const a = $('aviso'); a.textContent = texto; clearTimeout(aviso.t); aviso.t = esperar(() => { if (a.textContent === texto) a.textContent = ''; }, ms); }
  function importarTexto(texto) {
    const r = importarJson(texto, validarLook, OPCIONES_LOOK);
    if (!r.ok) { contar('error/look-invalido'); aviso(r.motivo, 7000); sonarError(); return; }
    cambiar('cargar', () => Object.assign(estado, r.estado)); lookCargado = null; fondoSucio = true; if (!reducido) entrada = 1; pintar(); construirAjustes(); refrescarJson(); prepararGuardar();
    if (r.nombre) { $('nombre').value = r.nombre; contarNombre(); }
    if (r.lema) { $('lema').value = r.lema; contarLema(); pintarTap(); }
    $('pegarImportar').value = ''; aviso('Personaje importado. Ya está en la vista; puedes ajustarlo o guardarlo.');
    $('paso').scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  }
  $('importarPegado').onclick = () => importarTexto($('pegarImportar').value);
  $('archivoImportar').addEventListener('change', async ev => {
    const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return;
    if (f.size > 64 * 1024) { aviso('Ese archivo es demasiado grande para ser un personaje.', 7000); return; }
    try { importarTexto(await f.text()); } catch { aviso('No se pudo leer el archivo.', 7000); sonarError(); }
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
      Object.assign(estado, { base: r.estado.base, look: { ...r.estado.look }, item: r.estado.item, world: r.estado.world, hora: horaValida(r.estado.hora) });
      if (r.nombre) { $('nombre').value = r.nombre; contarNombre(); }
      $('lema').value = r.lema || ''; contarLema();
      fondoSucio = true; escenasSucias = true; marcarPreset(); irA(1); pintar(); decir(r.lema || (r.nombre ? frases.saludo(r.nombre) : frases.frase('cargar', estado.base))); if (!reducido) animar('celebrate', 1.2);
      programarAutoguardado();
    };
    $('recibidoGuardar').onclick = () => {
      const g = guardarLook(misLooks, r.estado, { nombre: r.nombre || quien, lema: r.lema, miniatura: (() => { try { return miniatura(r.estado.look, 72, 96, 1).toDataURL('image/png'); } catch { return ''; } })() });
      if (g.lleno) { $('recibidoEstado').textContent = `Ya tienes ${MAX_LOOKS} looks guardados, el máximo. Pruébalo y borra uno de «Mis looks» para guardarlo.`; return; }
      if (!almacen.escribir(CLAVE_LOOKS, serializarLooks(g.lista))) { $('recibidoEstado').textContent = 'No se pudo guardar en este navegador. Pruébalo y descarga su archivo desde «Más».'; return; }
      misLooks = g.lista; cerrar(); estadoGuardado(`«${g.look.nombre}» está en Mis looks.`, true, 6000); pintarMisLooks();
      if (!ofrecerContinuar()) { irA(3); if (!reducido) animar('celebrate', 1.2); }
    };
    $('recibidoNo').onclick = () => { cerrar(); if (!ofrecerContinuar()) { if (!reducido) animar('celebrate', 1.2); decir(frases.saludo(theme.characters.grabador.name)); } };
    return true;
  }
  // Enlace roto: el personaje pone cara de «uy» en la vista y, sobre las tarjetas, una línea con «Hacer el mío» (vuelve al diseñador normal).
  function estadoRecibidoInvalido(motivo) {
    $('titulo').textContent = 'Ese enlace no se pudo abrir';
    decir('Haz el tuyo, mejor.'); animar('hurt', 2.2);
    const caja = document.createElement('div'); caja.className = 'aviso-enlace'; caja.id = 'avisoEnlace'; caja.setAttribute('role', 'status');
    const p = document.createElement('p'); p.className = 'texto'; p.textContent = `${motivo} Pídele a quien te lo mandó que lo copie otra vez, o haz tu propio personaje aquí.`;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'hacerElMio'; b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-lapiz"/></svg>Hacer el mío';
    b.onclick = () => { caja.remove(); $('titulo').textContent = TITULOS[0]; sonar('toque', { vol: GANANCIA_BAJA }); $('presets').querySelector('.tarjeta')?.focus(); if (!reducido) animar('celebrate', 1.2); decir(frases.saludo(theme.characters[estado.base]?.name ?? 'yo')); };
    caja.append(p, b); $('presets').before(caja);
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
      Object.assign(estado, { base: b.base, look: { ...b.look }, item: b.item, world: b.world, hora: horaValida(b.hora) });
      $('lema').value = b.lema || ''; contarLema();
      fondoSucio = true; escenasSucias = true; marcarPreset(); irA(b.paso); pintar(); decir(frases.frase('cargar', estado.base)); if (!reducido) animar('celebrate', 1.2);
      chipHito('vuelve', conNombre(COPY_HITOS.vuelve.texto, nombre));         // segunda visita (§2); si el paso ya enseñó otro aviso, este espera
    };
    $('continuarNo').onclick = () => { $('continuar').hidden = true; borradorActual = null; almacen.quitar(CLAVE_BORRADOR); programarAutoguardado(); };
    return true;
  }

  // ───────────────────────── vista previa: reacciones, bocadillo, comparar ─────────────────────────
  let anim = 'idle', animT = 0, animFin = 0, animOpciones = {}, entrada = 0, temporizadorQuieto = 0;
  function animar(nombre, dur, o = {}) {
    if (reducido) { anim = QUIETA[nombre] ?? QUIETA_REACCION[nombre] ?? 'still'; pintar(); clearTimeout(temporizadorQuieto); temporizadorQuieto = esperar(() => { anim = 'still'; pintar(); }, dur * 1000); return; }
    anim = nombre; animT = 0; animFin = dur; animOpciones = o;
  }
  /** Pose objetivo: una reacción de pieza (themes/epoca/reacciones.js) o una animación del rig. */
  function poseDe(nombre, t, Tr) { const r = REACCIONES[nombre]; return r ? r.pose(t, Tr, animOpciones) : poseFor(nombre, t, Tr); }
  // Reacción por pieza (PR-D4, §4): sombrero, peinado, prenda, color, objeto, gafas y barba tienen la suya; lo demás usa la tabla
  // de siempre. La frase sale de frases.js en la voz del punto de partida; gafas y barba tienen frases propias.
  function reaccionar(tipo, detalle = {}) {
    const propia = reaccionDe(tipo, detalle);
    if (propia) animar(...propia); else { const [a, d] = REACCION[tipo] ?? ['talk', 0.8]; animar(a, d); }
    if (tipo === 'preset') return;
    const tipoFrase = detalle.campo === 'glasses' ? 'gafas' : detalle.campo === 'beard' ? 'barba' : tipo;
    decir(frases.frase(tipoFrase, estado.base, estado.world));
  }
  let temporizadorBocadillo = 0;
  function decir(texto) {
    const b = $('bocadillo'); b.setAttribute('aria-live', performance.now() - arrastreColor < 700 ? 'off' : 'polite');
    b.textContent = texto; b.classList.add('ver'); clearTimeout(temporizadorBocadillo);
    temporizadorBocadillo = esperar(() => b.classList.remove('ver'), 1500);
  }
  // mantener presionado la vista para ver cómo estaba antes del último cambio
  let comparando = false, temporizadorComparar = 0;
  const vista = $('vista');
  // Comparar = mantener 220 ms SIN mover (si el dedo se desplaza > 8 px se cancela y la página se desplaza: la vista deja pasar
  // el scroll vertical con touch-action: pan-y, por eso no se llama preventDefault aquí).
  let origenX = 0, origenY = 0;
  vista.addEventListener('pointerdown', e => { if (!historial.length || e.button > 0) return; origenX = e.clientX; origenY = e.clientY; clearTimeout(temporizadorComparar); temporizadorComparar = esperar(() => { comparando = true; vista.classList.add('comparando'); fondoSucio = true; pintar(); }, 220); });
  const soltar = () => { clearTimeout(temporizadorComparar); temporizadorComparar = 0; if (comparando) { comparando = false; vista.classList.remove('comparando'); fondoSucio = true; pintar(); } };
  vista.addEventListener('pointermove', e => { if (!temporizadorComparar && !comparando) return; if (Math.hypot(e.clientX - origenX, e.clientY - origenY) > 8) soltar(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) vista.addEventListener(ev, soltar);
  vista.addEventListener('contextmenu', e => e.preventDefault());

  // ───────────────────────── pintura: solo al cambiar o animar; pausa con la pestaña oculta ─────────────────────────
  const lienzo = $('lienzo'), ctx = lienzo.getContext('2d');
  let w = 0, h = 0, dpr = 1, fondo = null, fondoSucio = true, pose = null, T = 0, ultimo = 0, parpadeo = 2.5, parpadeoT = 0, parpadeoPose = false, corriendo = false;
  // Cámara por pestaña (PR-D4, §4): Cara/Pelo acercan a la cabeza (×1,9), Ropa plano medio (×1,25), Objeto la mano derecha (×1,6),
  // lo demás plano general. El destino se resuelve en cada cuadro (sigue al tamaño de la vista); el origen es una foto de la
  // cámara al cambiar, y se interpola 350 ms con ease-out. Con movimiento reducido no hay bucle: el corte es directo.
  let encuadre = encuadreDe(0, 'cara'), camara = null, camaraOrigen = null, camaraT = 1;
  function encuadrar() {
    const nuevo = encuadreDe(pantalla, pestana);
    if (nuevo === encuadre) return;
    encuadre = nuevo; camaraOrigen = camara; camaraT = reducido || !camaraOrigen ? 1 : 0;
    if (pantalla === 1) contar('encuadre/' + pestana);
    pintar();
  }
  function camaraDe(enc, s, cy) {
    if (!enc.ancla) return { zoom: 1, fx: w / 2, fy: h / 2 };
    const P = poseFor('still'), [ux, uy] = focoDe(enc.ancla, P);
    return { zoom: enc.zoom, fx: w / 2 + (ux + P.x) * s, fy: cy + (uy + P.y) * s };
  }
  function medir() {
    const r = vista.getBoundingClientRect(); const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height)), nd = Math.min(2, devicePixelRatio || 1);
    if (nw === w && nh === h && nd === dpr) return false;
    w = nw; h = nh; dpr = nd; lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr); fondoSucio = true; return true;
  }
  function bg(world, hora = HORA_DEFECTO) {
    if (fondo && !fondoSucio && fondo.world === world && fondo.hora === hora) return fondo.c;
    const c = document.createElement('canvas'); c.width = lienzo.width; c.height = lienzo.height; const g = c.getContext('2d'); g.scale(dpr, dpr);
    paintWorld(g, w, h, world, {}, null, 1, hora); fondo = { world, hora, c }; fondoSucio = false; return c;
  }
  function cuadro(ahora) {
    if (!corriendo) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000) || 0; ultimo = ahora;
    T += dt; animT += dt;
    if (anim !== 'idle' && animT >= animFin) { anim = 'idle'; animT = 0; }
    if (entrada > 0) entrada = Math.max(0, entrada - dt * 2.4);
    parpadeo -= dt; if (parpadeo <= 0) { parpadeoT = 0.12; parpadeo = 2.4 + Math.random() * 2.4; } if (parpadeoT > 0) parpadeoT -= dt;
    if (camaraT < 1) camaraT = Math.min(1, camaraT + dt * 1000 / CAMARA_MS);
    const objetivo = poseDe(anim, animT, T); parpadeoPose = objetivo.parpadeo === true;   // la reacción «color» pide un parpadeo doble
    pose = blendPose(pose, objetivo, 1 - Math.exp(-dt * 16));
    vigilarFps(ahora, dt);
    particulas.paso(dt);
    dibujar();
    requestAnimationFrame(cuadro);
  }
  // `fps-bajo`: menos de 30 fps durante 2 s seguidos mientras hay una animación (no en idle, no al volver de una pestaña oculta).
  let lentoDesde = 0;
  function vigilarFps(ahora, dt) {
    if (anim === 'idle' || dt <= 0 || dt >= 0.05) { lentoDesde = 0; return; }     // dt tope = 0.05 → un salto (pestaña oculta), no un tirón
    if (dt <= 1 / 30) { lentoDesde = 0; return; }
    if (!lentoDesde) lentoDesde = ahora;
    else if (ahora - lentoDesde >= 2000) { lentoDesde = 0; contar('fps-bajo'); particulas.degradar(); }   // gama baja: la mitad de partículas y sin brillo
  }
  function dibujar() {
    medir();
    const E = comparando && historial.length ? historial[historial.length - 1] : estado;
    if (reducido || !pose) pose = blendPose(null, poseDe(anim, 0, 0), 1);
    const s = Math.min(w / 540 * 1.15, h * 0.8 / 372), pies = h * 0.9, cy = pies - 112 * s, a = 1 - entrada;
    const destino = camaraDe(encuadre, s, cy);
    camara = camaraT < 1 && camaraOrigen ? mezclarCamara(camaraOrigen, destino, camaraT) : destino;
    // Todo (fondo, ambiente, sombra y personaje) pasa por la cámara: el punto de foco cae en el centro de la vista con su zoom.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(w / 2, h / 2); ctx.scale(camara.zoom, camara.zoom); ctx.translate(-camara.fx, -camara.fy);
    ctx.drawImage(bg(E.world, horaValida(E.hora)), 0, 0, w, h);
    if (!reducido) paintAmbient(ctx, w, h, E.world, T);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,7,16,.32)'; ctx.beginPath(); ctx.ellipse(w / 2, pies + 6 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    drawHost(ctx, w / 2, cy + entrada * 40 * s, s, pose, lookOf({ look: E.look }), { item: E.item, blink: parpadeoT > 0 || parpadeoPose, T });
    ctx.restore();
    // Partículas (PR-D5) fuera de la cámara, en píxeles de la vista: siempre arriba del personaje.
    if (particulas.vivas()) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); particulas.dibujar(ctx); }
  }
  function pintar() { if (reducido || !corriendo) dibujar(); }   // con animación, el bucle ya repinta en el próximo cuadro
  function arrancar() { if (reducido || corriendo || document.hidden) return; corriendo = true; ultimo = performance.now(); requestAnimationFrame(cuadro); }
  function parar() { corriendo = false; }
  escuchar(document, 'visibilitychange', () => { if (document.hidden) parar(); else { arrancar(); pintar(); } });
  const observador = new ResizeObserver(() => { if (medir()) pintar(); }); observador.observe(vista);

  // ───────────────────────── sonido (audio/sonido.js, paleta «epoca» de audio/efectos.js; disenador-v2-plan.md §3) ─────────────────────────
  // Nada suena antes del primer gesto dentro del diseñador (pointerup, click o tecla; nunca pointerdown ni touchstart): ahí se
  // crea el AudioContext y se sintetizan los efectos en reposo. Interruptor: altavoz de la barra y tecla M. En disenador.html se
  // recuerda en CLAVE_SONIDO; en /crear la web pasa `opciones.sonido` enlazado al silencio general del feed (una sola llave).
  // Con movimiento reducido no se silencia, pero caen los glisandos y el ambiente del mundo (quedan los toques secos). Sin Web
  // Audio nada cambia en la interfaz. Cada sonido tiene su equivalente visual (reacción, bocadillo o estado).
  const sonido = crearSonido();
  const sonidoEnlace = opciones.sonido ?? null;
  let sonidoActivo = sonidoEnlace ? sonidoEnlace.activo() !== false : almacen.leer(CLAVE_SONIDO) !== 'off';
  let huboGesto = false;
  sonido.silenciar(!sonidoActivo);
  const btnSonido = $('sonido');
  function pintarSonido() {
    btnSonido.setAttribute('aria-pressed', String(sonidoActivo)); btnSonido.classList.toggle('off', !sonidoActivo);
    btnSonido.setAttribute('aria-label', sonidoActivo ? 'Sonido activado. Silenciar (tecla M)' : 'Sonido apagado. Activar (tecla M)');
    btnSonido.title = sonidoActivo ? 'Silenciar (M)' : 'Sonido (M)';
  }
  pintarSonido();
  const PRECALENTAR = [['toque'], ['pieza', { indice: 0, total: 8 }], ['color', { luminancia: 0.5 }], ['blip'], ['aparece'], ['baraja'], ['deslizar', { inverso: true }], ['logro'], ['guardar'], ['acierto'], ['fallo'], ['racha', { nivel: 1 }]];
  let precalentado = false;
  function gesto() {                            // dentro de un gesto válido: crea o reanuda el audio; la primera vez precalienta
    huboGesto = true;
    if (!sonidoActivo || !sonido.desbloquear()) return;
    if (!precalentado) { precalentado = true; sonido.precalentar(PALETA_SONIDO, { paleta: PALETA_SONIDO, lista: PRECALENTAR }); }
  }
  for (const ev of ['pointerup', 'click', 'keydown']) escuchar(raiz, ev, gesto);
  function sonar(nombre, o = {}) {
    if (!sonidoActivo || !huboGesto) return false;
    if (!sonido.contexto) gesto();            // el gesto llegó por otro camino (p. ej. submit con Enter): sigue siendo un gesto
    try { return sonido.tocar(nombre, { paleta: PALETA_SONIDO, ...o }); } catch { return false; }
  }
  function sonarError() { sonar('fallo', { vol: GANANCIA_ERROR }); }
  /** Tabla evento → efecto de §3: color por luminancia (tope CADA_COLOR_MS), pieza por índice, lo demás por tipo. */
  function sonarCambio(tipo, d = {}) {
    if (d.color) return sonar('color', { luminancia: luminancia(d.color), vol: GANANCIA_BAJA, cadaMs: CADA_COLOR_MS });
    if (d.indice !== undefined) return sonar('pieza', { indice: d.indice, total: d.total, vol: GANANCIA_BAJA });
    if (tipo === 'sugerencia') return sonar('pieza', { indice: 4, total: 8, vol: GANANCIA_BAJA });
    if (tipo === 'hora') return sonar('pieza', { indice: HORAS.indexOf(estado.hora), total: HORAS.length, vol: GANANCIA_BAJA });
    if (tipo === 'sorpresa') return sonar(reducido ? 'toque' : 'baraja');
    if (tipo === 'deshacer') return sonar(reducido ? 'toque' : 'deslizar', { inverso: true, vol: 0.6 });
    if (tipo === 'world') { if (reducido) return sonar('toque'); sonar('aparece'); return sonar('ambiente', { mundo: estado.world, vol: 0.45 }); }
    return sonar(reducido ? 'toque' : 'aparece');   // preset, cargar
  }
  function alternarSonido() {
    sonidoActivo = !sonidoActivo;
    if (sonidoEnlace) { try { sonidoEnlace.cambiar(sonidoActivo); } catch { /* la página decide */ } } else almacen.escribir(CLAVE_SONIDO, sonidoActivo ? 'on' : 'off');
    sonido.silenciar(!sonidoActivo); pintarSonido();
    contar('sonido/' + (sonidoActivo ? 'on' : 'off'));
    if (sonidoActivo) { gesto(); sonar('toque'); }
  }
  btnSonido.onclick = alternarSonido;
  escuchar(raiz, 'keydown', e => {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '')) return;
    e.preventDefault(); alternarSonido();
  });
  escuchar(document, 'visibilitychange', () => { if (document.hidden) sonido.pausar(); else sonido.reanudar(); });

  // ───────────────────────── hitos de cuenta (themes/epoca/hitos.js; disenador-v2-plan.md §2, PR-D2) ─────────────────────────
  // La cuenta se menciona cuando el personaje ya vale algo para quien lo hizo: una ventaja concreta por hito, en una línea, con
  // un icono dibujado, y siempre se puede ignorar con un botón normal. Solo en /crear (`opciones.cuenta.abrir` abre la hoja de
  // «Publicar»); en disenador.html no hay cuenta que ofrecer y nada de esto aparece (los `hito/*` sí se cuentan: miden la
  // inversión). El árbitro es hitos.js (una vez por sesión, nunca dos avisos en < 45 s, «Soy estudiante» apaga todo); aquí
  // solo se pinta. Ningún aviso suena: el silencio dice que es información, no juego. Los botones viven en los propios nodos y
  // se van con ellos: ningún oyente queda colgado.
  let sesionNativa = null; try { sesionNativa = window.sessionStorage; } catch { sesionNativa = null; }
  const hitos = crearHitos({ sesion: sesionNativa, estudiante: () => esEstudiante(storageNativo) });
  const conCuenta = typeof opciones.cuenta?.abrir === 'function';
  function nombreActual() { return $('nombre').value.trim() || nombreSugerido(); }
  /** Lo que la página recibe al tocar «Publicar» o un aviso de cuenta: borrador guardado en el acto, enlace, nombre y miniatura; nada viaja desde aquí. */
  function contextoCuenta(hito, accion) {
    let borradorId = null;
    try { if (almacen.disponible) { guardarBorradorAhora(); borradorId = borradorActual?.borradorId ?? null; } } catch { borradorId = null; }
    return { borradorId, enlace: enlaceActual(), nombre: nombreActual(), miniatura: pngMiniatura(), hito, accion };
  }
  /** «Qué es la cuenta» o «Publicar (con cuenta)» desde un hito: la MISMA hoja del gancho; `accion` dice si fue un intento de publicar. */
  function abrirCuenta(hito, accion) {
    contar('hito-cuenta/abrir/' + hito);
    try { opciones.cuenta.abrir(contextoCuenta(hito, accion)); } catch { /* la página decide */ }
  }
  /** El hito se alcanzó (se cuenta siempre); devuelve si ahora mismo se podría enseñar su aviso. */
  function alcanzar(nombre) { contar('hito/' + nombre); return conCuenta && hitos.puede(nombre); }
  /** Consume el hito en la sesión y cuenta el aviso como visto. */
  function ensenar(nombre, o) { if (!hitos.mostrar(nombre, o)) return false; contar('hito-cuenta/visto/' + nombre); return true; }
  function botonHito(texto, fn, primario = false) { const b = document.createElement('button'); b.type = 'button'; b.textContent = texto; if (primario) b.className = 'primario'; b.onclick = fn; return b; }
  /** Chip bajo la vista (la ranura de los avisos): icono, una línea, «Entendido» y «Qué es la cuenta». Se va al cerrarlo o al cambiar de paso. */
  function chipHito(nombre, texto) {
    if (!alcanzar(nombre)) return false;
    const ranura = $('ranuraVista');
    if ([...ranura.children].some(e => !e.classList.contains('hito') && !e.hidden)) return false;   // la cinta de la página sigue ahí: nunca dos avisos a la vez
    if (!ensenar(nombre)) return false;
    const c = COPY_HITOS[nombre];
    const chip = document.createElement('div'); chip.className = 'cinta hito'; chip.setAttribute('role', 'status'); chip.dataset.hito = nombre;
    chip.innerHTML = icono(c.icono);
    const p = document.createElement('p'); p.textContent = texto;
    const botones = document.createElement('div'); botones.className = 'botones';
    botones.append(botonHito(ENTENDIDO, () => { contar('hito-cuenta/entendido/' + nombre); chip.remove(); }, true), botonHito(QUE_ES, () => abrirCuenta(nombre, 'cuenta')));
    chip.append(p, botones); ranura.append(chip);
    return true;
  }
  /** Miniatura 9:16 de un Tap dibujado (enunciado y opciones como barras) con este personaje de anfitrión. */
  function miniaturaTap(w = 54, h = 96, r = Math.min(2, devicePixelRatio || 1)) {
    const c = document.createElement('canvas'); c.width = w * r; c.height = h * r; c.className = 'tap'; c.setAttribute('aria-hidden', 'true');
    const g = c.getContext('2d'); g.scale(r, r);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#2a2640'); grad.addColorStop(1, '#15131f'); g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(236,235,245,.28)'; g.fillRect(8, 9, 34, 3); g.fillRect(8, 15, 24, 3);
    g.fillStyle = 'rgba(211,178,122,.85)'; for (const y of [70, 79, 88]) g.fillRect(7, y, w - 14, 5);
    const s = h * 0.46 / 372; drawHost(g, w / 2, h * 0.64 - 112 * s, s, poseFor('still'), lookOf({ look: estado.look }), { item: estado.item, T: 0 });
    return c;
  }
  /** Listo: bloque «Lo que puedes hacer con X» con tres tarjetas; la tercera es la cuenta, con la miniatura de un Tap. Es contenido del paso, no un aviso. */
  function bloqueListo() {
    const caja = $('queHacer'); caja.hidden = true; caja.replaceChildren(); $('pronto').hidden = false;
    alcanzar('listo');
    if (!conCuenta || hitos.apagado) return;
    if (!hitos.visto('listo') && !ensenar('listo', { sinEspera: true })) return;
    const c = COPY_HITOS.listo;
    const h = document.createElement('h3'); h.id = 'queHacerTitulo'; h.textContent = conNombre(c.titulo, nombreActual());
    const fila = document.createElement('div'); fila.className = 'tarjetas';
    const ir = (id, foco) => { sonar('toque', { vol: GANANCIA_BAJA }); $(id).scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }); $(foco).focus({ preventScroll: true }); };
    const ACCION = { guardar: () => ir('formGuardar', 'nombre'), compartir: () => ir('compartir', 'copiarEnlace'), publicar: () => abrirCuenta('listo', 'publicar') };
    for (const t of c.tarjetas) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tarjeta' + (t.id === 'publicar' ? ' cuenta' : ''); b.dataset.id = t.id;
      if (t.id === 'publicar') b.append(miniaturaTap()); else b.innerHTML = `<span class="dado">${icono(t.icono)}</span>`;
      b.append(Object.assign(document.createElement('b'), { textContent: t.texto }), Object.assign(document.createElement('small'), { textContent: t.detalle }));
      b.onclick = ACCION[t.id]; fila.append(b);
    }
    caja.append(h, fila); caja.hidden = false; $('pronto').hidden = true;
  }
  /** Tras guardar: una línea bajo Mis looks con «Qué es la cuenta». */
  function lineaGuardado() {
    if (!alcanzar('guardado') || !ensenar('guardado')) return;
    const p = $('misLooksCuenta'), c = COPY_HITOS.guardado;
    p.innerHTML = icono(c.icono); p.append(Object.assign(document.createElement('span'), { textContent: c.texto }), botonHito(QUE_ES, () => abrirCuenta('guardado', 'cuenta')));
    p.hidden = false;
  }
  /** Tras el veredicto de la pregunta de muestra: «Así lo verían tus estudiantes…» y «Publicar (con cuenta)». */
  function ctaProbado() {
    if (!alcanzar('probado') || !ensenar('probado')) return;
    const d = $('probadoCuenta'), c = COPY_HITOS.probado;
    d.replaceChildren(Object.assign(document.createElement('p'), { className: 'texto', textContent: c.texto }), botonHito(PUBLICAR, () => abrirCuenta('probado', 'publicar'), true));
    d.hidden = false;
  }
  /** Al cambiar de paso: ningún aviso de cuenta viaja con la persona (el bloque de Listo se rehace al entrar). */
  function limpiarHitos() {
    $('ranuraVista').querySelectorAll('.hito').forEach(e => e.remove());
    for (const id of ['misLooksCuenta', 'probadoCuenta']) { $(id).hidden = true; $(id).replaceChildren(); }
  }
  function apagarHitos() { limpiarHitos(); const caja = $('queHacer'); caja.hidden = true; caja.replaceChildren(); $('pronto').hidden = false; }

  // ───────────────────────── arranque ─────────────────────────
  construirPresets(); construirPestanas(); construirReacciones(); irA(0);
  medir(); arrancar(); pintar();
  const conEnlace = ofrecerRecibido(), conBorrador = !conEnlace && ofrecerContinuar();
  if (!conEnlace && !conBorrador) { if (!reducido) animar('celebrate', 1.2); decir(frases.saludo(theme.characters.grabador.name)); }
  contar('abrir/' + (conEnlace ? 'enlace' : conBorrador ? 'continuar' : 'directo'));
  // Al irse: en qué paso estaba y cuántos segundos llevaba (redondeados a 10). Si ya guardó, no es abandono.
  function abandonar() { if (abandonado) return; abandonado = true; if (!medidor.registro.includes('listo')) contar(nombreAbandono(pantalla, performance.now() - abierto)); bombear(); }
  let abandonado = false;
  escuchar(window, 'pagehide', abandonar);

  return {
    ok: true,
    /** Secuencia de eventos aceptados (nombres cortos), para depurar y probar. */
    registro: medidor.registro,
    /** La página eligió «Soy estudiante»: quita los avisos de cuenta que estén a la vista (los siguientes ya no salen: hitos.js lee la clave). */
    apagarHitos,
    /** Deja la página como estaba: quita oyentes, para el bucle de pintura, guarda el borrador y cuenta el abandono si no guardó. */
    destruir() {
      if (temporizadorGuardado) guardarBorradorAhora();
      abandonar(); parar(); observador.disconnect();
      try { sonido.destruir(); } catch { /* ya cerrado */ }
      for (const [t, ev, fn] of oyentes) t.removeEventListener(ev, fn);
      oyentes.length = 0;
      for (const t of temporizadores) clearTimeout(t);
      temporizadores.clear();
      try { if (window.tapsMedicion?.registro === medidor.registro) delete window.tapsMedicion; } catch { /* window congelado: da igual */ }
      raiz.replaceChildren();
    },
  };
}
