import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { InstitutionReportService } from './institution-report.service';

describe('InstitutionReportService', () => {
  let service: InstitutionReportService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InstitutionReportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads the institution report and exports its CSV', () => {
    service.get('inst-1').subscribe(report => expect(report.totalCourses).toBe(2));
    const get = http.expectOne(`${environment.apiUrls.education.reports}/institutions/inst-1`);
    get.flush({ totalCourses: 2 });
    service.exportCsv('inst-1').subscribe(blob => expect(blob.type).toBe('text/csv'));
    const exportRequest = http.expectOne(`${environment.apiUrls.education.reports}/institutions/inst-1/export`);
    expect(exportRequest.request.responseType).toBe('blob');
    exportRequest.flush(new Blob(['Curso'], { type: 'text/csv' }));
  });
});
