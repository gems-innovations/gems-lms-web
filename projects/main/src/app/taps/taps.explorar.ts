import { IColeccion, SUBTEMA_NOMBRES } from './taps.coleccion';
import { IInterest, personalize } from './taps.interest';
import { mixFeed, puntuables, topicOf } from './taps.logic';
import { ISesionGuardada, TPartidaGuardada } from './taps.sesion';
import { ITap, ITapTopic } from './taps.types';

/**
 * «Explorar» (/taps/explorar): buscar, filtrar y ordenar el catálogo de Taps. Lógica pura y determinista (sin Angular ni
 * almacenamiento): el componente lee lo guardado y las vistas del API y llama aquí. Nada de esto cambia el feed, el puntaje
 * ni las preguntas.
 */

/** Cuántos días dura la marca «Nuevo» desde que el Tap se agregó al banco. */
export const NUEVO_DIAS = 7;
/** Tamaño de los rieles de la portada de Explorar. */
export const RIEL_MAX = 10;
/** Con menos Taps vistos que esto el orden «Más vistos» no es fiable y se usa el curado (nunca se inventan cifras). */
export const MIN_TAPS_CON_VISTAS = 3;

export type TVista = 'todos' | 'vistos' | 'nuevos' | 'parati' | 'sinjugar' | 'jugados';
export const VISTAS: readonly { id: TVista; nombre: string }[] = [
  { id: 'todos', nombre: 'Destacados' }, { id: 'vistos', nombre: 'Más vistos' }, { id: 'nuevos', nombre: 'Nuevos' },
  { id: 'parati', nombre: 'Para ti' }, { id: 'sinjugar', nombre: 'Sin jugar' }, { id: 'jugados', nombre: 'Ya jugados' },
];
export const esVista = (v: unknown): v is TVista => VISTAS.some(x => x.id === v);

/** Un Tap listo para explorar: su tema, su subtema legible y los textos normalizados para buscar. */
export interface IItem {
  tap: ITap;
  /** Posición en el banco (el orden curado). */
  indice: number;
  tema: ITapTopic;
  subtemaId: string;
  subtema: string;
  /** Marca de tiempo (ms) en que se agregó al banco; null si no se conoce (no se inventa). */
  desde: number | null;
  /** Textos normalizados: título, etiqueta, subtema, tema y cada pregunta (en ese orden de peso). */
  buscable: { titulo: string; resto: string; preguntas: { original: string; norm: string }[] };
}

/** Minúsculas, sin tildes ni diacríticos y con espacios simples: «Volcán» y «VOLCAN» se buscan igual. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
const MIXTO = 'mixto';

/** Fecha AAAA-MM-DD a marca de tiempo local; null si no es una fecha válida. */
export function fechaMs(fecha: string | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
}

/**
 * Prepara el catálogo: sin los Taps «solo enlace» (como el feed y los temas), con el tema de cada uno (uno desconocido
 * usa su id como nombre) y el subtema con el nombre de las colecciones. `desde` mapea id → AAAA-MM-DD.
 */
export function construirItems(taps: readonly ITap[], temas: readonly ITapTopic[], desde: Readonly<Record<string, string>> = {}): IItem[] {
  const porId = new Map(temas.map(t => [t.id, t]));
  return taps.filter(t => !t.soloEnlace).map((tap, indice) => {
    const id = topicOf(tap);
    const tema = porId.get(id) ?? { id, name: capital(id), blurb: '', color: '#8b93a7' };
    const subtemaId = tap.subtopic ?? MIXTO;
    const subtema = SUBTEMA_NOMBRES[`${id}-${subtemaId}`] ?? capital(subtemaId);
    return {
      tap, indice, tema, subtemaId, subtema, desde: fechaMs(desde[tap.id]),
      buscable: {
        titulo: normalizar(tap.title),
        resto: normalizar(`${tap.kicker} ${subtema} ${tema.name} ${tema.blurb}`),
        preguntas: tap.questions.map(q => ({ original: q.q, norm: normalizar(q.q) })),
      },
    };
  });
}

// ───────────── búsqueda ─────────────
export interface IResultado { item: IItem; puntos: number; /** Pregunta que coincidió cuando el título no (para mostrar por qué salió). */ pregunta: string | null }

/**
 * Busca por título (peso 3), etiqueta, subtema y tema (2) y texto de las preguntas (1). Todas las palabras deben aparecer
 * (en cualquier parte, sin importar tildes ni mayúsculas); más puntos, primero. Sin texto devuelve todo con 0 puntos.
 */
