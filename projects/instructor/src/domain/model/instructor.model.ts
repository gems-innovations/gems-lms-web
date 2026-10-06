import type {
  ICourse, IContentBlock, IEnrollment, IAssignmentSubmission, IStudentProfile, IGroup, IRubricScore, IGradebookRow,
} from 'education';

export interface ICohort {
  course: ICourse;
  group: IGroup;
  stats: ICourseStats;
}

export type TCourseDetailTab = 'overview' | 'students' | 'submissions' | 'reviews' | 'survey' | 'gradebook' | 'community' | 'enrollment';

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

/** A gradebook row with the student it belongs to. */
export interface IGradebookStudentRow extends IGradebookRow {
  student: IStudentProfile;
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
  /** Set when graded with the assignment rubric; the API then computes the grade. */
  rubricScores?: IRubricScore[];
  /** Open the next ungraded submission after saving instead of returning to the list. */
  next?: boolean;
}
