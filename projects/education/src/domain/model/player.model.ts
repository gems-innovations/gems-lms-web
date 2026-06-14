import { IQuizAnswer } from './enrollment.model';
import { ILesson, ICourseModule } from './course.model';

export interface IQuizSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  answers: IQuizAnswer[];
}

export interface IAssignmentSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  textContent: string;
}

export interface IQuizResultFeedback {
  questionId: string;
  correct: boolean;
  explanation?: string;
}

export interface IQuizResult {
  score: number;
  passed: boolean;
  feedback?: IQuizResultFeedback[];
}

export interface ISidebarLesson {
  lesson: ILesson;
  module: ICourseModule;
  lessonNumber: number;
  isSelected: boolean;
  isComplete: boolean;
}
