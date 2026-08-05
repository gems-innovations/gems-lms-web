// Reseñas que los estudiantes dejan sobre los cursos del instructor.
// No existe data real de reseñas textuales en education, así que el módulo
// instructor aporta su propio mock (consistente con la capa USE_MOCK del resto).

export interface IStudentReview {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  rating: number;      // 1–5
  comment: string;
  createdAt: Date;
}

export const MOCK_REVIEWS: IStudentReview[] = [
  { id: 'rv1', courseId: 'c1', courseTitle: 'Introducción a la Inteligencia Artificial', studentName: 'Ana García',     rating: 5, comment: 'Explicaciones muy claras y ejemplos prácticos. Los notebooks me ayudaron muchísimo a entender el machine learning.', createdAt: new Date('2025-05-21') },
  { id: 'rv2', courseId: 'c1', courseTitle: 'Introducción a la Inteligencia Artificial', studentName: 'Diego Ramírez',  rating: 4, comment: 'Excelente contenido. Me hubiera gustado más profundidad en redes neuronales, pero en general muy bueno.', createdAt: new Date('2025-05-19') },
  { id: 'rv3', courseId: 'c1', courseTitle: 'Introducción a la Inteligencia Artificial', studentName: 'Laura Sánchez',  rating: 5, comment: 'El mejor curso de IA que he tomado. El feedback en las tareas fue muy detallado y útil.', createdAt: new Date('2025-05-15') },
  { id: 'rv4', courseId: 'c2', courseTitle: 'Desarrollo Full Stack con Angular y Node.js', studentName: 'Carlos López', rating: 5, comment: 'Aprendí a construir una app completa de cero. Las correcciones del profesor fueron clave para mejorar mi código.', createdAt: new Date('2025-05-22') },
  { id: 'rv5', courseId: 'c2', courseTitle: 'Desarrollo Full Stack con Angular y Node.js', studentName: 'Sofía Torres',  rating: 4, comment: 'Muy completo. El módulo de PostgreSQL fue retador pero valió la pena. Gracias por la retroalimentación.', createdAt: new Date('2025-05-20') },
  { id: 'rv6', courseId: 'c2', courseTitle: 'Desarrollo Full Stack con Angular y Node.js', studentName: 'Juan Rodríguez', rating: 3, comment: 'Buen curso pero algunos videos van muy rápido. El acompañamiento en las entregas compensa bastante.', createdAt: new Date('2025-05-17') },
];
