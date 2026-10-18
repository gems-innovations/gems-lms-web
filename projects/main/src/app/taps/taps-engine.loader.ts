import { ITapsEngineModule } from './taps.types';

/** Dónde vive el motor: archivos estáticos del mismo origen (public/taps-engine), fuera del bundle de Angular. */
/** Súbelo cuando cambie el motor: los archivos de public/ se cachean un día y esto fuerza la descarga nueva. */
const TAPS_ENGINE_VERSION = '1';
export const TAPS_ENGINE_URL = `/taps-engine/taps-engine.js?v=${TAPS_ENGINE_VERSION}`;
export const tapsThemeUrl = (theme: string): string => `/taps-engine/themes/${theme}/theme.json`;

let loading: Promise<ITapsEngineModule> | null = null;

/**
 * Carga el motor bajo demanda. SOLO en el navegador (usa DOM, WebGL y audio): nunca se llama durante el SSR.
 * El import es por URL (no entra en el bundle), así que el motor y el LMS se despliegan y versionan por separado.
 */
export function loadTapsEngine(): Promise<ITapsEngineModule> {
  const url = TAPS_ENGINE_URL;
  return (loading ??= import(/* @vite-ignore */ url).catch(error => { loading = null; throw error; }) as Promise<ITapsEngineModule>);
}
