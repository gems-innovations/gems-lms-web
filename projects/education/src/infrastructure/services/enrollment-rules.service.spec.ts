import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { EnrollmentRulesService, enrollmentErrorText } from './enrollment-rules.service';

describe('EnrollmentRulesService', () => {
  let service: EnrollmentRulesService;
  let http: HttpTestingController;
  const urls = environment.apiUrls.education;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EnrollmentRulesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('saves rules with numeric ids, the local time as an instant and no limit for empty capacity', () => {
    let saved: any;
    service.saveRules('3', { periodId: '9', opensAt: '2026-10-01T08:00', closesAt: null, capacity: null,
      selfEnrollment: false, prerequisiteIds: ['1', '2'] }).subscribe(r => (saved = r));
    const req = http.expectOne(`${urls.courses}/3/enrollment-rules`);
    expect(req.request.method).toBe('PUT');
    const opensAt = new Date('2026-10-01T08:00').toISOString();   // 08:00 del navegador, con zona
    expect(req.request.body).toEqual({ periodId: 9, opensAt, closesAt: null, capacity: null,
      selfEnrollment: false, prerequisiteIds: [1, 2] });
    req.flush({ courseId: 3, periodId: 9, opensAt, closesAt: null, capacity: null,
      selfEnrollment: false, prerequisiteIds: [1, 2] });
    expect(saved.opensAt).toBe('2026-10-01T08:00');   // vuelve a la misma hora local en el campo
  });

  it('reads the eligibility of several courses in one call', () => {
    let result: any[] = [];
    service.eligibility(['1', '2']).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url === `${urls.courses}/eligibility`);
    expect(req.request.params.get('courseIds')).toBe('1,2');
    req.flush([{ courseId: 1, allowed: false, reasons: ['FULL'], missingPrerequisites: [], seatsLeft: 0,
      opensAt: null, closesAt: '2026-11-30T23:59:59', period: { name: '2026-2' } }]);
    expect(result[0].courseId).toBe('1');
    expect(result[0].periodName).toBe('2026-2');
    expect(result[0].closesAt instanceof Date).toBeTrue();
  });

  it('turns a rejected enrollment into readable reasons', () => {
    const err = new HttpErrorResponse({ status: 409, error: { code: 'ENROLLMENT_NOT_ALLOWED', reasons: ['CLOSED', 'FULL'] } });
    expect(enrollmentErrorText(err)).toBe('La inscripción está cerrada. No quedan cupos');
    expect(enrollmentErrorText(new HttpErrorResponse({ status: 500 }))).toBeNull();
  });
});
