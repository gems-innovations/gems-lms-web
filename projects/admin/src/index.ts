import { Routes } from '@angular/router';
import { MainLayout } from './infrastructure/ui/layouts/main-layout/main-layout';

export const routes: Routes = [

  // ── Super-admin: institution list ──────────────────────────────────────────
  {
    path: 'institutions',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/institution-list-container/institution-list-container').then(m => m.InstitutionListContainer)
      }
    ]
  },

  // ── Admin: own institution dashboard ──────────────────────────────────────
  {
    path: 'dashboard',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/institution-dashboard-container/institution-dashboard-container').then(m => m.InstitutionDashboardContainer)
      }
    ]
  },

  // ── Admin: personas (usuarios + grupos, unificado) ──────────────────────────
  {
    path: 'people',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/people-container/people-container').then(m => m.PeopleContainer)
      }
    ]
  },

  // ── Admin: enrollment manager ──────────────────────────────────────────────
  {
    path: 'enrollments',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/enrollment-manager-container/enrollment-manager-container').then(m => m.EnrollmentManagerContainer)
      }
    ]
  },
  {
    path: 'audit',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/audit-container/audit-container').then(m => m.AuditContainer)
      }
    ]
  },
  {
    path: 'periods',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/academic-periods-container/academic-periods-container').then(m => m.AcademicPeriodsContainer)
      }
    ]
  }
];
