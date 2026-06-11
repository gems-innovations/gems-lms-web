import { EDifficulty } from '../../../domain/model/course.model';

export type TCatalogKind = 'course' | 'path';

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
