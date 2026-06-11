import { ECourseStatus, EDifficulty } from '../../../domain/model/course.model';

export const DIFFICULTY_LABELS: Record<EDifficulty, string> = {
  [EDifficulty.BEGINNER]: 'Principiante',
  [EDifficulty.INTERMEDIATE]: 'Intermedio',
  [EDifficulty.ADVANCED]: 'Avanzado',
  [EDifficulty.EXPERT]: 'Experto'
};

export const STATUS_LABELS: Record<ECourseStatus, string> = {
  [ECourseStatus.DRAFT]: 'Borrador',
  [ECourseStatus.PUBLISHED]: 'Publicado',
  [ECourseStatus.ARCHIVED]: 'Archivado'
};

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
