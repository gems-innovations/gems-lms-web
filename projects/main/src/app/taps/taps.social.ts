/** Cifras sociales de un Tap (GET /public/taps/sociales). `meGustaYo`: este jugador ya le dio me gusta. */
export interface ITapSocial { vistas: number; meGusta: number; meGustaYo: boolean }

/** Máximo de ids por pedido de GET /public/taps/sociales (lo fija el API). */
export const SOCIALES_MAX = 60;

const entero = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : null);

/**
 * Cifra corta como en TikTok, en español: 999 · «1,2 mil» · «12 mil» · «1,2 M». Se trunca (nunca redondea hacia arriba):
 * 1999 es «1,9 mil», no «2 mil», y 999 999 no llega a «1000 mil».
 */
export function cifraCompacta(n: number): string {
  const v = Math.max(0, Math.floor(n || 0));
  if (v < 1000) return String(v);
  const [div, sufijo] = v < 1_000_000 ? [1000, ' mil'] : [1_000_000, ' M'];
  const d = Math.floor(v / (div / 10)) / 10;
  return (d >= 100 ? String(Math.floor(d)) : String(d).replace('.', ',')) + sufijo;
}

/** Respuesta de GET /public/taps/sociales validada: tapId → cifras. null si no tiene la forma del contrato (el API no está). */
export function leerSociales(r: unknown): Record<string, ITapSocial> | null {
  const taps = (r as { taps?: unknown } | null)?.taps;
  if (!Array.isArray(taps)) return null;
  const out: Record<string, ITapSocial> = {};
  for (const t of taps as Record<string, unknown>[]) {
    const vistas = entero(t?.['vistas']), meGusta = entero(t?.['meGusta']);
    if (typeof t?.['tapId'] !== 'string' || vistas === null || meGusta === null) continue;
    out[t['tapId']] = { vistas, meGusta, meGustaYo: t['meGustaYo'] === true };
  }
  return out;
}

/** Respuesta de POST /public/taps/{tapId}/me-gusta validada, o null. */
export function leerMeGusta(r: unknown, tapId: string): { meGusta: boolean; total: number } | null {
  const o = r as { tapId?: unknown; meGusta?: unknown; total?: unknown } | null;
  const total = entero(o?.total);
  return o?.tapId === tapId && typeof o.meGusta === 'boolean' && total !== null ? { meGusta: o.meGusta, total } : null;
}

/**
 * ¿Se animan las portadas de Explorar? No con movimiento reducido, ahorro de datos o poca memoria (≤ 2 GB): ahí cada
 * tarjeta queda con su portada fija (los colores de su mundo), sin cargar el motor.
 */
export function portadasAnimadas(env: { reducido: boolean; saveData?: boolean; memoria?: number }): boolean {
  return !env.reducido && !env.saveData && !(env.memoria !== undefined && env.memoria <= 2);
}
