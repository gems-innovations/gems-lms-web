/**
 * Taxonomía de eventos de GoatCounter (ver producto/retencion/plan-retencion.md).
 *
 * GoatCounter solo guarda un «path» por evento, sin propiedades: las propiedades van como segmentos del path,
 * de lo general a lo particular: `<area>/<accion>[/<detalle>]`, en minúsculas, sin tildes y con guiones.
 * Ejemplos: `llegada/youtube/redstone-1`, `regreso/d1/2026-s42`, `taps/ver/redstone`, `registro/ofrecido/tercer-tap`.
 *
 * Funciones puras (sin Angular) para poder probarlas sin navegador.
 */

/** Eventos con detalle en el path. Los nombres antiguos (`taps-ver`, `cuenta-creada`…) siguen en TAnalyticsEvent. */
export type TEventPath =
  | `llegada/${string}`
  | 'visita/nueva'
  | `regreso/${TReturnBucket}/${string}`
  | `taps/${string}`
  // Portada: qué puerta abre la gente (`portada/opcion/<taps|temas/<tema>|retos|bloques|cursos|instituciones|entrar>`).
  | `portada/${string}`
  | `registro/${string}`
  | `error/${string}`;

export type TReturnBucket = 'd1' | 'd2-6' | 'd7-13' | 'd14-29';

/** Clave que también respeta count.js de GoatCounter (`#toggle-goatcounter`): con 't' no se cuenta nada. */
export const INTERNAL_KEY = 'skipgc';
/** Primera visita y regresos ya contados en este navegador (sin cookies, sin datos personales). */
export const VISIT_KEY = 'gems-visita';
/** La llegada se cuenta una vez por pestaña. */
export const ARRIVAL_KEY = 'gems-llegada';

/** Segmento seguro para el path: minúsculas, sin tildes, solo [a-z0-9-], 40 caracteres como máximo. */
export function eventSlug(value: string | null | undefined): string {
  const slug = (value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/g, '');
  return slug || 'otro';
}

/** `?interno=1` marca el navegador como del equipo (no cuenta), `?interno=0` lo desmarca; null si no viene. */
export function internalFlagFrom(search: string): boolean | null {
  const value = new URLSearchParams(search).get('interno');
  if (value === '1' || value === 'si' || value === 'true') return true;
  if (value === '0' || value === 'no' || value === 'false') return false;
  return null;
}

const REFERRERS: ReadonlyArray<[RegExp, string]> = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(facebook\.com|fb\.com|messenger\.com)$/, 'facebook'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
];

/** Fuente según el dominio del referente; null si es el propio sitio. */
export function referrerSource(referrer: string, ownHost: string): string | null {
  if (!referrer) return 'directo';
  let host: string;
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return 'otro'; }
  if (host === ownHost.toLowerCase() || host.endsWith('.gemsinnovations.com') || host === 'gemsinnovations.com') return null;
  return REFERRERS.find(([re]) => re.test(host))?.[1] ?? 'otro';
}

/**
 * Evento de llegada: `llegada/<fuente>[/<video>]`.
 * Fuente: `utm_source` > dominio del referente > `compartido` (enlace con `?t=`) > `directo`.
 * Video: `utm_content` o `r` (id del Short que usan /retos y /bloques).
 * Devuelve null cuando se navega desde el propio sitio (no es una llegada).
 */
export function arrivalEvent(search: string, referrer: string, ownHost: string): TEventPath | null {
  const q = new URLSearchParams(search);
  const utm = q.get('utm_source');
  let source = utm ? eventSlug(utm) : referrerSource(referrer, ownHost);
  if (source === null) return null;
  if (!utm && q.has('t') && (source === 'directo' || source === 'otro')) source = 'compartido';
  const video = q.get('utm_content') ?? q.get('r');
  return video ? `llegada/${source}/${eventSlug(video)}` : `llegada/${source}`;
}

export interface IVisitState {
  /** Día de la primera visita (AAAA-MM-DD, hora local). */
  primera: string;
  /** Tramos de regreso ya contados. */
  regresos: TReturnBucket[];
}

/** Día local AAAA-MM-DD. */
export function localDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Semana ISO de un día AAAA-MM-DD, como `2026-s42` (la cohorte de la primera visita). */
export function isoWeek(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);           // el jueves de esa semana decide el año
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-s${String(week).padStart(2, '0')}`;
}

function daysBetween(from: string, to: string): number {
  const toUtc = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function returnBucket(days: number): TReturnBucket | null {
  if (days === 1) return 'd1';
  if (days >= 2 && days <= 6) return 'd2-6';
  if (days >= 7 && days <= 13) return 'd7-13';
  if (days >= 14 && days <= 29) return 'd14-29';
  return null;
}

/**
 * Primera visita y regreso (aproximación de D1/D7 sin cookies). Cada tramo se cuenta una sola vez por navegador y
 * lleva la cohorte (semana de la primera visita) en el path: `regreso/d1/2026-s42` / `visita/nueva` de esa semana = D1.
 */
export function visitEvents(today: string, stored: IVisitState | null): { events: TEventPath[]; state: IVisitState } {
  if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored.primera)) {
    return { events: ['visita/nueva'], state: { primera: today, regresos: [] } };
  }
  const bucket = returnBucket(daysBetween(stored.primera, today));
  if (!bucket || stored.regresos.includes(bucket)) return { events: [], state: stored };
  return {
    events: [`regreso/${bucket}/${isoWeek(stored.primera)}`],
    state: { primera: stored.primera, regresos: [...stored.regresos, bucket] },
  };
}

export function parseVisitState(raw: string | null): IVisitState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<IVisitState>;
    return typeof v.primera === 'string' ? { primera: v.primera, regresos: Array.isArray(v.regresos) ? v.regresos : [] } : null;
  } catch { return null; }
}
