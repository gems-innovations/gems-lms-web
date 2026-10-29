/**
 * Cifras sociales de un Tap. `vistas`, `meGusta` y `comentarios` son públicas (GET /public/taps/sociales); `meGustaYo` llega
 * solo con sesión (GET /taps/sociales/yo). `comentarios` null: el API no los cuenta (sin botón de comentarios).
 */
export interface ITapSocial { vistas: number; meGusta: number; comentarios: number | null; meGustaYo: boolean }

/** Un comentario (GET /taps/{tapId}/comentarios). `mio`: lo escribió quien tiene la sesión (lo puede borrar). */
export interface ITapComentario { id: string; autor: string; texto: string; creado: string; mio: boolean }

/** Máximo de ids por pedido de las cifras (lo fija el API: más de 60 es 400). */
export const SOCIALES_MAX = 60;
/** Largo máximo de un comentario (el API responde 422 si se pasa o viene vacío). */
export const COMENTARIO_MAX = 200;

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

const filas = (r: unknown): Record<string, unknown>[] | null => {
  const taps = (r as { taps?: unknown } | null)?.taps;
  return Array.isArray(taps) ? (taps as Record<string, unknown>[]).filter(t => typeof t?.['tapId'] === 'string') : null;
};

/** GET /public/taps/sociales validada: tapId → cifras públicas. null si no tiene la forma del contrato (el API no está). */
export function leerSociales(r: unknown): Record<string, Omit<ITapSocial, 'meGustaYo'>> | null {
  const taps = filas(r);
  if (!taps) return null;
  const out: Record<string, Omit<ITapSocial, 'meGustaYo'>> = {};
  for (const t of taps) {
    const vistas = entero(t['vistas']), meGusta = entero(t['meGusta']);
    if (vistas !== null && meGusta !== null) out[t['tapId'] as string] = { vistas, meGusta, comentarios: entero(t['comentarios']) };
  }
  return out;
}

/** GET /taps/sociales/yo validada: tapId → si este usuario le dio me gusta. */
export function leerMios(r: unknown): Record<string, boolean> | null {
  const taps = filas(r);
  return taps ? Object.fromEntries(taps.map(t => [t['tapId'] as string, t['meGustaYo'] === true])) : null;
}

/** PUT /taps/{tapId}/me-gusta validada, o null. */
export function leerMeGusta(r: unknown, tapId: string): { meGusta: boolean; total: number } | null {
  const o = r as { tapId?: unknown; meGusta?: unknown; total?: unknown } | null;
  const total = entero(o?.total);
  return o?.tapId === tapId && typeof o.meGusta === 'boolean' && total !== null ? { meGusta: o.meGusta, total } : null;
}

/** Un comentario del API validado (texto y autor como texto plano: Angular los escapa al pintarlos), o null. */
export function leerComentario(c: unknown): ITapComentario | null {
  const o = c as Record<string, unknown> | null;
  const id = typeof o?.['id'] === 'number' ? String(o['id']) : o?.['id'];
  if (typeof id !== 'string' || typeof o?.['texto'] !== 'string' || typeof o['autor'] !== 'string') return null;
  return { id, autor: o['autor'], texto: o['texto'], creado: typeof o['creado'] === 'string' ? o['creado'] : '', mio: o['mio'] === true };
}

/** Página de comentarios validada: los válidos y el cursor de la siguiente (null: no hay más). null si no es el contrato. */
export function leerComentarios(r: unknown): { comentarios: ITapComentario[]; siguiente: string | null } | null {
  const o = r as { comentarios?: unknown; siguiente?: unknown } | null;
  if (!Array.isArray(o?.comentarios)) return null;
  const sig = o.siguiente;
  return {
    comentarios: o.comentarios.map(leerComentario).filter((c): c is ITapComentario => !!c),
    siguiente: typeof sig === 'string' && sig ? sig : typeof sig === 'number' ? String(sig) : null,
  };
}

/** «hace 3 min», «hace 2 h», «hace 4 d» o la fecha corta; '' si no se entiende. */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (ahora - t) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

/**
 * ¿Se animan las portadas de Explorar? No con movimiento reducido, ahorro de datos o poca memoria (≤ 2 GB): ahí cada
 * tarjeta queda con su portada fija (los colores de su mundo), sin cargar el motor.
 */
export function portadasAnimadas(env: { reducido: boolean; saveData?: boolean; memoria?: number }): boolean {
  return !env.reducido && !env.saveData && !(env.memoria !== undefined && env.memoria <= 2);
}
