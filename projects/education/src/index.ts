import { Routes } from '@angular/router';
import { EducationLayout } from './infrastructure/ui/layouts/education-layout/education-layout';
import { StudentLayout } from './infrastructure/ui/layouts/student-layout/student-layout';

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
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-player-container/course-player-container').then(
            m => m.CoursePlayerContainer
          )
      },

      // Learning path player
      {
        path: 'paths/:id',
        loadComponent: () =>
          import('./infrastructure/ui/containers/learning-path-player-container/learning-path-player-container').then(
            m => m.LearningPathPlayerContainer
          )
      }
    ]
  }
];
