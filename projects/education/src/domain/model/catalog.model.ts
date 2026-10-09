import { EDifficulty } from './course.model';

/** Institución pública de GEMS: sus cursos son gratis y se empiezan sin inscripción formal. */
export const OPEN_INSTITUTION_ID = 'gems-abierto';

export type TCatalogKind = 'course' | 'path';
export type TPreviewType = 'course' | 'path';
export type TCatalogKindFilter = 'all' | 'course' | 'path';
export type TCatalogLevelFilter = EDifficulty | 'all';

export interface ICatalogItem {
  kind: TCatalogKind;
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  tags: string[];
  duration: number;
  meta: string;
  difficulty?: EDifficulty;
  /** Curso gratis de GEMS Abierto: se muestra «Empezar gratis» en vez de «Inscribirme». */
  free?: boolean;
}
