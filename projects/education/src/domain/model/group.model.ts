// Grupo/cohorte: conjunto de estudiantes con un instructor asignado, inscrito
// en uno o más cursos/rutas. Distingue "curso 1 grupo 1" de "curso 1 grupo 2".

export interface IGroup {
  id: string;
  name: string;
  studentIds: string[];
  instructorId: string | null;
  courseIds: string[];
  pathIds: string[];
}

// Fila de estudiante para crear desde Excel.
export interface INewStudentRow {
  firstName: string;
  lastName: string;
  email: string;
}
