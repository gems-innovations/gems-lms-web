import { Routes } from '@angular/router';
import { EducationLayout } from './infrastructure/ui/layouts/education-layout/education-layout';
import { StudentLayout } from './infrastructure/ui/layouts/student-layout/student-layout';
import { quizDeactivateGuard } from './infrastructure/ui/guards/quiz-deactivate.guard';

// ── Public API for cross-library use ────────────────────────────────────────
export { EnrollStudentSearch } from './infrastructure/ui/components/enroll-student-search/enroll-student-search';
export { EnrollResultBanner } from './infrastructure/ui/components/enroll-result-banner/enroll-result-banner';
export { EnrollmentService } from './infrastructure/services/enrollment.service';
export type { IStudentProfile } from './infrastructure/services/enrollment.service';
export { CourseService } from './infrastructure/services/course.service';
export { LearningPathService } from './infrastructure/services/learning-path.service';
export type { ICourse, EDifficulty, ECourseStatus } from './domain/model/course.model';
export type { ILearningPath, ELearningPathStatus } from './domain/model/learning-path.model';

// ── Admin / authoring routes ────────────────────────────────────────────────
export const routes: Routes = [
  {
    path: '',
    component: EducationLayout,
    children: [
      // Sidebar rendered in named outlet — persists across all child routes
      {
        path: '',
        loadComponent: () =>
          import('./infrastructure/ui/containers/education-sidebar-container/education-sidebar-container').then(
            m => m.EducationSidebarContainer
          ),
        outlet: 'sidebar'
      },

      // Default redirect
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full'
      },

      // Courses list
      {
        path: 'courses',
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-list-container/course-list-container').then(
            m => m.CourseListContainer
          )
      },

      // Course curriculum editor
      {
        path: 'courses/:id/edit',
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-editor-container/course-editor-container').then(
            m => m.CourseEditorContainer
          )
      },

      // Learning paths list
      {
        path: 'learning-paths',
        loadComponent: () =>
          import('./infrastructure/ui/containers/learning-path-list-container/learning-path-list-container').then(
            m => m.LearningPathListContainer
          )
      },

      // Learning path editor / sequencer
      {
        path: 'learning-paths/:id/edit',
        loadComponent: () =>
          import('./infrastructure/ui/containers/learning-path-editor-container/learning-path-editor-container').then(
            m => m.LearningPathEditorContainer
          )
      },

      // Instructor panel (students + grading)
      {
        path: 'instructor',
        loadComponent: () =>
          import('./infrastructure/ui/containers/instructor-container/instructor-container').then(
            m => m.InstructorContainer
          )
      },

      // Enrollment manager (individual + bulk)
      {
        path: 'enrollments',
        loadComponent: () =>
          import('./infrastructure/ui/containers/enrollment-manager-container/enrollment-manager-container').then(
            m => m.EnrollmentManagerContainer
          )
      }
    ]
  }
];

// ── Student / consumption routes ────────────────────────────────────────────
export const studentRoutes: Routes = [
  {
    path: '',
    component: StudentLayout,
    children: [
      // Default redirect to home
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },

      // Student home dashboard
      {
        path: 'home',
        loadComponent: () =>
          import('./infrastructure/ui/containers/student-home-container/student-home-container').then(
            m => m.StudentHomeContainer
          )
      },

      // Course player
      {
        path: 'courses/:id',
        canDeactivate: [quizDeactivateGuard],
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-player-container/course-player-container').then(
            m => m.CoursePlayerContainer
          )
      },

      // Course catalog (self-enroll)
      {
        path: 'catalog',
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-catalog-container/course-catalog-container').then(
            m => m.CourseCatalogContainer
          )
      },

      // Mi Aprendizaje — cursos, rutas, certificaciones, tareas
      {
        path: 'my-learning',
        loadComponent: () =>
          import('./infrastructure/ui/containers/my-learning-container/my-learning-container').then(
            m => m.MyLearningContainer
          )
      },

      // Content preview (course or path, locked until enrolled)
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
    ]
  }
];
