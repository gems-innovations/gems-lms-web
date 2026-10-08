import { Injectable, signal, computed } from '@angular/core';
import {
  IEnrollment,
  ILearningPathEnrollment,
  IQuizAttempt,
  IAssignmentSubmission
} from '../model/enrollment.model';

interface IEnrollmentStateData {
  enrollments: IEnrollment[];
  pathEnrollments: ILearningPathEnrollment[];
  quizAttempts: IQuizAttempt[];
  submissions: IAssignmentSubmission[];
}

const INITIAL: IEnrollmentStateData = {
  enrollments: [],
  pathEnrollments: [],
  quizAttempts: [],
  submissions: []
};

@Injectable({ providedIn: 'root' })
export class EnrollmentState {
  private readonly _state = signal<IEnrollmentStateData>(INITIAL);

  readonly enrollments = computed(() => this._state().enrollments);
  readonly pathEnrollments = computed(() => this._state().pathEnrollments);
  readonly quizAttempts = computed(() => this._state().quizAttempts);
  readonly submissions = computed(() => this._state().submissions);

  setEnrollments(enrollments: IEnrollment[]): void {
    this._state.update(s => ({ ...s, enrollments }));
  }

  setPathEnrollments(pathEnrollments: ILearningPathEnrollment[]): void {
    this._state.update(s => ({ ...s, pathEnrollments }));
  }

  updateEnrollment(enrollment: IEnrollment): void {
    this._state.update(s => ({
      ...s,
      enrollments: s.enrollments.map(e => e.id === enrollment.id ? enrollment : e)
    }));
  }

  addEnrollment(enrollment: IEnrollment): void {
    this._state.update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment]
    }));
  }

  setQuizAttempts(quizAttempts: IQuizAttempt[]): void {
    this._state.update(s => ({ ...s, quizAttempts }));
  }

  setSubmissions(submissions: IAssignmentSubmission[]): void {
    this._state.update(s => ({ ...s, submissions }));
  }

  addQuizAttempt(attempt: IQuizAttempt): void {
    this._state.update(s => ({ ...s, quizAttempts: [...s.quizAttempts, attempt] }));
  }

  addSubmission(submission: IAssignmentSubmission): void {
    this._state.update(s => ({ ...s, submissions: [...s.submissions, submission] }));
  }

  updateSubmission(submission: IAssignmentSubmission): void {
    this._state.update(s => ({
      ...s,
      submissions: s.submissions.map(sub => sub.id === submission.id ? submission : sub)
    }));
  }

  markBlockComplete(enrollmentId: string, lessonId: string, blockId: string): void {
    this._state.update(s => ({
      ...s,
      enrollments: s.enrollments.map(e => {
        if (e.id !== enrollmentId) return e;
        const updatedProgress = {
          ...e.progress,
          currentLessonId: lessonId,
          currentBlockId: blockId,
          lastAccessedAt: new Date()
        };

        return { ...e, progress: updatedProgress };
      })
    }));
  }
}
