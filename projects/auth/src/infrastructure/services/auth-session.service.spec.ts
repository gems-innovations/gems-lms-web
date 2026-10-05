import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthSessionService } from 'auth/core';
import { EUserRole, IUser } from 'auth/core';

/** A JWT-shaped token whose payload carries the given claims (the signature is never checked here). */
function token(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'HS512' })}.${b64(claims)}.signature`;
}

const user: IUser = {
  id: '5', email: 'maria@unal.edu.co', firstName: 'María', lastName: 'López', username: 'maria',
  role: EUserRole.STUDENT, institutionId: 'inst-1', isActive: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
};

describe('AuthSessionService', () => {
  let session: AuthSessionService;

  beforeEach(() => {
    localStorage.removeItem('gems_session');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => localStorage.removeItem('gems_session'));

  it('remembers that the user must change a temporary password until they do', () => {
    session.saveSession(user, token({ institutionId: 'inst-1' }), true);
    expect(session.mustChangePassword()).toBeTrue();
    expect(JSON.parse(localStorage.getItem('gems_session')!).mustChangePassword).toBeTrue();

    session.passwordChanged();
    expect(session.mustChangePassword()).toBeFalse();
    expect(JSON.parse(localStorage.getItem('gems_session')!).mustChangePassword).toBeFalse();
  });

  it('restores a stored session', () => {
    localStorage.setItem('gems_session', JSON.stringify({ user, token: token({ institutionId: 'inst-1' }) }));
    session.restoreSession();

    expect(session.isAuthenticated()).toBeTrue();
    expect(session.institutionId()).toBe('inst-1');
    expect(session.getHomeRoute()).toContain('/learn');
  });

  it('drops a stored token that predates the institutionId claim', () => {
    localStorage.setItem('gems_session', JSON.stringify({ user, token: token({ sub: '5' }) }));
    session.restoreSession();

    expect(session.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('gems_session')).toBeNull();
  });

  it('clears everything on logout', () => {
    session.saveSession(user, token({ institutionId: 'inst-1' }), true);
    session.clearSession();

    expect(session.isAuthenticated()).toBeFalse();
    expect(session.mustChangePassword()).toBeFalse();
    expect(localStorage.getItem('gems_session')).toBeNull();
  });
});
