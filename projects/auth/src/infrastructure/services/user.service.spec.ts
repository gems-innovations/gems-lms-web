import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { UserService } from './user.service';
import { EUserRole } from '../../domain/model/user.model';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  const urls = environment.apiUrls;

  const apiUser = {
    userId: 7, firstName: 'Ana', lastName: 'Ruiz', username: 'ana', email: 'ana@unal.edu.co', role: 'INSTRUCTOR',
    institutionId: 'inst-1', avatarUrl: null, active: true, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the login response, including the temporary-password flag', () => {
    let result: any;
    service.login({ email: 'ana@unal.edu.co', password: 'x' }).subscribe(r => (result = r));
    http.expectOne(urls.auth.login).flush({ ...apiUser, token: 't', mustChangePassword: true });

    expect(result.token).toBe('t');
    expect(result.mustChangePassword).toBeTrue();
    expect(result.user.id).toBe('7');
    expect(result.user.role).toBe(EUserRole.INSTRUCTOR);
  });

  it('asks the backend to delete the account and its learning data', () => {
    let done = false;
    service.deleteUser('7').subscribe(() => (done = true));

    const account = http.expectOne(`${urls.users}/7`);
    expect(account.request.method).toBe('DELETE');
    account.flush(null);
    http.expectNone(`${urls.education.students}/7/learning-data`);

    expect(done).toBeTrue();
  });

  it('toggles the status with PUT (the gateway does not allow PATCH)', () => {
    service.toggleUserStatus('7').subscribe();
    const req = http.expectOne(`${urls.users}/7/status`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...apiUser, active: false });
  });

  it('updates only profile fields while preserving the account role and institution', () => {
    const user = { id: '7', firstName: 'Ana', lastName: 'Ruiz', username: 'ana', email: 'ana@unal.edu.co',
      role: EUserRole.INSTRUCTOR, institutionId: 'inst-1', isActive: true, createdAt: new Date(), updatedAt: new Date() };
    let updated: any;
    service.updateProfile(user, { firstName: 'Ana María', lastName: 'Rojas', username: 'amrojas', avatarUrl: 'https://cdn.example/avatar.png' })
      .subscribe(value => updated = value);

    const req = http.expectOne(`${urls.users}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      firstName: 'Ana María', lastName: 'Rojas', username: 'amrojas', avatarUrl: 'https://cdn.example/avatar.png',
      role: 'INSTRUCTOR', institutionId: 'inst-1'
    });
    req.flush({ ...apiUser, firstName: 'Ana María', lastName: 'Rojas', username: 'amrojas', avatarUrl: 'https://cdn.example/avatar.png' });
    expect(updated.username).toBe('amrojas');
  });

  it('propagates a failed backend cleanup instead of reporting successful deletion', () => {
    let failure: any;
    service.deleteUser('7').subscribe({
      next: () => fail('Cleanup must complete before deletion succeeds'),
      error: error => failure = error,
    });
    http.expectOne(`${urls.users}/7`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(failure?.status).toBe(503);
  });

  it('does not purge learning data when account deletion is forbidden', () => {
    service.deleteUser('7').subscribe({ error: error => expect(error.status).toBe(403) });
    http.expectOne(`${urls.users}/7`).flush(null, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${urls.education.students}/7/learning-data`);
  });

  it('sends password changes and recovery requests to the auth API', () => {
    service.changePassword('Old1!aaa', 'New1!aaa').subscribe();
    expect(http.expectOne(`${urls.auth.base}/change-password`).request.body)
      .toEqual({ currentPassword: 'Old1!aaa', newPassword: 'New1!aaa' });

    service.forgotPassword('ana@unal.edu.co').subscribe();
    expect(http.expectOne(`${urls.auth.base}/forgot-password`).request.body).toEqual({ email: 'ana@unal.edu.co' });

    service.resetPassword('tok', 'New1!aaa').subscribe();
    expect(http.expectOne(`${urls.auth.base}/reset-password`).request.body).toEqual({ token: 'tok', newPassword: 'New1!aaa' });
  });
});
