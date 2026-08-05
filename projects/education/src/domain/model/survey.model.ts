// Encuesta de retroalimentación por curso. La crea el instructor, la responde
// el estudiante (seccionada) y el instructor ve los resultados agregados.

export type TSurveyQuestionType = 'scale' | 'text';

export interface ISurveyQuestion {
  id: string;
  type: TSurveyQuestionType;   // 'scale' = 1–10, 'text' = campo libre
  label: string;
}

export interface ISurveySection {
  id: string;
  title: string;
  description?: string;
  questions: ISurveyQuestion[];
}

export interface ICourseSurvey {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  sections: ISurveySection[];
  isPublished: boolean;
}

export interface ISurveyAnswer {
  questionId: string;
  value: number | string;
}

export interface ISurveyResponse {
  id: string;
  surveyId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  answers: ISurveyAnswer[];
  submittedAt: Date;
}
