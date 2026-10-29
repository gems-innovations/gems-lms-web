// Hitos de cuenta del diseñador «época» (PR-D2, producto/taps/disenador-v2-plan.md §2): cuándo se puede decir UNA cosa
// sobre la cuenta y cuándo no. Módulo puro: no toca window ni el DOM; recibe el reloj y los almacenes. La cuenta se
// menciona cuando el personaje ya vale algo para quien lo hizo, una ventaja concreta por hito, en una línea, sin culpa,
// sin reloj ni «solo hoy», siempre con una salida normal («Entendido»). Reglas:
// - Cada hito se enseña una vez por sesión del navegador (sessionStorage).
// - Nunca dos avisos en menos de MIN_ENTRE_AVISOS_MS: el que llega antes se salta (no se consume: puede volver después).
// - Quien eligió «Soy estudiante» una vez no vuelve a ver avisos de cuenta en ese navegador (CLAVE_ESTUDIANTE): a menores no se insiste.

/** Los cinco hitos, en el orden en que suelen ocurrir. */
export const HITOS = Object.freeze(['navegador', 'listo', 'guardado', 'probado', 'vuelve']);
/** Mínimo entre dos avisos de cuenta (ms). */
export const MIN_ENTRE_AVISOS_MS = 45_000;
/** localStorage: '1' si la persona eligió «Soy estudiante» en la hoja de publicar (la escribe /crear; la lee este módulo). */
export const CLAVE_ESTUDIANTE = 'taps.crear.es-estudiante';
/** sessionStorage: hitos ya enseñados en esta sesión y cuándo fue el último (JSON `{ vistos: [], ultimo: ms }`). */
export const CLAVE_SESION = 'taps.disenador.hitos';
/** Texto para los botones de los avisos: salida normal, con texto normal. */
export const ENTENDIDO = 'Entendido';
export const QUE_ES = 'Qué es la cuenta';
export const PUBLICAR = 'Publicar (con cuenta)';

/**
 * Copy de §2, afirmativo y verificable. `{nombre}` se sustituye por el nombre del personaje. Prohibido aquí: «no pierdas»,
 * «última oportunidad», contadores, «solo hoy». La frase «Si lo borras o cambias de celular, se pierde» la aceptó el dueño
 * (26-oct-2026) porque describe un hecho, no una amenaza.
 */
export const COPY_HITOS = Object.freeze({
  navegador: Object.freeze({ texto: 'Este personaje vive en este navegador. Con cuenta lo tienes en todos tus dispositivos.', icono: 'i-dispositivos', botones: [ENTENDIDO, QUE_ES] }),
  listo: Object.freeze({
    titulo: 'Lo que puedes hacer con {nombre}',
    tarjetas: Object.freeze([
      Object.freeze({ id: 'guardar', texto: 'Guardar aquí', detalle: 'En este navegador', icono: 'i-guardar' }),
      Object.freeze({ id: 'compartir', texto: 'Compartir enlace', detalle: 'Sin cuenta', icono: 'i-enlace' }),
      Object.freeze({ id: 'publicar', texto: 'Publicar un Tap (con cuenta)', detalle: 'Con enlace y código para jugarlo', icono: 'i-cuenta' }),
    ]),
  }),
  guardado: Object.freeze({ texto: 'Guardado en este navegador. Si lo borras o cambias de celular, se pierde. Con cuenta no.', icono: 'i-guardar', botones: [QUE_ES] }),
  probado: Object.freeze({ texto: 'Así lo vería quien lo juegue. ¿Quieres hacer el Tap completo?', icono: 'i-jugar', botones: [PUBLICAR] }),
  vuelve: Object.freeze({ texto: 'Volviste por {nombre}. Con cuenta no dependes de este navegador.', icono: 'i-dispositivos', botones: [ENTENDIDO, QUE_ES] }),
});

/** Sustituye `{nombre}` (el nombre viene de la persona: va como texto, nunca como HTML). */
export function conNombre(plantilla, nombre) {
  return String(plantilla).replaceAll('{nombre}', String(nombre ?? '').trim() || 'tu personaje');
}

/** Si en este navegador se eligió «Soy estudiante» (con el almacén roto: no). */
export function esEstudiante(storage) {
  try { return storage?.getItem(CLAVE_ESTUDIANTE) === '1'; } catch { return false; }
}

function leerSesion(sesion) {
  try {
    const o = JSON.parse(sesion?.getItem(CLAVE_SESION) ?? 'null');
    if (!o || typeof o !== 'object') return { vistos: [], ultimo: 0 };
    const vistos = Array.isArray(o.vistos) ? o.vistos.filter(h => HITOS.includes(h)) : [];
    const ultimo = Number.isFinite(o.ultimo) && o.ultimo > 0 ? o.ultimo : 0;
    return { vistos, ultimo };
  } catch { return { vistos: [], ultimo: 0 }; }
}

/**
 * Árbitro de la sesión. `ahora()` en ms (Date.now por defecto: sobrevive a recargar dentro de la sesión); `sesion` con la
 * forma de sessionStorage (o null: todo vive en memoria); `estudiante()` dice si los avisos están apagados para siempre.
 * - `puede(hito)`: se podría enseñar ahora (no es estudiante, no se enseñó en la sesión, pasó el mínimo desde el último).
 * - `mostrar(hito, { sinEspera })`: si puede, lo marca como enseñado (una vez por sesión) y como último aviso; devuelve true.
 *   Si no, false y nada cambia. `sinEspera` salta solo el mínimo entre avisos (para contenido fijo de un paso, como el bloque
 *   de Listo, que no interrumpe pero sí arranca el reloj); estudiante y «una vez por sesión» mandan igual.
 * - `visto(hito)`: ya se enseñó en esta sesión.
 */
export function crearHitos({ ahora = Date.now, sesion = null, estudiante = () => false, minimoMs = MIN_ENTRE_AVISOS_MS } = {}) {
  const estado = leerSesion(sesion);
  function guardar() { try { sesion?.setItem(CLAVE_SESION, JSON.stringify(estado)); } catch { /* sin sessionStorage: memoria */ } }
  function apagado() { try { return estudiante() === true; } catch { return false; } }
  function visto(hito) { return estado.vistos.includes(hito); }
  function libre(hito) { return HITOS.includes(hito) && !apagado() && !visto(hito); }
  function puede(hito) {
    if (!libre(hito)) return false;
    const t = ahora();
    return !estado.ultimo || t - estado.ultimo >= minimoMs;
  }
  function mostrar(hito, { sinEspera = false } = {}) {
    if (!(sinEspera ? libre(hito) : puede(hito))) return false;
    estado.vistos.push(hito); estado.ultimo = ahora(); guardar();
    return true;
  }
  return { puede, mostrar, visto, get apagado() { return apagado(); } };
}
