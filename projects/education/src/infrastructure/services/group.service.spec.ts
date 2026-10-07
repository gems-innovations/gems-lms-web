import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { GroupService } from './group.service';

describe('GroupService', () => {
  let service: GroupService;
  let http: HttpTestingController;
  const url = environment.apiUrls.education.groups;

  const dto = { id: 3, name: 'Cohorte A', institutionId: 'inst-1', instructorId: 2, studentIds: [5, 6], courseIds: [13], pathIds: [] };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GroupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps groups from the API with string ids', () => {
    let groups: any[] = [];
    service.getGroups().subscribe(g => (groups = g));
    http.expectOne(r => r.url === url).flush([dto]);

    expect(groups).toEqual([{
      id: '3', name: 'Cohorte A', studentIds: ['5', '6'], instructorId: '2', courseIds: ['13'], pathIds: [],
    }]);
  });

  it('sends only the changed fields and unassigns the instructor explicitly', () => {
    service.updateGroup('3', { name: 'Cohorte B', instructorId: null }).subscribe();

    const req = http.expectOne(`${url}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Cohorte B', clearInstructor: true });
    req.flush({ ...dto, name: 'Cohorte B', instructorId: null });
  });

  it('removes a student by saving the roster without them', () => {
    service.removeStudentFromGroup('3', '5').subscribe();

    http.expectOne(`${url}/3`).flush(dto);
    const save = http.expectOne(r => r.method === 'PUT' && r.url === `${url}/3`);
    expect(save.request.body).toEqual({ studentIds: [6] });
    save.flush({ ...dto, studentIds: [6] });
  });

  it('uploads the groups stored in the browser before the API existed, once', () => {
    localStorage.setItem('gems_groups_global', JSON.stringify([
      { id: 'g1', name: 'Viejo', studentIds: ['5'], instructorId: null, courseIds: ['13'], pathIds: [] },
    ]));
    service.getGroups().subscribe();

    const migrate = http.expectOne(r => r.method === 'POST' && r.url === url);
    expect(migrate.request.body).toEqual(jasmine.objectContaining({ name: 'Viejo', studentIds: [5], courseIds: [13] }));
    migrate.flush(dto);
    http.expectOne(r => r.method === 'GET' && r.url === url).flush([dto]);
    expect(localStorage.getItem('gems_groups_global')).toBeNull();
  });
});
