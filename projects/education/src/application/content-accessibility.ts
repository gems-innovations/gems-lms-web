import { EContentType } from '../domain/model/course.model';
import type { ICourse, IContentBlock } from '../domain/model/course.model';

export type TA11ySeverity = 'error' | 'warning';

export interface IA11yIssue {
  severity: TA11ySeverity;
  module: string;
  lesson: string;
  block: string;
  message: string;
  /** Qué hacer para resolverlo. */
  fix: string;
}

export interface IA11yReport {
  /** 0–100: porcentaje de bloques sin problemas. */
  score: number;
  blocks: number;
  issues: IA11yIssue[];
}

const GENERIC_LINKS = /^(aqu[ií]|clic aqu[ií]|click aqu[ií]|haz clic aqu[ií]|click here|here|enlace|link|ver m[aá]s|leer m[aá]s|m[aá]s)$/i;
const FILE_LIKE_ALT = /^(img|image|imagen|foto|screenshot|captura)?[_\-\s]?\d*\.(png|jpe?g|gif|webp|svg)$|^(img|image|imagen|foto)\d*$/i;
const HOSTED_VIDEO = /youtube|youtu\.be|vimeo/i;

/** Problemas de accesibilidad del texto en Markdown de un bloque. */
function markdownIssues(md: string): { message: string; fix: string; severity: TA11ySeverity }[] {
  const out: { message: string; fix: string; severity: TA11ySeverity }[] = [];
  const images = [...md.matchAll(/!\[([^\]]*)]\(([^)]+)\)/g)];
  const noAlt = images.filter(m => !m[1].trim() || FILE_LIKE_ALT.test(m[1].trim())).length;
  const htmlNoAlt = [...md.matchAll(/<img\b(?![^>]*\balt\s*=\s*"[^"]+")[^>]*>/gi)].length;
  if (noAlt + htmlNoAlt) {
    out.push({ severity: 'error', message: `${noAlt + htmlNoAlt} imagen(es) sin descripción`,
      fix: 'Describe cada imagen dentro de los corchetes: ![Gráfico de ventas por mes](url). Si es decorativa, escribe «decorativa».' });
  }
  const generic = [...md.matchAll(/(?<!!)\[([^\]]+)]\([^)]+\)/g)].filter(m => GENERIC_LINKS.test(m[1].trim())).length;
  if (generic) {
    out.push({ severity: 'warning', message: `${generic} enlace(s) con texto genérico como «aquí» o «ver más»`,
      fix: 'Usa un texto que diga a dónde lleva el enlace, por ejemplo «Guía de instalación de Python».' });
  }
  const levels = [...md.matchAll(/^(#{1,6})\s/gm)].map(m => m[1].length);
  if (levels.some((l, i) => i > 0 && l - levels[i - 1] > 1)) {
    out.push({ severity: 'warning', message: 'Los títulos saltan niveles (por ejemplo de # a ###)',
      fix: 'Usa los niveles en orden: # para el título, ## para secciones y ### para subsecciones.' });
  }
  return out;
}

function blockIssues(b: IContentBlock): { message: string; fix: string; severity: TA11ySeverity }[] {
  const out: { message: string; fix: string; severity: TA11ySeverity }[] = [];
  if (!b.title?.trim()) {
    out.push({ severity: 'warning', message: 'El bloque no tiene título', fix: 'Pon un título que describa el contenido.' });
  }
  if (b.type === EContentType.VIDEO && b.url) {
    const hosted = HOSTED_VIDEO.test(b.url) || b.videoProvider === 'youtube' || b.videoProvider === 'vimeo';
    const transcript = !!b.videoTranscript?.trim();
    if (!hosted && !b.captionsUrl && !transcript) {
      out.push({ severity: 'error', message: 'Video sin subtítulos ni transcripción',
        fix: 'Sube un archivo de subtítulos .vtt o pega la transcripción en el bloque.' });
    } else if (hosted && !transcript) {
      out.push({ severity: 'warning', message: 'Video sin transcripción',
        fix: 'Pega la transcripción: ayuda a quien no puede oír el video y a quien prefiere leer o buscar en el texto.' });
    }
  }
  for (const md of [b.markdownContent, b.description, b.assignmentInstructions].filter((x): x is string => !!x)) {
    out.push(...markdownIssues(md));
  }
  return out;
}

/** Revisa todo el contenido de un curso y devuelve lo que conviene corregir, por lección. */
export function auditCourseAccessibility(course: ICourse): IA11yReport {
  const issues: IA11yIssue[] = [];
  let blocks = 0;
  let clean = 0;
  for (const m of course.modules ?? []) {
    for (const l of m.lessons ?? []) {
      for (const b of l.contentBlocks ?? []) {
        blocks++;
        const found = blockIssues(b);
        if (!found.length) clean++;
        for (const f of found) issues.push({ ...f, module: m.title, lesson: l.title, block: b.title || '(sin título)' });
      }
    }
  }
  issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return { score: blocks ? Math.round((clean / blocks) * 100) : 100, blocks, issues };
}
