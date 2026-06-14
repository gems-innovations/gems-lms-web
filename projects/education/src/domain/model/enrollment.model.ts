// ============================================================================
// GEMS LMS — Enrollment & Student Progress Domain Model
// ============================================================================

export interface IBlockProgress {
  blockId: string;
  completed: boolean;
  completedAt?: Date;
  /** For quiz blocks — most recent attempt score (0-100) */
  quizScore?: number;
  /** For assignment blocks — submission id */
  submissionId?: string;
}

export interface ILessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  blockProgress: IBlockProgress[];
  /** Only present for quiz lessons */
  bestScore?: number;
}

export interface IModuleProgress {
  moduleId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

export interface ICourseProgress {
  courseId: string;
  overallPercentage: number;
  completedLessons: number;
  totalLessons: number;
  moduleProgress: IModuleProgress[];
  currentLessonId?: string;
  currentBlockId?: string;
  lastAccessedAt: Date;
}

export interface IEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'active' | 'completed' | 'paused';
  enrolledAt: Date;
  completedAt?: Date;
  progress: ICourseProgress;
}

export interface ILearningPathEnrollment {
  id: string;
  userId: string;
  learningPathId: string;
  status: 'active' | 'completed';
  enrolledAt: Date;
  completedAt?: Date;
  completedCourseIds: string[];
  currentCourseId?: string;
  overallPercentage: number;
}

// ── Quiz Attempt ──────────────────────────────────────────────────────────────

export interface IQuizAnswer {
  questionId: string;
  /** string for open, string[] for MCQ, boolean for T/F */
  answer: string | string[] | boolean;
}

export interface IQuizAttempt {
  id: string;
  blockId: string;
  lessonId: string;
  courseId: string;
  attemptNumber: number;
  answers: IQuizAnswer[];
  score: number;       // 0-100
  passed: boolean;
  completedAt: Date;
  /** Per-question feedback */
  feedback?: { questionId: string; correct: boolean; explanation?: string }[];
}

// ── Assignment Submission ─────────────────────────────────────────────────────

export interface IAssignmentSubmission {
  id: string;
  blockId: string;
  lessonId: string;
  courseId: string;
  textContent?: string;
  fileUrls?: string[];
  submittedAt: Date;
  grade?: number;        // 0-maxScore
  feedback?: string;
  status: 'pending' | 'graded' | 'returned';
}

// ── Request types ─────────────────────────────────────────────────────────────

export interface ISubmitQuizRequest {
  blockId: string;
  lessonId: string;
  courseId: string;
  answers: IQuizAnswer[];
}

export interface ISubmitAssignmentRequest {
  blockId: string;
  lessonId: string;
  courseId: string;
  textContent?: string;
  fileUrls?: string[];
}

export interface IEnrolledCourseEntry {
  enrollment: IEnrollment;
  course: import('./course.model').ICourse;
}

export interface IEnrolledPathEntry {
  enrollment: ILearningPathEnrollment;
  path: import('./learning-path.model').ILearningPath;
}

export type TEnrollTab = 'individual' | 'bulk';

export interface IBulkEnrollEntry {
  email: string;
  courseId: string;
}

export interface IBulkResult {
  success: number;
  skipped: number;
  errors: string[];
}