export function buscar(items: readonly IItem[], consulta: string): IResultado[] {
  const palabras = normalizar(consulta).split(' ').filter(Boolean);
  if (!palabras.length) return items.map(item => ({ item, puntos: 0, pregunta: null }));
  const out: IResultado[] = [];
  for (const item of items) {
    const { titulo, resto, preguntas } = item.buscable;
    let puntos = 0, pregunta: string | null = null, todas = true;
    for (const p of palabras) {
      if (titulo.includes(p)) puntos += titulo.startsWith(p) || titulo.includes(' ' + p) ? 4 : 3;
      else if (resto.includes(p)) puntos += 2;
      else {
        const q = preguntas.find(x => x.norm.includes(p));
        if (!q) { todas = false; break; }
        puntos += 1;
        pregunta ??= q.original;
      }
    }
    if (todas) out.push({ item, puntos, pregunta });
  }
  return out.sort((a, b) => b.puntos - a.puntos || a.item.indice - b.item.indice);
}

/** Ideas para el estado vacío: nombres de subtemas de colecciones distintas (uno por tema primero, Minecraft al frente). */
export function sugerencias(colecciones: readonly IColeccion[], max = 6): string[] {
  const porTema = new Map<string, string[]>();
  for (const c of colecciones) if (c.subtema !== MIXTO) porTema.set(c.tema, [...(porTema.get(c.tema) ?? []), c.nombre]);
  const listas = [...porTema.values()], out: string[] = [];
  for (let i = 0; out.length < max && listas.some(l => i < l.length); i++) for (const l of listas) if (i < l.length && out.length < max) out.push(l[i]);
  return out;
}

// ───────────── categorías ─────────────
export interface IFiltro { categoria: string | null; subtema: string | null }

export function filtrarCategoria(items: readonly IItem[], f: IFiltro): IItem[] {
  return items.filter(i => (!f.categoria || i.tema.id === f.categoria) && (!f.subtema || i.subtemaId === f.subtema));
}

/** Subtemas de una categoría con su cuántos Taps tiene, en el orden del banco. */
export function subtemasDe(items: readonly IItem[], categoria: string): { id: string; nombre: string; cuenta: number }[] {
  const out = new Map<string, { id: string; nombre: string; cuenta: number }>();
  for (const i of items) if (i.tema.id === categoria) {
    const s = out.get(i.subtemaId) ?? { id: i.subtemaId, nombre: i.subtema, cuenta: 0 };
    out.set(i.subtemaId, { ...s, cuenta: s.cuenta + 1 });
  }
  return [...out.values()];
}

/** Categorías con Taps, Minecraft siempre primero y el resto en el orden del catálogo. */
export function categoriasDe(items: readonly IItem[]): { tema: ITapTopic; cuenta: number }[] {
  const out = new Map<string, { tema: ITapTopic; cuenta: number }>();
  for (const i of items) out.set(i.tema.id, { tema: i.tema, cuenta: (out.get(i.tema.id)?.cuenta ?? 0) + 1 });
  return [...out.values()].sort((a, b) => Number(b.tema.id === 'minecraft') - Number(a.tema.id === 'minecraft'));
}

// ───────────── progreso local ─────────────
export interface IContexto {
  now: number;
  interest: IInterest;
  sesion: ISesionGuardada;
  partidas: Readonly<Record<string, TPartidaGuardada>>;
  /** Vistas por Tap del API; null si no respondió o aún no hay datos. */
  vistas: Readonly<Record<string, number>> | null;
  /** El feed manda los ganchos al final cuando ya se jugó uno. */
  hookDone?: boolean;
}

export type TEstado = 'nuevo' | 'curso' | 'hecho';
export interface IProgreso {
  estado: TEstado;
  /** 0 a 1 para el anillo. */
  fraccion: number;
  /** Frase para lectores de pantalla y para mostrar bajo el anillo. */
  texto: string;
}

/** Estado local de un Tap: sin jugar, a medias (partida del feed) o completado (con su último puntaje si se guardó). */
export function progresoDe(item: IItem, ctx: IContexto): IProgreso {
  const id = item.tap.id, total = item.tap.questions.length;
  if (ctx.interest.done[id]) {
    const p = ctx.sesion.puntajes[id];
    return { estado: 'hecho', fraccion: 1, texto: p === undefined ? 'Completado' : `Completado: ${p} de ${puntuables(item.tap)}` };
  }
  const run = ctx.partidas[id];
  if (run && !run.finished && run.answers.length) {
    return { estado: 'curso', fraccion: Math.min(run.answers.length / total, 1), texto: `En curso: ${run.answers.length} de ${total}` };
  }
  return { estado: 'nuevo', fraccion: 0, texto: 'Sin jugar' };
}

