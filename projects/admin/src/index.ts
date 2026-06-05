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

  // ── Admin: user management ─────────────────────────────────────────────────
  {
    path: 'users',
    component: MainLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/sidebar-container/sidebar-container').then(m => m.SidebarContainer),
        outlet: 'sidebar'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/user-management-container/user-management-container').then(m => m.UserManagementContainer)
      }
    ]
  }
];
