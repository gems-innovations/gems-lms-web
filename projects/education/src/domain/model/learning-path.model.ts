// ============================================================================
// GEMS LMS — Learning Path Domain Model
// ============================================================================

export enum ELearningPathStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface ILearningPathStep {
  id: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl?: string;
  order: number;
  isRequired: boolean;
  minimumScore?: number; // percentage required to advance
  estimatedDuration: number; // minutes
  moduleCount?: number;
  lessonCount?: number;
}

export interface ILearningPath {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: ELearningPathStatus;
  steps: ILearningPathStep[];
  tags: string[];
  institutionId: string;
  estimatedDuration: number; // total minutes
  enrolledCount: number;
  completionRate: number;
  averageRating?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateLearningPathRequest {
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
}

export interface IUpdateLearningPathRequest {
  title?: string;
  description?: string;
  tags?: string[];
  thumbnailUrl?: string;
  status?: ELearningPathStatus;
  steps?: ILearningPathStep[];
}

export interface ILearningPathListResponse {
  learningPaths: ILearningPath[];
  total: number;
  page: number;
  limit: number;
}

export interface IStepEntry {
  step: ILearningPathStep;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}
