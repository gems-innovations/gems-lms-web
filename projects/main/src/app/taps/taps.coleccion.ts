import { topicOf } from './taps.logic';
import { ITap } from './taps.types';

/**
 * Colecciones por subtema con insignias (auditoria-permanencia.md, mejora 5). Lógica pura; todo vive en el navegador.
 *
 * - Una colección = los Taps de un subtema (Redstone, Mobs, Adivinanzas…). Un subtema con un solo Tap se suma a la
 *   colección «mixta» de su tema (una colección de 1 casilla no es una colección).
 * - Insignia al completar la colección: bronce; plata con 80 % o más de aciertos (mejor puntaje de cada Tap); oro si todos
 *   salieron perfectos. Las bloqueadas se ven en contorno con «???».
 * - El «casi» es honesto: solo dice lo que de verdad falta (Taps por jugar o aciertos por mejorar), nunca inventa urgencia.
 */
export type TGrado = 'bronce' | 'plata' | 'oro';
export const GRADOS: readonly TGrado[] = ['bronce', 'plata', 'oro'];
export const PLATA_MIN = 0.8;
export const COLECCION_KEY = 'gems-taps-colecciones';

export interface IColeccion {
  /** `<tema>-<subtema>`, p. ej. `minecraft-mobs` (también el nombre del evento `taps/coleccion/<id>/<grado>`). */
  id: string;
  tema: string;
  subtema: string;
  nombre: string;
  tapIds: string[];
}

/** Nombres visibles de cada subtema (los que no estén aquí se muestran con su id en mayúscula inicial). */
export const SUBTEMA_NOMBRES: Record<string, string> = {
  'minecraft-mixto': 'Mezcla de bloques', 'minecraft-crafteos': 'Crafteos', 'minecraft-mobs': 'Mobs', 'minecraft-nether-end': 'Nether y End',
  'minecraft-redstone': 'Redstone', 'minecraft-supervivencia': 'Supervivencia', 'minecraft-curiosidades': 'Curiosidades',
  'minecraft-biomas': 'Biomas y estructuras', 'minecraft-aldeas': 'Aldeas',
  'logica-mixto': 'Trampas de lectura', 'logica-adivinanzas': 'Adivinanzas', 'logica-silogismos': 'Silogismos', 'logica-series': 'Series',
  'logica-lee-bien': 'Lee bien', 'logica-lateral': 'Piensa de lado', 'logica-azar-y-numeros': 'Azar y números', 'logica-codigo': 'Piensa como computador',
  'cultura-mixto': 'Rarezas y mitos', 'cultura-cuerpo-humano': 'Cuerpo humano', 'cultura-espacio': 'Espacio', 'cultura-animales': 'Animales',
  'cultura-ciencia-cotidiana': 'Ciencia cotidiana', 'cultura-geografia': 'Geografía',
  'cultura-datos-sorprendentes': 'Datos sorprendentes', 'cultura-dinosaurios': 'Dinosaurios', 'cultura-plantas': 'Plantas',
  'tecnologia-mixto': 'Cultura digital', 'tecnologia-git': 'Git y GitHub', 'tecnologia-programacion': 'Programación',
  'tecnologia-redes': 'Internet y redes', 'tecnologia-ciberseguridad': 'Ciberseguridad', 'tecnologia-ia': 'Inteligencia artificial',
  'tecnologia-hardware': 'Hardware y sistemas',
};

const MIXTO = 'mixto';
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');

/** Agrupa el banco en colecciones, en el orden en que aparecen los Taps (el tema y luego el subtema). */
export function colecciones(taps: readonly ITap[]): IColeccion[] {
  const cuenta = new Map<string, number>();
  for (const t of taps) cuenta.set(`${topicOf(t)}-${t.subtopic ?? MIXTO}`, (cuenta.get(`${topicOf(t)}-${t.subtopic ?? MIXTO}`) ?? 0) + 1);
  const out = new Map<string, IColeccion>();
  for (const t of taps) {
    const tema = topicOf(t);
    let sub = t.subtopic ?? MIXTO;
    if ((cuenta.get(`${tema}-${sub}`) ?? 0) < 2) sub = MIXTO;
    const id = `${tema}-${sub}`;
    const col = out.get(id) ?? { id, tema, subtema: sub, nombre: SUBTEMA_NOMBRES[id] ?? capital(sub), tapIds: [] };
    col.tapIds.push(t.id);
    out.set(id, col);
  }
  return [...out.values()];
}

