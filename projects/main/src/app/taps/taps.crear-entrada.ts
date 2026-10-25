import { TEventPath } from '../analytics-taxonomy';
import { TOrigenCrear } from './taps.crear';

/**
 * Lógica pura de los puntos de entrada a /crear (PR-7 del plan, producto/taps/disenador-plan-ux.md §A.2): qué enlace lleva
 * cada entrada (con `?desde=` para medir `taps/crear/abrir/<origen>`), los eventos `taps/crear/entrada/*` y la regla del
 * resultado del feed: se ofrece «Haz tu personaje» 1 de cada 5 resultados, nunca tras 0 aciertos, se puede descartar y no
 * se insiste. Sin Angular ni DOM, para probarla sin navegador.
 */

/**
 * Dónde está cada entrada (para `taps/crear/entrada/<entrada>/<accion>`). El menú y el resultado llegan con `desde=feed`.
 * La portada no está: su toque ya se cuenta como puerta de la portada (`portada/opcion/crear`) y la llegada, en `abrir/portada`.
 */
export type TEntradaCrear = 'menu' | 'resultado' | 'instituciones' | 'instructor';

/** Copy de las entradas (§A.2), para personas y sin emojis. */
export const COPY_ENTRADA = {
  portadaTitulo: 'Crea tu personaje y tu Tap',
  portadaLinea: 'Pruébalo sin cuenta. Publicar es para docentes e instituciones.',
  hazTuPersonaje: 'Haz tu personaje',
  resultado: 'Haz tu personaje para Taps',
  descartar: 'No volver a sugerirlo',
  institucionesPerk: 'Taps con tu mascota y tus colores',
  institucionesDetalle: 'Retos de cinco preguntas con un personaje en vivo, con la imagen de tu institución. Cualquiera lo prueba sin cuenta; publicarlos para tu grupo es tuyo.',
  probarCreador: 'Probar el creador',
  instructor: 'Crear un Tap',
} as const;

/** Enlace de una entrada: `/crear?desde=<origen>` (solo lo que /crear lee; el tema del Tap actual llegará cuando el creador lo use). */
export function enlaceCrear(origen: TOrigenCrear): { ruta: string; query: Record<string, string> } {
  return { ruta: '/crear', query: { desde: origen } };
}

/** Evento de una entrada: `mostrado` solo tiene sentido en el resultado (las demás siempre están); `descartado` también. */
export function eventoEntrada(entrada: TEntradaCrear, accion: 'mostrado' | 'clic' | 'descartado'): TEventPath {
  return `taps/crear/entrada/${entrada}/${accion}`;
}

// ───────────── «Haz tu personaje» en el resultado del feed ─────────────

/** localStorage (con try/catch en quien la usa), junto a las claves taps.crear.* de /crear. */
export const CLAVE_ENTRADA_RESULTADO = 'taps.crear.entrada-resultado';
/** 1 de cada 5 resultados (creador.md §1.3). */
export const CADA_RESULTADOS = 5;

export interface IEstadoEntradaResultado {
  /** Resultados vistos en este navegador (cuenta aunque no se ofrezca). */
  n: number;
  /** La persona dijo que no: no se vuelve a ofrecer. */
  descartado: boolean;
}

export function leerEstadoEntrada(raw: string | null | undefined): IEstadoEntradaResultado {
  if (!raw) return { n: 0, descartado: false };
  try {
    const v = JSON.parse(raw) as Partial<IEstadoEntradaResultado>;
    const n = Number(v?.n);
    return { n: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0, descartado: v?.descartado === true };
  } catch { return { n: 0, descartado: false }; }
}

/**
 * Un resultado más. Se ofrece en el 5.º, 10.º, 15.º… resultado, nunca con 0 aciertos (nadie quiere «crear» justo después de
 * fallar todo) y nunca si se descartó. El resultado sin ofrecer no se «debe»: el siguiente turno es el múltiplo de 5 que sigue.
 */
export function registrarResultado(estado: IEstadoEntradaResultado, aciertos: number, total: number): { estado: IEstadoEntradaResultado; ofrecer: boolean } {
  const n = estado.n + 1;
  const ofrecer = !estado.descartado && total > 0 && aciertos > 0 && n % CADA_RESULTADOS === 0;
  return { estado: { n, descartado: estado.descartado }, ofrecer };
}

export function descartarEntrada(estado: IEstadoEntradaResultado): IEstadoEntradaResultado {
  return { n: estado.n, descartado: true };
}
