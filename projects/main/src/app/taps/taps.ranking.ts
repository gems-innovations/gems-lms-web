/**
 * Rankings de Taps (competencia-y-recompensas.md §4.3-4.5): tipos del contrato con el API y la lógica pura de cómo se
 * muestran. Ranking relativo y amable: percentil, «a 30 XP del puesto 6» y «el 15 % de arriba» en vez de puestos enormes.
 *
 * Contrato (ms-education, rutas públicas):
 * - POST /api/v1/public/taps/partidas → IPartidaRespuesta
 * - GET  /api/v1/public/taps/ranking?periodo=semana|hoy&tema=&jugadorId=&limite=20 → IRanking
 * XP = aciertos × 10 + 20 si el Tap sale perfecto. La semana va de lunes a lunes, hora de Colombia (UTC−5, sin horario de verano).
 */
export type TRankingTema = 'minecraft' | 'logica' | 'cultura' | 'tecnologia';
export type TRankingPeriodo = 'semana' | 'hoy';

/** Los mismos temas que acepta el API (TapsRankingUseCase.TEMAS en ms-education): el API se despliega antes que la web. */
export const RANKING_TEMAS: readonly TRankingTema[] = ['minecraft', 'logica', 'cultura', 'tecnologia'];
export const RANKING_LIMITE = 20;
export const XP_POR_ACIERTO = 10;
export const XP_BONO_PERFECTO = 20;
/** Desde este puesto ya no se dice el número: «Estás en el 15 % de arriba» (nunca «puesto 18.342»). */
export const PUESTO_MAXIMO_VISIBLE = 50;

export interface IPartidaEnvio {
  jugadorId: string;
  tapId: string;
  tema: TRankingTema;
  aciertos: number;
  total: number;
  duracionMs: number;
}

export interface IPartidaRespuesta {
  alias: string;
  xpGanado: number;
  semana: { puesto: number; jugadores: number; xp: number };
  hoy: { percentil: number; jugadores: number };
}

export interface IRankingFila { puesto: number; alias: string; xp: number; esTu: boolean }

export interface IRanking {
  periodo: TRankingPeriodo;
  desde: string;
  hasta: string;
  jugadores: number;
  top: IRankingFila[];
  yo: { puesto: number; xp: number; percentil: number; alias: string } | null;
}

/** Lo que se sabe de la última partida enviada de un Tap: aún en camino, con datos o sin datos (el API no respondió). */
export type TPartidaEstado =
  | { estado: 'enviando' }
  | { estado: 'listo'; datos: IPartidaRespuesta }
  | { estado: 'sin-datos' };

const OFFSET_COLOMBIA_MS = -5 * 3600 * 1000;
const DIA_MS = 24 * 3600 * 1000;
const NBSP = ' ';

/** Tema del contrato para la categoría de un Tap (null si el API aún no la conoce: esa partida no se envía). */
export function temaDeRanking(topic: string): TRankingTema | null {
  return (RANKING_TEMAS as readonly string[]).includes(topic) ? topic as TRankingTema : null;
}

/** XP que da un Tap (la misma fórmula del servidor; solo para textos como «hasta 70 XP»). */
export function xpDeTap(aciertos: number, total: number): number {
  return aciertos * XP_POR_ACIERTO + (total > 0 && aciertos === total ? XP_BONO_PERFECTO : 0);
}

/** Próximo lunes 00:00 en Colombia (cierre de la semana del ranking), en ms UTC. Si hoy es lunes, el de la otra semana. */
export function cierreSemana(now: number): number {
  const local = now + OFFSET_COLOMBIA_MS, dia = new Date(local).getUTCDay();   // 0 = domingo, 1 = lunes
  const faltan = ((8 - dia) % 7) || 7;
  return Math.floor(local / DIA_MS) * DIA_MS + faltan * DIA_MS - OFFSET_COLOMBIA_MS;
}

/** Próxima medianoche en Colombia (cierre del ranking de hoy), en ms UTC. */
export function cierreDia(now: number): number {
  const local = now + OFFSET_COLOMBIA_MS;
  return Math.floor(local / DIA_MS) * DIA_MS + DIA_MS - OFFSET_COLOMBIA_MS;
}

/** «2 d 5 h», «5 h 12 min», «12 min», «menos de 1 min». */
export function duracionCorta(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000), d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return `${d}${NBSP}d ${h}${NBSP}h`;
  if (h > 0) return `${h}${NBSP}h ${m}${NBSP}min`;
  return m > 0 ? `${m}${NBSP}min` : `menos de 1${NBSP}min`;
}

/** Cuenta regresiva del periodo a la vista: «La semana cierra en 2 d 5 h» o «Hoy se reinicia en 5 h 12 min». */
export function cuentaRegresiva(periodo: TRankingPeriodo, now: number, hasta?: number | null): string {
  const cierre = cierrePeriodo(periodo, now, hasta);
  return periodo === 'semana' ? `La semana cierra en ${duracionCorta(cierre - now)}` : `Hoy se reinicia en ${duracionCorta(cierre - now)}`;
}

