import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { SurveyService } from './survey.service';
import { ReviewService } from './review.service';
import { NotificationService } from './notification.service';

describe('Course feedback services', () => {
  let http: HttpTestingController;
  const courses = environment.apiUrls.education.courses;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('a course without (visible) survey is null, not an error', () => {
    let survey: unknown = 'pending';
    TestBed.inject(SurveyService).getSurvey('13').subscribe(s => (survey = s));
    http.expectOne(`${courses}/13/survey`).flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(survey).toBeNull();
  });

  it('a student without a review gets null', () => {
    let review: unknown = 'pending';
    TestBed.inject(ReviewService).getMyReview('13').subscribe(r => (review = r));
    http.expectOne(`${courses}/13/reviews/me`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(review).toBeNull();
  });

  it('saves a review with its rating and comment', () => {
    TestBed.inject(ReviewService).saveReview('13', 5, 'Excelente').subscribe();
    const req = http.expectOne(`${courses}/13/review`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ rating: 5, comment: 'Excelente' });
    req.flush({ id: 1, courseId: 13, studentId: 5, rating: 5, comment: 'Excelente', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00' });
  });

  it('counts unread notifications and marks them read locally and on the server', () => {
    const notifications = TestBed.inject(NotificationService);
    const url = environment.apiUrls.education.notifications;
    notifications.refresh().subscribe();
    http.expectOne(url).flush([
      { id: 1, type: 'graded', title: 'T', message: 'm', courseId: 13, referenceId: 9, createdAt: '2026-01-02T00:00:00', read: false },
      { id: 2, type: 'graded', title: 'T', message: 'm', courseId: 13, referenceId: 8, createdAt: '2026-01-01T00:00:00', read: true },
    ]);
    expect(notifications.unreadCount()).toBe(1);

    notifications.markRead('1');
    expect(notifications.unreadCount()).toBe(0);
    expect(http.expectOne(`${url}/1/read`).request.method).toBe('PUT');
  });
});