/** La colección de un Tap (null si no está en ninguna). */
export function coleccionDe(cols: readonly IColeccion[], tapId: string): IColeccion | null {
  return cols.find(c => c.tapIds.includes(tapId)) ?? null;
}

export interface ICasilla { tapId: string; hecho: boolean; puntaje: number | null; total: number }

export interface IAvanceColeccion {
  col: IColeccion;
  casillas: ICasilla[];
  hechos: number;
  total: number;
  aciertos: number;
  preguntas: number;
  grado: TGrado | null;
  /** Qué falta para la siguiente insignia, en una frase (null con oro). */
  casi: string | null;
}

/** Grado que corresponde: sin colección completa no hay insignia. */
export function gradoDe(casillas: readonly ICasilla[]): TGrado | null {
  if (!casillas.length || casillas.some(c => !c.hecho)) return null;
  const aciertos = casillas.reduce((s, c) => s + (c.puntaje ?? 0), 0), preguntas = casillas.reduce((s, c) => s + c.total, 0);
  if (casillas.every(c => c.puntaje === c.total)) return 'oro';
  return preguntas && aciertos / preguntas >= PLATA_MIN ? 'plata' : 'bronce';
}

const nombreGrado = (g: TGrado) => (g === 'oro' ? 'oro' : g === 'plata' ? 'plata' : 'bronce');

/** «Te falta 1 Tap para la insignia de bronce», «Para plata: 2 aciertos más», «Para oro: 5 de 5 en 2 Taps más». */
function casiDe(casillas: readonly ICasilla[], grado: TGrado | null, aciertos: number, preguntas: number): string | null {
  const faltan = casillas.filter(c => !c.hecho).length;
  if (grado === null) return faltan === 1 ? 'Te falta 1 Tap para la insignia de bronce' : `Te faltan ${faltan} Taps para la insignia de bronce`;
  if (grado === 'bronce') {
    const necesita = Math.ceil(PLATA_MIN * preguntas - 1e-9) - aciertos;
    return necesita === 1 ? 'Para plata: 1 acierto más (repite un Tap de la colección)' : `Para plata: ${necesita} aciertos más (repite un Tap de la colección)`;
  }
  if (grado === 'plata') {
    const imperfectos = casillas.filter(c => c.puntaje !== c.total).length;
    return imperfectos === 1 ? 'Para oro: todo perfecto en 1 Tap más' : `Para oro: todo perfecto en ${imperfectos} Taps más`;
  }
  return null;
}

/**
 * Avance de una colección. `mejores`: mejor puntaje de cada Tap; `done`: Taps completados (del interés). Un Tap completado
 * sin puntaje conocido (jugado antes de las colecciones) cuenta como hecho con 0 aciertos.
 */
export function avanceColeccion(col: IColeccion, taps: readonly ITap[], mejores: Readonly<Record<string, number>>, done: Readonly<Record<string, number>>): IAvanceColeccion {
  const casillas = col.tapIds.map((id): ICasilla => {
    const tap = taps.find(t => t.id === id), total = tap?.questions.length ?? 5;
    const puntaje = mejores[id] ?? null, hecho = puntaje !== null || !!done[id];
    return { tapId: id, hecho, puntaje: hecho ? Math.min(puntaje ?? 0, total) : null, total };
  });
  const aciertos = casillas.reduce((s, c) => s + (c.puntaje ?? 0), 0), preguntas = casillas.reduce((s, c) => s + c.total, 0);
  const grado = gradoDe(casillas);
  return { col, casillas, hechos: casillas.filter(c => c.hecho).length, total: casillas.length, aciertos, preguntas, grado, casi: casiDe(casillas, grado, aciertos, preguntas) };
}

