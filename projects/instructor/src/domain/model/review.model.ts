// Reseñas que los estudiantes dejan sobre los cursos del instructor.
// La API todavía no expone reseñas (solo averageRating/ratingCount por curso),
// así que la lista queda vacía hasta que exista ese recurso.

export interface IStudentReview {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  rating: number;      // 1–5
  comment: string;
  createdAt: Date;
}

export const COURSE_REVIEWS: IStudentReview[] = [];
