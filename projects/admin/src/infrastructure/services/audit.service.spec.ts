import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends filters and reads the total header', () => {
    let result: any;
    service.search({ page: 2, limit: 20, search: 'courses', action: 'UPDATE', from: '2026-10-01' })
      .subscribe(value => result = value);
    const request = http.expectOne(req => req.url === environment.apiUrls.audit);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('action')).toBe('UPDATE');
    request.flush([{ id: 1 }], { headers: { 'X-Total-Count': '41' } });
    expect(result.total).toBe(41);
    expect(result.events.length).toBe(1);
  });
});
