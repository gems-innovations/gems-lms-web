import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService, EUserRole, authInterceptor } from 'auth/core';
import type { IUser } from 'auth/core';
import { environment } from 'shared/core';

const user: IUser = {
  id: '5', email: 'maria@unal.edu.co', firstName: 'María', lastName: 'López', username: 'maria',
  role: EUserRole.STUDENT, isActive: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    localStorage.removeItem('gems_session');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.saveSession(user, 'secret-token');
  });

  afterEach(() => {
    controller.verify();
    localStorage.removeItem('gems_session');
  });

  it('sends the token to the API only', () => {
    http.get(`${environment.apiBaseUrl}/courses`).subscribe();
    expect(controller.expectOne(`${environment.apiBaseUrl}/courses`).request.headers.get('Authorization'))
      .toBe('Bearer secret-token');

    http.get('https://cdn.example.com/lib.js').subscribe();
    expect(controller.expectOne('https://cdn.example.com/lib.js').request.headers.has('Authorization')).toBeFalse();
  });

  it('does not send the token on login', () => {
    http.post(environment.apiUrls.auth.login, {}).subscribe();
    expect(controller.expectOne(environment.apiUrls.auth.login).request.headers.has('Authorization')).toBeFalse();
  });

  it('ends the session and goes to sign in when the API answers 401', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    http.get(`${environment.apiBaseUrl}/courses`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiBaseUrl}/courses`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(session.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/auth/signin']);
  });
});
