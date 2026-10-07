import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { GradebookService } from './gradebook.service';
import { EnrollmentService } from './enrollment.service';

describe('GradebookService', () => {
  let service: GradebookService;
  let http: HttpTestingController;
  const courses = environment.apiUrls.education.courses;

  const apiBook = {
    courseId: 1,
    items: [{ blockId: 10, lessonId: 100, type: 'assignment', title: 'Proyecto', weight: 3 }],
    rows: [{
      studentId: 5, enrollmentId: 50, enrollmentStatus: 'active',
      cells: [{ blockId: 10, score: null, state: 'pending', attempts: 0, submissionId: 7 }],
      currentGrade: null, finalGrade: 0,
    }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GradebookService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the course gradebook with string ids', () => {
    let book: any;
    service.course('1').subscribe(b => (book = b));
    http.expectOne(`${courses}/1/gradebook`).flush(apiBook);

    expect(book.items[0]).toEqual({ blockId: '10', lessonId: '100', type: 'assignment', title: 'Proyecto', weight: 3 });
    expect(book.rows[0].studentId).toBe('5');
    expect(book.rows[0].cells[0].submissionId).toBe('7');
    expect(book.rows[0].cells[0].state).toBe('pending');
    expect(book.rows[0].currentGrade).toBeNull();
  });

  it('reads the student own row and saves weights with PUT', () => {
    service.mine('1').subscribe();
    http.expectOne(`${courses}/1/gradebook/me`).flush(apiBook);

    service.saveWeights('1', { '10': 2 }).subscribe();
    const req = http.expectOne(`${courses}/1/gradebook/weights`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ weights: { '10': 2 } });
    req.flush(apiBook);
  });

  it('grades with the rubric instead of a direct grade when scores are given', () => {
    const enrollments = TestBed.inject(EnrollmentService);
    const url = `${environment.apiUrls.education.submissions}/7/grade`;
    const submission = {
      id: 7, studentId: 5, courseId: 1, blockId: 10, lessonId: 100, textContent: null, fileUrls: [],
      submittedAt: '2026-10-01T10:00:00', grade: 75, feedback: 'Bien', status: 'graded',
      rubricScores: [{ criterionId: 'r1', score: 15 }],
    };

    let graded: any;
    enrollments.gradeSubmission('7', 0, 'Bien', [{ criterionId: 'r1', score: 15 }]).subscribe(s => (graded = s));
    const rubricReq = http.expectOne(url);
    expect(rubricReq.request.body).toEqual({ rubricScores: [{ criterionId: 'r1', score: 15 }], feedback: 'Bien' });
    rubricReq.flush(submission);
    expect(graded.rubricScores).toEqual([{ criterionId: 'r1', score: 15 }]);

    enrollments.gradeSubmission('7', 80, 'Ok').subscribe();
    const direct = http.expectOne(url);
    expect(direct.request.body).toEqual({ grade: 80, feedback: 'Ok' });
    direct.flush({ ...submission, rubricScores: null });
  });
});
