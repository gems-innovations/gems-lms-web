import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { UserDirectoryService } from './user-directory.service';

describe('UserDirectoryService', () => {
  let service: UserDirectoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserDirectoryService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('accepts institutions as a list or wrapped in an object', () => {
    const lists: unknown[][] = [];
    service.institutions().subscribe(v => lists.push(v));
    service.institutions().subscribe(v => lists.push(v));
    const [first, second] = http.match(environment.apiUrls.admin.institutions);
    first.flush([{ id: 'a', name: 'A' }]);
    second.flush({ institutions: [{ id: 'b', name: 'B' }] });
    expect(lists).toEqual([[{ id: 'a', name: 'A' }], [{ id: 'b', name: 'B' }]]);
  });

  it('asks for the courses of one institution', () => {
    let titles: string[] = [];
    service.courses('inst 1').subscribe(list => titles = list.map(c => c.title));
    const request = http.expectOne(req => req.url === environment.apiUrls.education.courses);
    expect(request.request.params.get('institutionId')).toBe('inst 1');
    expect(request.request.params.get('limit')).toBe('500');
    request.flush({ courses: [{ id: 1, title: 'Cálculo' }] });
    expect(titles).toEqual(['Cálculo']);
  });

  it('runs the bulk registration as a dry run when asked', () => {
    service.bulkRegister([], true).subscribe();
    const request = http.expectOne(`${environment.apiUrls.auth.register}/bulk`);
    expect(request.request.body).toEqual({ users: [], dryRun: true });
    request.flush({ total: 0, created: 0, failed: 0, dryRun: true, rows: [] });
  });
});
