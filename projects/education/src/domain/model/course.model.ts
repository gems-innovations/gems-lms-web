// ============================================================================
// GEMS LMS — Course Domain Model
// ============================================================================

export enum ECourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum EDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum EContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE_SESSION = 'live-session',
  SCORM = 'scorm',
  /** Cartas horizontales (ideas, preguntas, pasos animados) que arma el profesor dentro de una lección. */
  CARDS = 'cards'
}

// ── Question types ────────────────────────────────────────────────────────────

export interface IBaseQuestion {
  id: string;
  question: string;
  points: number;
  explanation?: string;
  order: number;
}

export interface IMultipleChoiceQuestion extends IBaseQuestion {
  type: 'multiple-choice';
  options: { id: string; text: string }[];
  correctAnswers: string[]; // option ids
  allowMultiple?: boolean;
}

export interface ITrueFalseQuestion extends IBaseQuestion {
  type: 'true-false';
  correctAnswer: boolean;
}

export interface IOpenQuestion extends IBaseQuestion {
  type: 'open';
  sampleAnswer?: string;
  maxLength?: number;
}

export type IQuestion = IMultipleChoiceQuestion | ITrueFalseQuestion | IOpenQuestion;

// ── Rubric ────────────────────────────────────────────────────────────────────

export interface IRubricItem {
  id: string;
  criterion: string;
  description?: string;
  maxPoints: number;
}

/** count random questions of a question-bank category. */
export interface IQuestionPool {
  category: string;
  count: number;
}

// ── Content Block ─────────────────────────────────────────────────────────────

export interface IContentBlock {
  id: string;
  type: EContentType;
  title: string;
  duration: number;   // minutes
  order: number;
  isRequired: boolean;
  description?: string;

  minTimeSeconds?: number;  // minimum seconds student must spend before auto-complete

  // ── VIDEO ──
  url?: string;
  videoProvider?: 'youtube' | 'vimeo' | 'external' | 'upload';
  videoThumbnailUrl?: string;
  videoTranscript?: string;
  /** WebVTT subtitles for uploaded/external videos (public file URL). */
  captionsUrl?: string;

  // ── DOCUMENT / MARKDOWN ──
  markdownContent?: string;

  // ── SCORM ──
  scormVersion?: '1.2' | '2004';
  completionThreshold?: number; // percentage (0-100)

  // ── QUIZ / EVALUATION ──
  questions?: IQuestion[];
  timeLimit?: number;       // minutes; 0 = unlimited
  passingScore?: number;    // percentage (0-100)
  maxAttempts?: number;     // 0 = unlimited
  shuffleQuestions?: boolean;
  /** Random questions drawn from the question bank on every attempt. */
  questionPools?: IQuestionPool[];

  // ── ASSIGNMENT ──
  assignmentInstructions?: string;
  maxScore?: number;
  /** Due date (yyyy-mm-dd) of an assignment. */
  dueDate?: string;
  allowedFileTypes?: string[];  // ['pdf', 'docx', 'zip', 'jpg']
  rubric?: IRubricItem[];

  // ── CARDS ──
  cards?: ICard[];
}

// ── Cards (cartas horizontales tipo Taps) ─────────────────────────────────────

export interface ICardIdea { kind: 'idea'; label: string; title: string; text: string; remember?: string }
export interface ICardQuestion {
  kind: 'question'; label: string; scene?: string; question: string;
  options: string[]; answer: number; why: string;
}
/** Pasos que aparecen uno a uno al tocar «Mostrar el siguiente» (animación de secuencia). */
export interface ICardSteps { kind: 'steps'; label: string; title: string; steps: string[] }
export interface ICardImage { kind: 'image'; label: string; title: string; url: string; alt: string; caption?: string }
export type ICard = ICardIdea | ICardQuestion | ICardSteps | ICardImage;

// ── Lesson ────────────────────────────────────────────────────────────────────

export interface ILesson {
  id: string;
  title: string;
  description?: string;
  duration: number;          // sum of content blocks (minutes)
  contentBlocks: IContentBlock[];
  order: number;
  isFree: boolean;
}

// ── Course Module ─────────────────────────────────────────────────────────────

export interface ICourseModule {
  id: string;
  title: string;
  description?: string;
  lessons: ILesson[];
  order: number;
}

// ── Course ────────────────────────────────────────────────────────────────────

export interface ICourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: ECourseStatus;
  difficulty: EDifficulty;
  modules: ICourseModule[];
  tags: string[];
  institutionId: string;
  instructorName?: string;
  totalDuration: number;    // minutes
  totalLessons: number;
  enrolledCount: number;
  completionRate: number;
  averageRating?: number;   // 0-5
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// ── Request / Response types ───────────────────────────────────────────────────

export interface ICreateCourseRequest {
  title: string;
  description: string;
  difficulty: EDifficulty;
  tags: string[];
  thumbnailUrl?: string;
  institutionId?: string;
}

export interface IUpdateCourseRequest {
  title?: string;
  description?: string;
  difficulty?: EDifficulty;
  tags?: string[];
  thumbnailUrl?: string;
  status?: ECourseStatus;
}

export interface ICreateModuleRequest {
  courseId: string;
  title: string;
  description?: string;
}

export interface ICreateLessonRequest {
  moduleId: string;
  title: string;
  description?: string;
  isFree?: boolean;
}

export interface ICreateContentBlockRequest {
  lessonId: string;
  type: EContentType;
  title: string;
  duration?: number;
  isRequired?: boolean;
  description?: string;
  // Video
  url?: string;
  videoProvider?: 'youtube' | 'vimeo' | 'external' | 'upload';
  videoThumbnailUrl?: string;
  videoTranscript?: string;
  /** WebVTT subtitles for uploaded/external videos (public file URL). */
  captionsUrl?: string;
  // Markdown
  markdownContent?: string;
  // SCORM
  scormVersion?: '1.2' | '2004';
  completionThreshold?: number;
  // Quiz
  questions?: IQuestion[];
  timeLimit?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  questionPools?: IQuestionPool[];
  // Assignment
  assignmentInstructions?: string;
  maxScore?: number;
  allowedFileTypes?: string[];
  rubric?: IRubricItem[];
  // Cards
  cards?: ICard[];
  /** Due date (yyyy-mm-dd), shown to students in their delivery calendar. */
  dueDate?: string;
}

export interface ICourseListResponse {
  courses: ICourse[];
  total: number;
  page: number;
  limit: number;
}

export interface ICourseFilters {
  status?: ECourseStatus;
  difficulty?: EDifficulty;
  search?: string;
}
