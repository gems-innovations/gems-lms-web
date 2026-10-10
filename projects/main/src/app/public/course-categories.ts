import { IPublicCourse } from './public-catalog.service';

/**
 * Categorías de la portada. Se deducen de las etiquetas que ya traen los cursos (no hay que cambiar el API):
 * un curso nuevo cae solo en su categoría si lleva la etiqueta correspondiente.
 */
export interface ICourseCategory { id: string; label: string; test: RegExp; }

export const COURSE_CATEGORIES: ICourseCategory[] = [
  { id: 'admision', label: 'Admisión', test: /admisi[oó]n|saber 11|razonamiento|matem[aá]tica/i },
  { id: 'retos', label: 'Retos y lógica', test: /\breto|l[oó]gica|acertijo|test\b/i },
  { id: 'plata', label: 'Finanzas', test: /finanz|ahorro|vida pr[aá]ctica|presupuesto/i },
  { id: 'escritura', label: 'Escritura', test: /escritura|ortograf|redacci[oó]n/i },
];

const text = (c: IPublicCourse) => `${(c.tags ?? []).join(' ')} ${c.title}`;

/** Primera categoría que coincide con las etiquetas (o el título) del curso; «otros» si ninguna. */
export function categoryOf(c: IPublicCourse): string {
  return COURSE_CATEGORIES.find(cat => cat.test.test(text(c)))?.id ?? 'otros';
}
