import { Routes } from '@angular/router';
import { InstructorLayout } from './infrastructure/ui/layouts/instructor-layout/instructor-layout';

export { InstructorLayout } from './infrastructure/ui/layouts/instructor-layout/instructor-layout';

export const instructorRoutes: Routes = [
  {
    path: '',
    component: InstructorLayout,
    children: [
      { path: '', redirectTo: 'courses', pathMatch: 'full' },
      {
        path: 'courses',
        loadComponent: () =>
          import('./infrastructure/ui/containers/instructor-courses-container/instructor-courses-container')
            .then(m => m.InstructorCoursesContainer),
      },
      {
        path: 'courses/:courseId/:groupId/edit',
        loadComponent: () =>
          import('education').then(m => m.CourseEditorContainer),
      },
      {
        path: 'courses/:courseId/:groupId',
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-detail-container/course-detail-container')
            .then(m => m.CourseDetailContainer),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () =>
          import('./infrastructure/ui/containers/course-groups-container/course-groups-container')
            .then(m => m.CourseGroupsContainer),
      },
      {
        path: 'question-bank',
        loadComponent: () =>
          import('./infrastructure/ui/containers/question-bank-container/question-bank-container')
            .then(m => m.QuestionBankContainer),
      },
      {
        path: 'stats',
        loadComponent: () =>
          import('./infrastructure/ui/containers/instructor-stats-container/instructor-stats-container')
            .then(m => m.InstructorStatsContainer),
      },
    ],
  },
];