export const esNuevo = (item: IItem, now: number): boolean => item.desde !== null && item.desde <= now && now - item.desde <= NUEVO_DIAS * 86_400_000;

const hecho = (i: IItem, ctx: IContexto) => !!ctx.interest.done[i.tap.id];
const enCurso = (i: IItem, ctx: IContexto) => { const r = ctx.partidas[i.tap.id]; return !!r && !r.finished && r.answers.length > 0; };

/** Partidas a medias (las del feed, 48 h), la más reciente primero. */
export function seguirJugando(items: readonly IItem[], ctx: IContexto): IItem[] {
  return items.filter(i => enCurso(i, ctx) && !hecho(i, ctx)).sort((a, b) => ctx.partidas[b.tap.id].t - ctx.partidas[a.tap.id].t);
}

// ───────────── orden ─────────────
/** ¿Hay suficientes vistas reales para ordenar por «Más vistos»? */
export function hayVistas(vistas: Readonly<Record<string, number>> | null | undefined, items: readonly IItem[]): boolean {
  return !!vistas && items.filter(i => (vistas[i.tap.id] ?? 0) > 0).length >= MIN_TAPS_CON_VISTAS;
}

/** Más vistos primero; los empates y los que no tienen cifra siguen el orden curado. Sin datos fiables: el orden curado. */
export function masVistos(items: readonly IItem[], vistas: Readonly<Record<string, number>> | null | undefined): IItem[] {
  if (!hayVistas(vistas, items)) return [...items];
  return [...items].sort((a, b) => (vistas![b.tap.id] ?? 0) - (vistas![a.tap.id] ?? 0) || a.indice - b.indice);
}

/**
 * Más recientes primero por la fecha en que se agregaron. Sin fecha conocida = agregado después de la última tabla: va
 * primero. Los empates (mismo día o sin fecha) siguen el orden de adición del banco, el último agregado primero.
 */
export function masNuevos(items: readonly IItem[]): IItem[] {
  return [...items].sort((a, b) => (b.desde ?? Infinity) - (a.desde ?? Infinity) || b.indice - a.indice);
}

/** «Para ti»: el orden mezclado del feed ajustado a lo que la persona ha jugado (taps.interest), sin reordenar las preguntas. */
export function paraTi(items: readonly IItem[], ctx: IContexto): IItem[] {
  const porId = new Map(items.map(i => [i.tap.id, i]));
  const mezcla = personalize(mixFeed(items.map(i => i.tap), { hookDone: ctx.hookDone }), 0, ctx.interest, ctx.now);
  return mezcla.map(t => porId.get(t.id)!);
}

/** Aplica una vista: ordena (y, en «Sin jugar» y «Ya jugados», filtra) según el progreso local. */
export function aplicarVista(items: readonly IItem[], vista: TVista, ctx: IContexto): IItem[] {
  switch (vista) {
    case 'vistos': return masVistos(items, ctx.vistas);
    case 'nuevos': return masNuevos(items);
    case 'parati': return paraTi(items, ctx);
    case 'sinjugar': return items.filter(i => !hecho(i, ctx) && !enCurso(i, ctx));
    case 'jugados': return items.filter(i => hecho(i, ctx)).sort((a, b) => ctx.interest.done[b.tap.id] - ctx.interest.done[a.tap.id]);
    default: return [...items];
  }
}

export interface IVistaResultado { resultados: IResultado[]; /** «Más vistos» pedido pero sin datos fiables. */ sinVistas: boolean }

/** Todo junto: categoría y subtema, vista (orden o filtro de progreso) y búsqueda; la búsqueda manda y la vista desempata. */
export function explorar(items: readonly IItem[], o: IFiltro & { consulta: string; vista: TVista }, ctx: IContexto): IVistaResultado {
  const base = aplicarVista(filtrarCategoria(items, o), o.vista, ctx);
  const orden = new Map(base.map((i, k) => [i.tap.id, k]));
  const resultados = buscar(base, o.consulta).sort((a, b) => b.puntos - a.puntos || orden.get(a.item.tap.id)! - orden.get(b.item.tap.id)!);
  return { resultados, sinVistas: o.vista === 'vistos' && !hayVistas(ctx.vistas, items) };
}
