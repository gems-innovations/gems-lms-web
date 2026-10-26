import { InjectionToken } from '@angular/core';

/** Función de validación de un look del tema época (`validarLook` de public/taps-engine/themes/epoca/rig.js). */
export type TValidarLook = (look: Record<string, unknown>) => string[];

/** rig.js vive fuera del bundle, como el motor (taps-engine.loader.ts); la query evita una caché vieja. */
export const RIG_URL = '/taps-engine/themes/epoca/rig.js?v=1';

/**
 * Cómo se consigue `validarLook` en el navegador (inyectable para probar sin servir los estáticos). Lo usa el formulario de
 * /instituciones para validar el borrador adjunto (PR-8): el look nunca viaja sin pasar por la misma validación del diseñador.
 */
export const VALIDADOR_LOOK_LOADER = new InjectionToken<() => Promise<TValidarLook>>('VALIDADOR_LOOK_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const url = RIG_URL;
    const m = await (import(/* @vite-ignore */ url) as Promise<{ validarLook: TValidarLook }>);
    return m.validarLook;
  },
});

/** Lo que hace falta de rig.js para pintar un personaje quieto en un lienzo (como `miniatura` de disenador.js). */
export interface IRigPintor {
  lookOf: (character: { look: Record<string, unknown> }) => Record<string, unknown>;
  poseFor: (anim: string, t?: number, T?: number) => unknown;
  drawHost: (c: CanvasRenderingContext2D, x: number, y: number, s: number, P: unknown, L: Record<string, unknown>, o?: { item?: string | null; T?: number }) => void;
}

/**
 * Cómo se consigue el pintor de rig.js (inyectable para probar sin servir los estáticos). Lo usa el panel /solicitudes (PR-9b) para
 * enseñar el personaje adjunto a una solicitud; si no carga, el panel se queda con el texto y las muestras de color.
 */
export const RIG_PINTOR_LOADER = new InjectionToken<() => Promise<IRigPintor>>('RIG_PINTOR_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const url = RIG_URL;
    const m = await (import(/* @vite-ignore */ url) as Promise<IRigPintor>);
    return { lookOf: m.lookOf, poseFor: m.poseFor, drawHost: m.drawHost };
  },
});

/**
 * Pinta un look quieto en el lienzo, con el mismo encuadre que las miniaturas del diseñador (72×96: fondo degradado oscuro y el
 * personaje de pie). Devuelve false si algo falla (sin contexto 2D, look raro): el lienzo queda vacío y no se rompe nada.
 */
export function pintarMiniatura(rig: IRigPintor, canvas: HTMLCanvasElement, look: Record<string, unknown>, item: string | null, escala = 1): boolean {
  try {
    const w = 72, h = 96, r = Math.max(1, Math.min(2, escala));
    canvas.width = w * r; canvas.height = h * r;
    const g = canvas.getContext('2d');
    if (!g) return false;
    g.scale(r, r);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#2a2640'); grad.addColorStop(1, '#15131f');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const s = h * 0.9 / 372;
    rig.drawHost(g, w / 2, h * 0.94 - 112 * s, s, rig.poseFor('still'), rig.lookOf({ look }), { item, T: 0 });
    return true;
  } catch {
    return false;
  }
}
