import { Routes } from '@angular/router';
import { LoginLayout } from './infrastructure/ui/layouts/login-layout/login-layout';

const passwordPage = (mode: 'forgot' | 'reset') => ({
  path: mode === 'forgot' ? 'forgot-password' : 'reset-password',
  title: mode === 'forgot' ? 'Recuperar contraseña' : 'Restablecer contraseña',
  component: LoginLayout,
  children: [
    {
      path: '',
      loadComponent: () => import('./infrastructure/ui/containers/login-aside-container/login-aside-container').then(m => m.LoginAsideContainer),
      outlet: 'right'
    },
    {
      path: '',
      data: { mode },
      loadComponent: () => import('./infrastructure/ui/containers/password-container/password-container').then(m => m.PasswordContainer),
      outlet: 'left'
    }
  ]
});

export const routes: Routes = [
  passwordPage('forgot'),
  passwordPage('reset'),
  {
    path: 'signin',
    title: 'Iniciar sesión',
    component: LoginLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/login-aside-container/login-aside-container').then(m => m.LoginAsideContainer),
        outlet: 'right'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/login-form-container/login-form-container').then(m => m.LoginFormContainer),
        outlet: 'left'
      }
    ]
  }
];

// Domain
export { EUserRole, getFullName, getRoleLabel, getRoleHomePath } from 'auth/core';
export type { IUser } from 'auth/core';
export type { IUserState } from 'auth/core';
export { UserState } from 'auth/core';

// Application
export { AuthSessionService } from 'auth/core';
export { DisplayPreferencesService } from 'auth/core';
export { LoginUseCase } from './application/login.usecase';
export { LogoutUseCase } from './application/logout.usecase';
export { PasswordUseCase } from './application/password.usecase';
export { PasswordContainer } from './infrastructure/ui/containers/password-container/password-container';
export { ProfileContainer } from './infrastructure/ui/containers/profile-container/profile-container';
export { UserManagementUseCase } from './application/user-management.usecase';
export type { ICreateUserPayload, TUserModalMode } from './application/user-management.usecase';
export { authInterceptor } from 'auth/core';
export { UserService } from './infrastructure/services/user.service';
export type { ICreatedUser, ILoginResult } from './infrastructure/services/user.service';
