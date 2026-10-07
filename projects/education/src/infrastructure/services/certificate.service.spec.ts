import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { CertificateService } from './certificate.service';

describe('CertificateService', () => {
  let service: CertificateService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CertificateService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads durable certificate codes and dates', () => {
    let result: any[] = [];
    service.mine().subscribe(items => result = items);
    http.expectOne(`${environment.apiUrls.education.certificates}/me`).flush([{
      code: 'GEMS-ABC', studentName: 'Ana Ruiz', institutionId: 'inst-1', resourceType: 'COURSE',
      resourceId: 10, resourceTitle: 'Arquitectura', instructorName: 'Docente',
      completedAt: '2026-10-01T10:00:00', issuedAt: '2026-10-02T10:00:00', valid: true,
    }]);
    expect(result[0].id).toBe('GEMS-ABC');
    expect(result[0].resourceId).toBe('10');
    expect(result[0].completedAt instanceof Date).toBeTrue();
  });
});
