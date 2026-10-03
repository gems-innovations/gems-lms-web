import { Routes } from '@angular/router';
import { EducationLayout } from './infrastructure/ui/layouts/education-layout/education-layout';
import { StudentLayout } from './infrastructure/ui/layouts/student-layout/student-layout';
import { quizDeactivateGuard } from './infrastructure/ui/guards/quiz-deactivate.guard';

// ── Public API for cross-library use ────────────────────────────────────────
export { EducationLayout } from './infrastructure/ui/layouts/education-layout/education-layout';
export { StudentLayout } from './infrastructure/ui/layouts/student-layout/student-layout';
export { EducationSidebarContainer } from './infrastructure/ui/containers/education-sidebar-container/education-sidebar-container';
export { CourseEditorContainer } from './infrastructure/ui/containers/course-editor-container/course-editor-container';
export { PlayerContentBlock } from './infrastructure/ui/components/player-content-block/player-content-block';
export { EnrollStudentSearch } from './infrastructure/ui/components/enroll-student-search/enroll-student-search';
export { EnrollResultBanner } from './infrastructure/ui/components/enroll-result-banner/enroll-result-banner';
export { EnrollmentService } from './infrastructure/services/enrollment.service';
export type { IStudentProfile } from './infrastructure/services/enrollment.service';
export { CourseService } from './infrastructure/services/course.service';
export { LearningPathService } from './infrastructure/services/learning-path.service';
export { NotificationService } from './infrastructure/services/notification.service';
export type { IInstructorNotification } from './infrastructure/services/notification.service';
export { GroupService } from './infrastructure/services/group.service';
export type { IGroup, INewStudentRow } from './domain/model/group.model';
export { SurveyService } from './infrastructure/services/survey.service';
export { ReviewService } from './infrastructure/services/review.service';
export type { ICourseReview } from './infrastructure/services/review.service';
export { NotificationBell } from './infrastructure/ui/components/notification-bell/notification-bell';
export type {
  ICourseSurvey, ISurveySection, ISurveyQuestion, ISurveyResponse, ISurveyAnswer,
  TSurveyQuestionType,
} from './domain/model/survey.model';
export type { ICourse, IContentBlock } from './domain/model/course.model';
export { EContentType, EDifficulty, ECourseStatus } from './domain/model/course.model';
export type { ILearningPath, ELearningPathStatus } from './domain/model/learning-path.model';
export type { IEnrollment, IAssignmentSubmission } from './domain/model/enrollment.model';

// ── Content child routes (sin layout wrapper, sin sidebar) ──────────────────
// Usados por main/app.routes.ts para componer el layout junto con instructor
export const educationChildRoutes: Routes = [
  { path: '', redirectTo: 'courses', pathMatch: 'full' },

  {
    path: 'courses',
    loadComponent: () =>
      import('./infrastructure/ui/containers/course-list-container/course-list-container').then(
        m => m.CourseListContainer
      )
  },
  {
    path: 'courses/:id/edit',
    loadComponent: () =>
      import('./infrastructure/ui/containers/course-editor-container/course-editor-container').then(
        m => m.CourseEditorContainer
      )
  },
  {
    path: 'learning-paths',
    loadComponent: () =>
      import('./infrastructure/ui/containers/learning-path-list-container/learning-path-list-container').then(
        m => m.LearningPathListContainer
      )
  },
  {
    path: 'learning-paths/:id/edit',
    loadComponent: () =>
      import('./infrastructure/ui/containers/learning-path-editor-container/learning-path-editor-container').then(
        m => m.LearningPathEditorContainer
      )
  },
  {
    path: 'enrollments',
    loadComponent: () =>
      import('./infrastructure/ui/containers/enrollment-manager-container/enrollment-manager-container').then(
        m => m.EnrollmentManagerContainer
      )
  }
];

// ── Admin / authoring routes (mantiene retrocompatibilidad) ─────────────────
export const routes: Routes = [
  {
    path: '',
    component: EducationLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./infrastructure/ui/containers/education-sidebar-container/education-sidebar-container').then(
            m => m.EducationSidebarContainer
          ),
        outlet: 'sidebar'
      },
      ...educationChildRoutes
    ]
  }
];

// ── Student inner routes (sin layout wrapper) ────────────────────────────────
// Usados por main/app.routes.ts para componer con instructor bajo StudentLayout
export const studentChildRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: 'home',
    loadComponent: () =>
      import('./infrastructure/ui/containers/student-home-container/student-home-container').then(
        m => m.StudentHomeContainer
      )
  },
  {
    path: 'courses/:id/survey',
    loadComponent: () =>
      import('./infrastructure/ui/containers/course-survey-container/course-survey-container').then(
        m => m.CourseSurveyContainer
      )
  },
  {
    path: 'courses/:id',
    canDeactivate: [quizDeactivateGuard],
    loadComponent: () =>
      import('./infrastructure/ui/containers/course-player-container/course-player-container').then(
        m => m.CoursePlayerContainer
      )
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./infrastructure/ui/containers/course-catalog-container/course-catalog-container').then(
        m => m.CourseCatalogContainer
      )
  },
  {
    path: 'my-learning',
    loadComponent: () =>
      import('./infrastructure/ui/containers/my-learning-container/my-learning-container').then(
        m => m.MyLearningContainer
      )
  },
  {
    path: 'preview/courses/:id',
    data: { previewType: 'course' },
    loadComponent: () =>
      import('./infrastructure/ui/containers/content-preview-container/content-preview-container').then(
        m => m.ContentPreviewContainer
      )
  },
  {
    path: 'preview/paths/:id',
    data: { previewType: 'path' },
    loadComponent: () =>
      import('./infrastructure/ui/containers/content-preview-container/content-preview-container').then(
        m => m.ContentPreviewContainer
      )
  }
];

// ── Student / consumption routes ────────────────────────────────────────────
export const studentRoutes: Routes = [
  { path: '', component: StudentLayout, children: studentChildRoutes }
];
