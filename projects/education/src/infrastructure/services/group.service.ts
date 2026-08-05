import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { IGroup, INewStudentRow } from '../../domain/model/group.model';
import { EnrollmentService } from './enrollment.service';

// Grupos sembrados. c1 tiene dos grupos (A y B) → demuestra "curso 1 grupo 1"
// vs "curso 1 grupo 2". Todos asignados al instructor u-inst-1.
const GROUPS: IGroup[] = [
  { id: 'g1', name: 'Grupo A', studentIds: ['u1', 'u2', 'u3'],       instructorId: 'u-inst-1', courseIds: ['c1'], pathIds: [] },
  { id: 'g2', name: 'Grupo B', studentIds: ['u4', 'u8', 'u10'],      instructorId: 'u-inst-1', courseIds: ['c1'], pathIds: [] },
  { id: 'g3', name: 'Grupo C', studentIds: ['u5', 'u6', 'u7', 'u9'], instructorId: 'u-inst-1', courseIds: ['c2'], pathIds: [] },
];

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly enrollmentService = inject(EnrollmentService);

  getGroups(): Observable<IGroup[]> {
    return of(GROUPS.map(g => ({ ...g }))).pipe(delay(200));
  }

  getGroup(id: string): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === id);
    return of(g ? { ...g } : null).pipe(delay(150));
  }

  getGroupsForInstructor(instructorId: string): Observable<IGroup[]> {
    return of(GROUPS.filter(g => g.instructorId === instructorId).map(g => ({ ...g }))).pipe(delay(200));
  }

  createGroup(name: string, studentIds: string[], instructorId: string | null): Observable<IGroup> {
    const group: IGroup = {
      id: `g${Date.now()}`,
      name: name.trim() || 'Nuevo grupo',
      studentIds: [...studentIds],
      instructorId,
      courseIds: [],
      pathIds: [],
    };
    GROUPS.push(group);
    return of({ ...group }).pipe(delay(300));
  }

  updateGroup(id: string, patch: Partial<IGroup>): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === id);
    if (g) Object.assign(g, patch);
    return of(g ? { ...g } : null).pipe(delay(200));
  }

  /**
   * Crea (o reutiliza, si el correo ya existe) los estudiantes de las filas del Excel,
   * los agrega al grupo y los matricula en los cursos ya inscritos del grupo.
   */
  addStudentsFromRows(groupId: string, rows: INewStudentRow[]): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return of(null).pipe(delay(150));
    const resolved = this.enrollmentService.addStudents(rows);
    const newIds = resolved.map(s => s.id).filter(id => !g.studentIds.includes(id));
    g.studentIds.push(...newIds);
    for (const courseId of g.courseIds) {
      this.enrollmentService.enrollStudents(newIds, courseId, 'course', groupId).subscribe();
    }
    return of({ ...g }).pipe(delay(300));
  }

  /** Agrega estudiantes existentes al roster y los matricula en los cursos ya inscritos del grupo. */
  addStudentsToGroup(groupId: string, studentIds: string[]): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return of(null).pipe(delay(150));
    const newIds = studentIds.filter(id => !g.studentIds.includes(id));
    g.studentIds.push(...newIds);
    for (const courseId of g.courseIds) {
      this.enrollmentService.enrollStudents(newIds, courseId, 'course', groupId).subscribe();
    }
    return of({ ...g }).pipe(delay(250));
  }

  /** Quita un estudiante del roster del grupo (no borra sus matrículas históricas). */
  removeStudentFromGroup(groupId: string, studentId: string): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return of(null).pipe(delay(150));
    g.studentIds = g.studentIds.filter(id => id !== studentId);
    return of({ ...g }).pipe(delay(200));
  }

  /** Quita un curso del grupo (las matrículas ya creadas quedan como registro histórico). */
  removeCourseFromGroup(groupId: string, courseId: string): Observable<IGroup | null> {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return of(null).pipe(delay(150));
    g.courseIds = g.courseIds.filter(id => id !== courseId);
    return of({ ...g }).pipe(delay(200));
  }

  /** Inscribe a todos los estudiantes del grupo en un curso/ruta (con groupId). */
  enrollGroup(groupId: string, targetId: string, type: 'course' | 'path'): Observable<{ success: number; skipped: number }> {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return of({ success: 0, skipped: 0 }).pipe(delay(150));
    if (type === 'course' && !g.courseIds.includes(targetId)) g.courseIds.push(targetId);
    if (type === 'path'   && !g.pathIds.includes(targetId))   g.pathIds.push(targetId);
    return this.enrollmentService.enrollStudents(g.studentIds, targetId, type, groupId);
  }
}
