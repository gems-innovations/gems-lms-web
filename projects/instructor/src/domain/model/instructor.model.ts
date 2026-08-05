import type {
  ICourse, IContentBlock, IEnrollment, IAssignmentSubmission, IStudentProfile, IGroup,
} from 'education';

export interface ICohort {
  course: ICourse;
  group: IGroup;
  stats: ICourseStats;
}

export type TCourseDetailTab = 'overview' | 'students' | 'submissions' | 'reviews' | 'survey';

export interface IStudentGradeRow {
  blockId: string;
  title: string;
  grade: number | null;
  groupAvg: number | null;
  status: string;          // 'graded' | 'pending' | 'returned' | 'missing'
}

export interface ICourseStats {
  studentCount: number;
  avgProgress: number;
  avgGrade: number | null;
  pendingCount: number;
}

export interface ICourseWithStats {
  course: ICourse;
  stats: ICourseStats;
}

export interface IEnrollmentRow extends IEnrollment {
  student: IStudentProfile;
}

export interface ISubmissionRow extends IAssignmentSubmission {
  student: IStudentProfile;
}

export interface IAssignmentEntry {
  block: IContentBlock;
  lessonTitle: string;
  moduleTitle: string;
  submittedCount: number;
  pendingCount: number;
  gradedCount: number;
}

export interface IGradeSubmitEvent {
  submissionId: string;
  grade: number;
  feedback: string;
}
