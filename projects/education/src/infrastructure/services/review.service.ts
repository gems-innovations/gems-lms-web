import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { environment } from 'shared';

/** A student's rating (1–5) and comment of a course. */
export interface ICourseReview {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IReviewApi {
  id: number;
  courseId: number;
  studentId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapReview(r: IReviewApi): ICourseReview {
  return {
    id: String(r.id),
    courseId: String(r.courseId),
    studentId: String(r.studentId),
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

/** Course reviews; the course's averageRating/ratingCount are updated by the API. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly coursesUrl = environment.apiUrls.education.courses;

  getReviews(courseId: string): Observable<ICourseReview[]> {
    return this.http.get<IReviewApi[]>(`${this.coursesUrl}/${courseId}/reviews`).pipe(map(list => list.map(mapReview)));
  }

  /** The signed-in student's review of the course, or null. */
  getMyReview(courseId: string): Observable<ICourseReview | null> {
    return this.http.get<IReviewApi>(`${this.coursesUrl}/${courseId}/reviews/me`).pipe(
      map(mapReview),
      catchError(err => err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  saveReview(courseId: string, rating: number, comment: string): Observable<ICourseReview> {
    return this.http.put<IReviewApi>(`${this.coursesUrl}/${courseId}/review`, { rating, comment }).pipe(map(mapReview));
  }
}
