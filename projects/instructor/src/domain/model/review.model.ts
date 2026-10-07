// Reseñas que los estudiantes dejan sobre los cursos del instructor.
// Vienen de la API (GET /courses/{id}/reviews); el nombre se resuelve con los inscritos del curso.

export interface IStudentReview {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  rating: number;      // 1–5
  comment: string;
  createdAt: Date;
}

