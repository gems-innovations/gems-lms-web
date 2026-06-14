import { EDifficulty } from './course.model';

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
}