// ───────────── lo guardado ─────────────
export interface IColeccionGuardada {
  /** Mejor puntaje de cada Tap terminado. */
  mejores: Record<string, number>;
  /** Insignia más alta ya celebrada de cada colección (para celebrar y medir solo al subir). */
  insignias: Record<string, TGrado>;
}

export const emptyColecciones = (): IColeccionGuardada => ({ mejores: {}, insignias: {} });

export function parseColecciones(raw: string | null | undefined): IColeccionGuardada {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<IColeccionGuardada> | null;
    if (!d || typeof d !== 'object') return emptyColecciones();
    const mejores = Object.fromEntries(Object.entries(d.mejores && typeof d.mejores === 'object' ? d.mejores : {})
      .filter(([, v]) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 20)) as Record<string, number>;
    const insignias = Object.fromEntries(Object.entries(d.insignias && typeof d.insignias === 'object' ? d.insignias : {})
      .filter(([, v]) => GRADOS.includes(v as TGrado))) as Record<string, TGrado>;
    return { mejores, insignias };
  } catch { return emptyColecciones(); }
}

const rango = (g: TGrado | null | undefined) => (g ? GRADOS.indexOf(g) : -1);

/**
 * Anota el puntaje de un Tap terminado (se queda el mejor) y dice si su colección ganó una insignia nueva o subió de grado.
 */
export function registrarPuntaje(
  guardada: IColeccionGuardada, tap: ITap, score: number, cols: readonly IColeccion[], taps: readonly ITap[], done: Readonly<Record<string, number>>,
): { guardada: IColeccionGuardada; nueva: { col: IColeccion; grado: TGrado } | null } {
  const mejores = { ...guardada.mejores, [tap.id]: Math.max(guardada.mejores[tap.id] ?? 0, score) };
  const col = coleccionDe(cols, tap.id);
  if (!col) return { guardada: { ...guardada, mejores }, nueva: null };
  const grado = avanceColeccion(col, taps, mejores, { ...done, [tap.id]: done[tap.id] ?? 1 }).grado;
  if (!grado || rango(grado) <= rango(guardada.insignias[col.id])) return { guardada: { ...guardada, mejores }, nueva: null };
  return { guardada: { mejores, insignias: { ...guardada.insignias, [col.id]: grado } }, nueva: { col, grado } };
}

/**
 * Al cargar: anota como ya ganadas las insignias que el avance guardado ya merece (p. ej. con puntajes de antes de las
 * colecciones), para no celebrarlas de nuevo al terminar el próximo Tap. Nunca baja un grado.
 */
export function sembrarInsignias(guardada: IColeccionGuardada, cols: readonly IColeccion[], taps: readonly ITap[], done: Readonly<Record<string, number>>): IColeccionGuardada {
  const insignias = { ...guardada.insignias };
  for (const c of cols) {
    const g = avanceColeccion(c, taps, guardada.mejores, done).grado;
    if (g && rango(g) > rango(insignias[c.id])) insignias[c.id] = g;
  }
  return { ...guardada, insignias };
}

/** Casi en corto para la fila del resultado («faltan 3 Taps para bronce»). */
export function casiCorto(a: IAvanceColeccion): string | null {
  const faltan = a.total - a.hechos;
  if (a.grado === null) return faltan === 1 ? 'Falta 1 Tap para bronce' : `Faltan ${faltan} Taps para bronce`;
  if (a.grado === 'bronce') { const n = Math.ceil(PLATA_MIN * a.preguntas - 1e-9) - a.aciertos; return n === 1 ? '1 acierto más para plata' : `${n} aciertos más para plata`; }
  if (a.grado === 'plata') { const n = a.casillas.filter(c => c.puntaje !== c.total).length; return n === 1 ? 'Todo perfecto en 1 Tap más para oro' : `Todo perfecto en ${n} Taps más para oro`; }
  return 'Colección perfecta';
}

/** Insignias ganadas (cualquier grado) entre todas las colecciones, para los resúmenes. */
export function insigniasGanadas(avances: readonly IAvanceColeccion[]): number {
  return avances.filter(a => a.grado !== null).length;
}

export const gradoTexto = (g: TGrado): string => `Insignia de ${nombreGrado(g)}`;
