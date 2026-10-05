import { Routes } from '@angular/router';
import { MainLayout } from './infrastructure/ui/layouts/main-layout/main-layout';

export const routes: Routes = [

  {
    path: 'profile',
    title: 'Mi perfil',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('auth').then(m => m.ProfileContainer)
      }
    ]
  },

  // ── Super-admin: institution list ──────────────────────────────────────────
  {
    path: 'institutions',
    title: 'Instituciones',
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
    title: 'Panel institucional',
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
    title: 'Personas y grupos',
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
    title: 'Inscripciones',
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
    title: 'Auditoría',
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
    title: 'Períodos académicos',
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
  },
  {
    path: 'reports',
    title: 'Reportes',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/institution-reports-container/institution-reports-container').then(m => m.InstitutionReportsContainer)
      }
    ]
  }
];
