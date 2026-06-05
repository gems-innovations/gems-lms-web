import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  IEnrollment,
  ILearningPathEnrollment,
  IQuizAttempt,
  IAssignmentSubmission,
  ISubmitQuizRequest,
  ISubmitAssignmentRequest,
  ICourseProgress
} from '../../domain/model/enrollment.model';

const MOCK_USER_ID = 'u1';

const MOCK_ENROLLMENTS: IEnrollment[] = [
  {
    id: 'enr1',
    userId: MOCK_USER_ID,
    courseId: 'c1',
    status: 'active',
    enrolledAt: new Date('2025-01-15'),
    progress: {
      courseId: 'c1',
      overallPercentage: 35,
      completedLessons: 1,
      totalLessons: 24,
      lastAccessedAt: new Date('2025-05-20'),
      currentLessonId: 'l1-1-2',
      currentBlockId: 'cb3',
      moduleProgress: [
        { moduleId: 'm1-1', completedLessons: 1, totalLessons: 2, percentage: 50 },
        { moduleId: 'm1-2', completedLessons: 0, totalLessons: 1, percentage: 0 }
      ]
    }
  },
  {
    id: 'enr2',
    userId: MOCK_USER_ID,
    courseId: 'c2',
    status: 'active',
    enrolledAt: new Date('2025-02-01'),
    progress: {
      courseId: 'c2',
      overallPercentage: 60,
      completedLessons: 1,
      totalLessons: 38,
      lastAccessedAt: new Date('2025-05-22'),
      currentLessonId: 'l2-2-1',
      currentBlockId: 'cb9',
      moduleProgress: [
        { moduleId: 'm2-1', completedLessons: 1, totalLessons: 1, percentage: 100 },
        { moduleId: 'm2-2', completedLessons: 0, totalLessons: 1, percentage: 0 }
      ]
    }
  }
];

const MOCK_PATH_ENROLLMENTS: ILearningPathEnrollment[] = [
  {
    id: 'penr1',
    userId: MOCK_USER_ID,
    learningPathId: 'lp1',
    status: 'active',
    enrolledAt: new Date('2025-01-15'),
    completedCourseIds: [],
    currentCourseId: 'c3',
    overallPercentage: 20
  }
];

const MOCK_QUIZ_ATTEMPTS: IQuizAttempt[] = [
  {
    id: 'att1',
    blockId: 'cb4',
    lessonId: 'l1-1-2',
    courseId: 'c1',
    attemptNumber: 1,
    answers: [
      { questionId: 'q1', answer: ['a'] },
      { questionId: 'q2', answer: false },
      { questionId: 'q3', answer: ['a', 'b'] },
      { questionId: 'q4', answer: 'La clasificación predice categorías, la regresión valores continuos.' }
    ],
    score: 75,
    passed: true,
    completedAt: new Date('2025-05-18'),
    feedback: [
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: true },
      { questionId: 'q3', correct: false, explanation: 'Solo K-Means y DBSCAN son no supervisados.' },
      { questionId: 'q4', correct: true }
    ]
  }
];

const MOCK_SUBMISSIONS: IAssignmentSubmission[] = [];

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly USE_MOCK = true;

  getMyEnrollments(): Observable<IEnrollment[]> {
    if (this.USE_MOCK) {
      return of([...MOCK_ENROLLMENTS]).pipe(delay(300));
    }
    return of([]);
  }

  getMyPathEnrollments(): Observable<ILearningPathEnrollment[]> {
    if (this.USE_MOCK) {
      return of([...MOCK_PATH_ENROLLMENTS]).pipe(delay(300));
    }
    return of([]);
  }

  enrollInCourse(courseId: string): Observable<IEnrollment> {
    if (this.USE_MOCK) {
      const existing = MOCK_ENROLLMENTS.find(e => e.courseId === courseId);
      if (existing) return of(existing).pipe(delay(200));

      const enrollment: IEnrollment = {
        id: `enr${Date.now()}`,
        userId: MOCK_USER_ID,
        courseId,
        status: 'active',
        enrolledAt: new Date(),
        progress: {
          courseId,
          overallPercentage: 0,
          completedLessons: 0,
          totalLessons: 0,
          lastAccessedAt: new Date(),
          moduleProgress: []
        }
      };
      MOCK_ENROLLMENTS.push(enrollment);
      return of(enrollment).pipe(delay(400));
    }
    return of({} as IEnrollment);
  }

  updateProgress(enrollmentId: string, progress: Partial<ICourseProgress>): Observable<IEnrollment> {
    if (this.USE_MOCK) {
      const idx = MOCK_ENROLLMENTS.findIndex(e => e.id === enrollmentId);
      if (idx !== -1) {
        MOCK_ENROLLMENTS[idx] = {
          ...MOCK_ENROLLMENTS[idx],
          progress: { ...MOCK_ENROLLMENTS[idx].progress, ...progress, lastAccessedAt: new Date() }
        };
        return of(MOCK_ENROLLMENTS[idx]).pipe(delay(100));
      }
    }
    return of({} as IEnrollment);
  }

  getQuizAttempts(blockId: string): Observable<IQuizAttempt[]> {
    if (this.USE_MOCK) {
      return of(MOCK_QUIZ_ATTEMPTS.filter(a => a.blockId === blockId)).pipe(delay(200));
    }
    return of([]);
  }

  submitQuiz(req: ISubmitQuizRequest): Observable<IQuizAttempt> {
    if (this.USE_MOCK) {
      const prevAttempts = MOCK_QUIZ_ATTEMPTS.filter(a => a.blockId === req.blockId).length;
      // Simple scoring: 25 points per correct answer (mock)
      const score = Math.floor(Math.random() * 40) + 60; // 60-100 random for demo
      const attempt: IQuizAttempt = {
        id: `att${Date.now()}`,
        blockId: req.blockId,
        lessonId: req.lessonId,
        courseId: req.courseId,
        attemptNumber: prevAttempts + 1,
        answers: req.answers,
        score,
        passed: score >= 70,
        completedAt: new Date()
      };
      MOCK_QUIZ_ATTEMPTS.push(attempt);
      return of(attempt).pipe(delay(800));
    }
    return of({} as IQuizAttempt);
  }

  getSubmissions(blockId: string): Observable<IAssignmentSubmission[]> {
    if (this.USE_MOCK) {
      return of(MOCK_SUBMISSIONS.filter(s => s.blockId === blockId)).pipe(delay(200));
    }
    return of([]);
  }

  submitAssignment(req: ISubmitAssignmentRequest): Observable<IAssignmentSubmission> {
    if (this.USE_MOCK) {
      const submission: IAssignmentSubmission = {
        id: `sub${Date.now()}`,
        blockId: req.blockId,
        lessonId: req.lessonId,
        courseId: req.courseId,
        textContent: req.textContent,
        fileUrls: req.fileUrls,
        submittedAt: new Date(),
        status: 'pending'
      };
      MOCK_SUBMISSIONS.push(submission);
      return of(submission).pipe(delay(600));
    }
    return of({} as IAssignmentSubmission);
  }
}
