import { IQuizAnswer } from './enrollment.model';
import { ILesson, ICourseModule } from './course.model';

export interface IQuizSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  answers: IQuizAnswer[];
  sessionId?: string;
}

export interface IAssignmentSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  textContent: string;
  attachedFile?: File;
}

export interface IQuizResultFeedback {
  questionId: string;
  correct: boolean;
  explanation?: string;
}

export interface IQuizResult {
  score: number;
  passed: boolean;
  timeTaken?: number; // seconds
  feedback?: IQuizResultFeedback[];
}

export type EAssignmentStatus = 'pending_review' | 'graded' | 'returned';

export interface IAssignmentGrade {
  score: number;         // 0–maxScore
  maxScore: number;
  feedback: string;
  gradedAt: Date;
  gradedBy?: string;
  rubricScores?: { criterionId: string; score: number; comment?: string }[];
}

export interface IAssignmentSubmission {
  submittedAt: Date;
  textContent: string;
  fileName?: string;
  status: EAssignmentStatus;
  grade?: IAssignmentGrade;
}

export interface ICourseCertificate {
  courseId: string;
  courseTitle: string;
  studentName: string;
  completedAt: Date;
  certificateId: string;
  instructorName?: string;
  institutionName?: string;
}

export interface ISidebarLesson {
  lesson: ILesson;
  module: ICourseModule;
  lessonNumber: number;
  isSelected: boolean;
  isComplete: boolean;
}
