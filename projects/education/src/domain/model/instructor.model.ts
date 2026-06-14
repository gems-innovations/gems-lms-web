import { IContentBlock } from './course.model';
import { IEnrollment, IAssignmentSubmission } from './enrollment.model';
import { IStudentProfile } from '../../infrastructure/services/enrollment.service';

export type TInstructorTab = 'students' | 'assignments';

export interface ICourseStats {
  studentCount: number;
  avgProgress: number;
  avgGrade: number | null;
  pendingCount: number;
}

export interface IAssignmentEntry {
  block: IContentBlock;
  lessonTitle: string;
  moduleTitle: string;
  submittedCount: number;
  pendingCount: number;
  gradedCount: number;
}

export interface IEnrollmentRow extends IEnrollment {
  student: IStudentProfile;
}

export interface ISubmissionRow extends IAssignmentSubmission {
  student: IStudentProfile;
}

export interface IGradeSubmitEvent {
  submissionId: string;
  grade: number;
  feedback: string;
}
