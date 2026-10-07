import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { QuizSessionService } from './quiz-session.service';
import { QuestionBankService } from './question-bank.service';
import { EnrollmentService } from './enrollment.service';

describe('QuizSessionService and QuestionBankService', () => {
  let http: HttpTestingController;
  const urls = environment.apiUrls.education;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts an attempt and counts the time left with the server clock', () => {
    let session: any;
    TestBed.inject(QuizSessionService).start('3', '7').subscribe(s => (session = s));
    const req = http.expectOne(`${urls.courses}/3/blocks/7/attempts/start`);
    expect(req.request.method).toBe('POST');
    req.flush({
      sessionId: 12, questions: [{ id: 'bank-4', type: 'true-false', question: '¿Sí?' }],
      startedAt: '2026-10-03T10:00:00', expiresAt: '2026-10-03T10:10:00', serverTime: '2026-10-03T10:07:30',
    });

    expect(session.sessionId).toBe('12');
    expect(session.remainingSeconds).toBe(150);
    expect(session.questions[0].id).toBe('bank-4');
  });

  it('reports a readable error when no attempts are left', () => {
    let message = '';
    TestBed.inject(QuizSessionService).start('3', '7').subscribe({ error: e => (message = e.message) });
    http.expectOne(`${urls.courses}/3/blocks/7/attempts/start`)
      .flush({ code: 'ATTEMPT_LIMIT_REACHED' }, { status: 409, statusText: 'Conflict' });
    expect(message).toContain('intentos');
  });

  it('sends the session with the answers', () => {
    TestBed.inject(EnrollmentService).submitQuiz({ blockId: '7', lessonId: '1', courseId: '3', answers: [], sessionId: '12' })
      .subscribe();
    const req = http.expectOne(`${urls.courses}/3/blocks/7/attempts`);
    expect(req.request.body).toEqual({ answers: [], sessionId: 12 });
    req.flush({ id: 1, enrollmentId: 1, studentId: 5, courseId: 3, blockId: 7, lessonId: 1, attemptNumber: 1,
      answers: [], score: 100, passed: true, feedback: [], completedAt: '2026-10-03T10:08:00' });
  });

  it('lists the bank with its total and saves questions with their type', () => {
    const bank = TestBed.inject(QuestionBankService);
    let page: any;
    bank.list({ category: 'SQL', page: 1, limit: 20 }).subscribe(p => (page = p));
    const list = http.expectOne(r => r.url === urls.questionBank);
    expect(list.request.params.get('category')).toBe('SQL');
    expect(list.request.params.get('page')).toBe('1');
    list.flush([{ id: 4, category: 'SQL', type: 'true-false', question: { question: '¿Sí?', correctAnswer: true },
      updatedAt: '2026-10-03T10:00:00' }], { headers: { 'X-Total-Count': '21' } });
    expect(page.total).toBe(21);
    expect(page.items[0].question.id).toBe('bank-4');

    bank.create('SQL', { id: 'x', type: 'true-false', question: '¿No?', points: 1, order: 1, correctAnswer: false } as any).subscribe();
    const created = http.expectOne(urls.questionBank);
    expect(created.request.body.type).toBe('true-false');
    expect(created.request.body.category).toBe('SQL');
    created.flush({ id: 5, category: 'SQL', type: 'true-false', question: {}, updatedAt: '2026-10-03T10:00:00' });
  });
});
