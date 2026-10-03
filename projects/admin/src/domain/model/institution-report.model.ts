export interface ICourseReport {
  courseId: number;
  title: string;
  status: string;
  enrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  averageProgress: number;
  pendingSubmissions: number;
  averageRating: number | null;
  ratingCount: number | null;
}

export interface IInstitutionReport {
  institutionId: string;
  generatedAt: string;
  totalCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  activeStudents: number;
  completionRate: number;
  averageProgress: number;
  pendingSubmissions: number;
  courses: ICourseReport[];
}