/**
 * Cierre del periodo: el `hasta` que mandó el servidor (manda él: su reloj y su zona) si es una fecha válida y futura; si no,
 * el cálculo local (lunes 00:00 o medianoche de Colombia).
 */
export function cierrePeriodo(periodo: TRankingPeriodo, now: number, hasta?: number | null): number {
  if (hasta && Number.isFinite(hasta) && hasta > now) return hasta;
  return periodo === 'semana' ? cierreSemana(now) : cierreDia(now);
}

/** `hasta` del API en ms (null si no es una fecha). */
export function fechaMs(iso: string | null | undefined): number | null {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? ms : null;
}

export function numero(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
}

export function porcentaje(p: number): string {
  return `${Math.round(Math.min(100, Math.max(0, p)))}${NBSP}%`;
}

/**
 * Puesto de la semana dicho con amabilidad: «Puesto 7 de 120 esta semana»; con muchos jugadores y un puesto lejano,
 * «Estás en el 15 % de arriba esta semana». `null` si no hay datos útiles.
 */
export function frasePuesto(puesto: number, jugadores: number, cola = ' esta semana'): string | null {
  if (!(puesto > 0) || !(jugadores > 0)) return null;
  if (jugadores === 1) return `Abriste el ranking${cola}`;
  if (puesto <= PUESTO_MAXIMO_VISIBLE) return `Puesto ${numero(puesto)} de ${numero(jugadores)}${cola}`;
  const arriba = Math.max(1, Math.ceil(puesto / jugadores * 100));
  return `Estás en el ${porcentaje(arriba)} de arriba${cola}`;
}

/**
 * «Mejor que el 72 % de hoy» (o «de la semana»). Sin comparación posible (eres de los primeros o el percentil es 0) se anima
 * en vez de comparar.
 */
export function frasePercentil(percentil: number, jugadores: number, periodo: TRankingPeriodo = 'hoy'): string | null {
  if (!(jugadores > 1)) return `Eres de los primeros en jugar ${periodo === 'semana' ? 'esta semana' : 'hoy'}`;
  if (!(percentil >= 1)) return 'Cada Tap que juegas te sube';
  return `Mejor que el ${porcentaje(percentil)} ${periodo === 'semana' ? 'de la semana' : 'de hoy'}`;
}

/** «A 30 XP del puesto 6»: solo si se conoce a quien va justo arriba (está en el top que llegó). */
export function fraseDistancia(r: IRanking): string | null {
  const yo = r.yo;
  if (!yo || yo.puesto <= 1) return yo?.puesto === 1 ? 'Vas de primero' : null;
  const arriba = r.top.filter(f => f.puesto < yo.puesto && !f.esTu).sort((a, b) => b.puesto - a.puesto)[0];
  if (!arriba || arriba.puesto !== yo.puesto - 1) return null;
  const falta = arriba.xp - yo.xp;
  return falta > 0 ? `A ${numero(falta)} XP del puesto ${numero(arriba.puesto)}` : `Empatas con el puesto ${numero(arriba.puesto)}`;
}

/** Puesto de tu fila fijada: el número si es cercano; si no, «Top 15 %» (nunca «18.342»). */
export function etiquetaPuesto(puesto: number, jugadores: number): string {
  if (puesto <= PUESTO_MAXIMO_VISIBLE || !(jugadores > 0)) return numero(puesto);
  return `Top ${porcentaje(Math.max(1, Math.ceil(puesto / jugadores * 100)))}`;
}

/** Tu fila va fijada abajo cuando no estás en el top que llegó. */
export function filaFijada(r: IRanking): IRankingFila | null {
  if (!r.yo || r.top.some(f => f.esTu)) return null;
  return { puesto: r.yo.puesto, alias: r.yo.alias, xp: r.yo.xp, esTu: true };
}

/** Alias que llegan del API: texto plano corto (nunca se pinta otra cosa). */
export function aliasValido(alias: unknown): alias is string {
  return typeof alias === 'string' && alias.trim().length > 0 && alias.length <= 60;
}

/** Valida la forma mínima de la respuesta de una partida (si no encaja, no se muestra nada). */
export function esPartidaRespuesta(v: unknown): v is IPartidaRespuesta {
  const r = v as IPartidaRespuesta | null;
  return !!r && typeof r.xpGanado === 'number' && !!r.semana && typeof r.semana.puesto === 'number' && typeof r.semana.jugadores === 'number'
    && !!r.hoy && typeof r.hoy.percentil === 'number' && typeof r.hoy.jugadores === 'number';
}

/** Valida la forma mínima del ranking (lista y «yo»). */
export function esRanking(v: unknown): v is IRanking {
  const r = v as IRanking | null;
  return !!r && Array.isArray(r.top) && r.top.every(f => typeof f?.puesto === 'number' && typeof f.xp === 'number' && typeof f.alias === 'string')
    && (r.yo === null || r.yo === undefined || typeof r.yo.puesto === 'number');
}

/** uuid v4 (el id anónimo del dispositivo). */
export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function nuevoUuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
