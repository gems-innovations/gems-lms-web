import { ITap, ITapQuestion } from './taps.types';

/** Ids de Taps creados por personas (`TapsIds.nuevo()` del API): `u-` + 10 letras de un alfabeto sin vocales ni ambiguas. */
export const esIdDeUsuario = (id: unknown): id is string => typeof id === 'string' && /^u-[23456789bcdfghjkmnpqrstvwxz]{10}$/.test(id);

const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Lo que devuelve `GET /api/v1/public/taps/u/{id}` (ya validado por el API) como un `ITap` del feed: solo por enlace, con ids
 * de pregunta y el fondo de carga de un Tap del banco con el mismo lugar. El `estilo` pasa tal cual: el feed lo valida al pintar.
 * null si la forma no es la esperada (nunca se juega algo a medias).
 */
export function tapDeUsuario(json: unknown, banco: readonly ITap[]): ITap | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const scene = o['scene'] as Record<string, unknown> | undefined;
  const qs = o['questions'], rs = o['results'];
  if (!esIdDeUsuario(o['id']) || o['theme'] !== 'epoca' || !texto(o['title']) || !texto(o['kicker']) || !scene || !texto(scene['world']) || !texto(scene['host'])) return null;
  if (!Array.isArray(qs) || !qs.length || !Array.isArray(rs) || !rs.length) return null;
  const id = o['id'] as string;
  const questions: ITapQuestion[] = [];
  for (const [i, q] of qs.entries()) {
    if (!texto(q?.q) || !Array.isArray(q.options) || !q.options.every(texto) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || typeof q.why !== 'string') return null;
    questions.push({ id: `${id}-${i + 1}`, q: q.q, options: q.options, answer: q.answer, why: q.why, ...(q.tipo === 'duo' || q.tipo === 'vf' ? { tipo: q.tipo } : {}) });
  }
  const results = rs.filter(r => Number.isInteger(r?.min) && texto(r.title) && typeof r.line === 'string').map(r => ({ min: r.min as number, title: r.title as string, line: r.line as string }));
  if (results.length !== rs.length) return null;
  const pariente = banco.find(t => t.theme === 'epoca' && t.scene.world === scene['world']);
  return {
    id, soloEnlace: true, theme: 'epoca', topic: 'creador', title: o['title'] as string, kicker: o['kicker'] as string,
    scene: { world: scene['world'] as string, host: scene['host'] as string, ...(texto(scene['item']) ? { item: scene['item'] } : {}) },
    backdrop: pariente?.backdrop ?? ['#231b17', '#3b2c24'], ...(pariente?.ground ? { ground: pariente.ground } : {}),
    questions, results,
    ...(o['estilo'] && typeof o['estilo'] === 'object' ? { estilo: o['estilo'] as ITap['estilo'] } : {}),
  };
}
