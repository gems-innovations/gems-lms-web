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
