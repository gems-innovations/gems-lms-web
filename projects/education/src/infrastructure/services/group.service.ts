import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, forkJoin, map, switchMap } from 'rxjs';
import { AuthSessionService } from 'auth';
import { IGroup, INewStudentRow } from '../../domain/model/group.model';
import { EnrollmentService } from './enrollment.service';
import { CourseService } from './course.service';

const STORAGE_PREFIX = 'gems_groups_';
const VIRTUAL_PREFIX = 'all-';

/**
 * Groups (cohorts) have no API yet, so they are kept in this browser's storage, per
 * institution. Until they exist in the back end, an instructor also gets one virtual
 * group per institution course that no stored group covers: "Todos los inscritos",
 * made of the course's real enrollments.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService = inject(CourseService);
  private readonly session = inject(AuthSessionService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  getGroups(): Observable<IGroup[]> {
    return of(this.read());
  }

  getGroup(id: string): Observable<IGroup | null> {
    if (id.startsWith(VIRTUAL_PREFIX)) {
      return this.virtualGroups().pipe(map(list => list.find(g => g.id === id) ?? null));
    }
    return of(this.read().find(g => g.id === id) ?? null);
  }

  getGroupsForInstructor(instructorId: string): Observable<IGroup[]> {
    const own = this.read().filter(g => g.instructorId === instructorId);
    return this.virtualGroups().pipe(
      map(virtual => {
        const covered = new Set(own.flatMap(g => g.courseIds));
        return [...own, ...virtual.filter(v => !covered.has(v.courseIds[0]))];
      })
    );
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
    this.write([...this.read(), group]);
    return of({ ...group });
  }

  updateGroup(id: string, patch: Partial<IGroup>): Observable<IGroup | null> {
    return of(this.mutate(id, g => Object.assign(g, patch)));
  }

  /**
   * Adds the spreadsheet rows that match existing student accounts to the group and enrolls
   * them in the group's courses. Rows without an account are skipped (accounts are created
   * from "Gestión de usuarios").
   */
  addStudentsFromRows(groupId: string, rows: INewStudentRow[]): Observable<IGroup | null> {
    return this.enrollmentService.getStudents().pipe(
      switchMap(() => {
        const resolved = this.enrollmentService.addStudents(rows);
        return this.addStudentsToGroup(groupId, resolved.map(s => s.id));
      })
    );
  }

  /** Agrega estudiantes existentes al roster y los matricula en los cursos ya inscritos del grupo. */
  addStudentsToGroup(groupId: string, studentIds: string[]): Observable<IGroup | null> {
    let newIds: string[] = [];
    const group = this.mutate(groupId, g => {
      newIds = studentIds.filter(id => !g.studentIds.includes(id));
      g.studentIds.push(...newIds);
    });
    if (!group || !newIds.length || !group.courseIds.length) return of(group);
    return forkJoin(group.courseIds.map(courseId =>
      this.enrollmentService.enrollStudents(newIds, courseId, 'course', groupId)
    )).pipe(map(() => group));
  }

  /** Quita un estudiante del roster del grupo (no borra sus matrículas históricas). */
  removeStudentFromGroup(groupId: string, studentId: string): Observable<IGroup | null> {
    return of(this.mutate(groupId, g => { g.studentIds = g.studentIds.filter(id => id !== studentId); }));
  }

  /** Quita un curso del grupo (las matrículas ya creadas quedan como registro histórico). */
  removeCourseFromGroup(groupId: string, courseId: string): Observable<IGroup | null> {
    return of(this.mutate(groupId, g => { g.courseIds = g.courseIds.filter(id => id !== courseId); }));
  }

  /** Inscribe a todos los estudiantes del grupo en un curso/ruta (con groupId). */
  enrollGroup(groupId: string, targetId: string, type: 'course' | 'path'): Observable<{ success: number; skipped: number }> {
    const group = this.mutate(groupId, g => {
      if (type === 'course' && !g.courseIds.includes(targetId)) g.courseIds.push(targetId);
      if (type === 'path' && !g.pathIds.includes(targetId)) g.pathIds.push(targetId);
    });
    if (!group) return of({ success: 0, skipped: 0 });
    return this.enrollmentService.enrollStudents(group.studentIds, targetId, type, groupId);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private virtualGroups(): Observable<IGroup[]> {
    const instructorId = this.session.user()?.id ?? null;
    return forkJoin({
      courses: this.courseService.getCourses(),
      enrollments: this.enrollmentService.getAllCourseEnrollments()
    }).pipe(
      map(({ courses, enrollments }) => courses.courses.map(course => ({
        id: `${VIRTUAL_PREFIX}${course.id}`,
        name: 'Todos los inscritos',
        studentIds: enrollments.filter(e => e.courseId === course.id).map(e => e.userId),
        instructorId,
        courseIds: [course.id],
        pathIds: []
      } satisfies IGroup)))
    );
  }

  private mutate(id: string, change: (g: IGroup) => void): IGroup | null {
    const groups = this.read();
    const group = groups.find(g => g.id === id);
    if (!group) return null;
    change(group);
    this.write(groups);
    return { ...group };
  }

  private storageKey(): string {
    return `${STORAGE_PREFIX}${this.session.institutionId() ?? 'global'}`;
  }

  private read(): IGroup[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? JSON.parse(raw) as IGroup[] : [];
    } catch {
      return [];
    }
  }

  private write(groups: IGroup[]): void {
    if (!this.isBrowser) return;
    try { localStorage.setItem(this.storageKey(), JSON.stringify(groups)); } catch { /* storage unavailable */ }
  }
}
