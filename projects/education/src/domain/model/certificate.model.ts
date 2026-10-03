export interface ICertification {
  id: string;
  resourceType: 'COURSE' | 'LEARNING_PATH';
  resourceId: string;
  resourceTitle: string;
  studentName: string;
  institutionId: string;
  instructorName?: string;
  completedAt: Date;
  issuedAt: Date;
  valid: boolean;
}
