import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { AtRiskService } from './at-risk.service';
import type { ICourseRisk } from './at-risk.service';

describe('AtRiskService', () => {
  let service: AtRiskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AtRiskService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reads the at-risk students and normalises their ids to text', () => {
    let result: ICourseRisk | undefined;
    service.forCourse('5').subscribe(value => result = value);
    http.expectOne(`${environment.apiBaseUrl}/courses/5/at-risk`).flush({
      students: 10, high: 1, medium: 0,
      atRisk: [{ studentId: 42, score: 80, level: 'high', reasons: [], daysInactive: 9, progress: 10, currentGrade: null, missingItems: 2 }],
    });
    expect(result?.atRisk[0].studentId).toBe('42');
  });

  it('sends the reminder with an optional message', () => {
    service.remind('5', '42', '  ').subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/courses/5/at-risk/42/remind`);
    expect(request.request.body).toEqual({ message: null });
    request.flush(null);
  });
});
