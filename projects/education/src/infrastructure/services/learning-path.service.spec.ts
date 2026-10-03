import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { LearningPathService } from './learning-path.service';
import { ELearningPathStatus } from '../../domain/model/learning-path.model';

const course = (id: number) => ({
  id, title: `Curso ${id}`, description: null, status: 'published', difficulty: 'beginner', tags: [], thumbnailUrl: null,
  instructorName: null, institutionId: 'inst-1', totalDuration: 0, totalLessons: 0, enrolledCount: 0, completionRate: 0,
  averageRating: null, ratingCount: 0, publishedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  modules: [],
});

const apiPath = {
  id: 1, title: 'DevOps', description: null, institutionId: 'inst-1', createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-02-01T00:00:00', status: 'draft', tags: ['cloud'], thumbnailUrl: null, enrolledCount: 4,
  completionRate: 25,
  steps: [{ courseId: 13, required: true, minimumScore: 70 }, { courseId: 12, required: false, minimumScore: null }],
  courses: [course(13), course(12)],
};

describe('LearningPathService', () => {
  let service: LearningPathService;
  let http: HttpTestingController;
  const url = environment.apiUrls.education.learningPaths;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LearningPathService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps status, tags, counters and per-step settings', () => {
    let path: any;
    service.getLearningPathById('1').subscribe(p => (path = p));
    http.expectOne(`${url}/1`).flush(apiPath);

    expect(path.status).toBe(ELearningPathStatus.DRAFT);
    expect(path.tags).toEqual(['cloud']);
    expect(path.enrolledCount).toBe(4);
    expect(path.completionRate).toBe(25);
    expect(path.steps.map((s: any) => [s.courseId, s.isRequired, s.minimumScore])).toEqual([
      ['13', true, 70], ['12', false, undefined],
    ]);
  });

  it('publishing keeps the course order and the step settings', () => {
    service.updateLearningPath('1', { status: ELearningPathStatus.PUBLISHED }).subscribe();
    http.expectOne(`${url}/1`).flush(apiPath);

    const put = http.expectOne(r => r.method === 'PUT');
    expect(put.request.body.status).toBe('published');
    expect(put.request.body.steps).toEqual([
      { courseId: 13, required: true, minimumScore: 70 },
      { courseId: 12, required: false, minimumScore: null },
    ]);
    put.flush({ ...apiPath, status: 'published' });
  });
});
