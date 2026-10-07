import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthSessionService, EUserRole, IUser } from 'auth/core';
import { authGuard } from './auth.guard';
import { loginRedirectGuard } from './login-redirect.guard';

const student: IUser = {
  id: '5', email: 'maria@unal.edu.co', firstName: 'María', lastName: 'López', username: 'maria',
  role: EUserRole.STUDENT, institutionId: 'inst-1', isActive: true, createdAt: new Date(), updatedAt: new Date(),
};

describe('route guards', () => {
  let session: AuthSessionService;
  let router: Router;

  const run = (guard: typeof authGuard, url: string) => TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as boolean | UrlTree;
  const path = (r: boolean | UrlTree) => (r instanceof UrlTree ? router.serializeUrl(r) : r);

  beforeEach(() => {
    localStorage.removeItem('gems_session');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
  });

  afterEach(() => session.clearSession());

  it('sends visitors without a session to sign in', () => {
    expect(path(run(authGuard, '/learn/home'))).toBe('/auth/signin');
  });

  it('lets signed-in users through', () => {
    session.saveSession(student, 'token');
    expect(run(authGuard, '/learn/home')).toBeTrue();
  });

  it('keeps users with a temporary password on the change-password page', () => {
    session.saveSession(student, 'token', true);
    expect(path(run(authGuard, '/learn/home'))).toBe('/account/password');
    expect(run(authGuard, '/account/password')).toBeTrue();
    expect(path(run(loginRedirectGuard, '/auth/signin'))).toBe('/account/password');
  });

  it('keeps the reset-password page open for signed-in users', () => {
    session.saveSession(student, 'token');
    expect(run(loginRedirectGuard, '/auth/reset-password?token=abc')).toBeTrue();
    expect(run(loginRedirectGuard, '/auth/verify-email?token=abc')).toBeTrue();
  });

  it('sends signed-in users away from the login page to their home', () => {
    expect(run(loginRedirectGuard, '/auth/signin')).toBeTrue();
    session.saveSession(student, 'token');
    expect(path(run(loginRedirectGuard, '/auth/signin'))).toBe('/learn/home');
  });
});
