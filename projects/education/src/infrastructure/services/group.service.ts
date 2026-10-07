import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, map, switchMap, catchError, concatMap, toArray, from } from 'rxjs';
import { environment } from 'shared';
import { AuthSessionService } from 'auth';
import { IGroup, INewStudentRow } from '../../domain/model/group.model';
import { EnrollmentService } from './enrollment.service';
import { CourseService } from './course.service';

/** Groups kept in this browser before the API existed; migrated once and then removed. */
const LEGACY_STORAGE_PREFIX = 'gems_groups_';
const VIRTUAL_PREFIX = 'all-';

interface GroupDto {
  id: number;
  name: string;
  institutionId: string;
  instructorId: number | null;
  studentIds: number[];
  courseIds: number[];
  pathIds: number[];
}

/** Partial update (PUT on the API): fields left out stay as they are. */
interface GroupPatch {
  name?: string;
  instructorId?: number;
  clearInstructor?: boolean;
  studentIds?: number[];
  courseIds?: number[];
  pathIds?: number[];
}

/**
 * Groups (cohorts) of the institution, stored by ms-education (`/groups`). An instructor also
 * gets one virtual group per institution course that no real group covers: "Todos los
 * inscritos", made of the course's real enrollments.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService = inject(CourseService);
  private readonly session = inject(AuthSessionService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = environment.apiUrls.education.groups;

  getGroups(): Observable<IGroup[]> {
    return this.migrateLegacy().pipe(
      switchMap(() => this.http.get<GroupDto[]>(this.url, { params: this.institutionParam() })),
      map(list => list.map(toGroup))
    );
  }

  getGroup(id: string): Observable<IGroup | null> {
    if (!id) return of(null);
    if (id.startsWith(VIRTUAL_PREFIX)) {
      return this.virtualGroups().pipe(map(list => list.find(g => g.id === id) ?? null));
    }
    if (!/^\d+$/.test(id)) return of(null);
    return this.http.get<GroupDto>(`${this.url}/${id}`).pipe(map(toGroup), catchError(() => of(null)));
  }

  getGroupsForInstructor(instructorId: string): Observable<IGroup[]> {
    return forkJoin({
      own: this.getGroups().pipe(
        map(list => list.filter(g => g.instructorId === instructorId)),
        catchError(() => of([] as IGroup[]))
      ),
      virtual: this.virtualGroups()
    }).pipe(
      map(({ own, virtual }) => {
        const covered = new Set(own.flatMap(g => g.courseIds));
        return [...own, ...virtual.filter(v => !covered.has(v.courseIds[0]))];
      })
    );
  }

  createGroup(name: string, studentIds: string[], instructorId: string | null): Observable<IGroup> {
    return this.http.post<GroupDto>(this.url, {
      name: name.trim() || 'Nuevo grupo',
      institutionId: this.session.institutionId() ?? undefined,
      instructorId: toId(instructorId),
      studentIds: toIds(studentIds),
    }).pipe(map(toGroup));
  }

  updateGroup(id: string, patch: Partial<IGroup>): Observable<IGroup | null> {
    const body: GroupPatch = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.instructorId !== undefined) {
      const instructor = toId(patch.instructorId);
      if (instructor == null) body.clearInstructor = true;
      else body.instructorId = instructor;
    }
    if (patch.studentIds) body.studentIds = toIds(patch.studentIds);
    if (patch.courseIds) body.courseIds = toIds(patch.courseIds);
    if (patch.pathIds) body.pathIds = toIds(patch.pathIds);
    return this.patch(id, body);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
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
    return this.getGroup(groupId).pipe(
      switchMap(group => {
        if (!group) return of(null);
        const newIds = studentIds.filter(id => !group.studentIds.includes(id));
        if (!newIds.length) return of(group);
        return this.updateGroup(groupId, { studentIds: [...group.studentIds, ...newIds] }).pipe(
          switchMap(updated => {
            if (!updated || !updated.courseIds.length) return of(updated);
            return forkJoin(updated.courseIds.map(courseId =>
              this.enrollmentService.enrollStudents(newIds, courseId, 'course', groupId)
            )).pipe(map(() => updated));
          })
        );
      })
    );
  }

  /** Quita un estudiante del roster del grupo (no borra sus matrículas históricas). */
  removeStudentFromGroup(groupId: string, studentId: string): Observable<IGroup | null> {
    return this.change(groupId, g => ({ studentIds: g.studentIds.filter(id => id !== studentId) }));
  }

  /** Quita un curso del grupo (las matrículas ya creadas quedan como registro histórico). */
  removeCourseFromGroup(groupId: string, courseId: string): Observable<IGroup | null> {
    return this.change(groupId, g => ({ courseIds: g.courseIds.filter(id => id !== courseId) }));
  }

  /** Inscribe a todos los estudiantes del grupo en un curso/ruta (con groupId). */
  enrollGroup(groupId: string, targetId: string, type: 'course' | 'path'): Observable<{ success: number; skipped: number }> {
    return this.change(groupId, g => type === 'course'
      ? { courseIds: g.courseIds.includes(targetId) ? g.courseIds : [...g.courseIds, targetId] }
      : { pathIds: g.pathIds.includes(targetId) ? g.pathIds : [...g.pathIds, targetId] }
    ).pipe(
      switchMap(group => group
        ? this.enrollmentService.enrollStudents(group.studentIds, targetId, type, groupId)
        : of({ success: 0, skipped: 0 }))
    );
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Reads the group, derives a change from it and saves only that change. */
  private change(groupId: string, derive: (g: IGroup) => Partial<IGroup>): Observable<IGroup | null> {
    return this.getGroup(groupId).pipe(
      switchMap(group => group ? this.updateGroup(groupId, derive(group)) : of(null))
    );
  }

  private patch(id: string, body: GroupPatch): Observable<IGroup | null> {
    return this.http.put<GroupDto>(`${this.url}/${id}`, body).pipe(map(toGroup));
  }

  /** The super admin lists the groups of the institution they are looking at, if any. */
  private institutionParam(): Record<string, string> {
    const institutionId = this.session.institutionId();
    return institutionId ? { institutionId } : {};
  }

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

  /** Uploads the groups this browser stored before the API existed, then forgets them. */
  private migrateLegacy(): Observable<void> {
    if (!this.isBrowser) return of(undefined);
    const key = `${LEGACY_STORAGE_PREFIX}${this.session.institutionId() ?? 'global'}`;
    let legacy: IGroup[] = [];
    try {
      legacy = JSON.parse(localStorage.getItem(key) ?? '[]') as IGroup[];
      localStorage.removeItem(key);
    } catch {
      return of(undefined);
    }
    if (!legacy.length) return of(undefined);
    return from(legacy).pipe(
      concatMap(g => this.http.post<GroupDto>(this.url, {
        name: g.name,
        institutionId: this.session.institutionId() ?? undefined,
        instructorId: toId(g.instructorId),
        studentIds: toIds(g.studentIds),
        courseIds: toIds(g.courseIds),
        pathIds: toIds(g.pathIds),
      }).pipe(catchError(() => of(null)))),
      toArray(),
      map(() => undefined)
    );
  }
}

function toGroup(dto: GroupDto): IGroup {
  return {
    id: String(dto.id),
    name: dto.name,
    studentIds: dto.studentIds.map(String),
    instructorId: dto.instructorId == null ? null : String(dto.instructorId),
    courseIds: dto.courseIds.map(String),
    pathIds: dto.pathIds.map(String),
  };
}

function toId(id: string | null | undefined): number | undefined {
  const n = Number(id);
  return id != null && id !== '' && Number.isFinite(n) ? n : undefined;
}

function toIds(ids: string[] | undefined): number[] {
  return (ids ?? []).map(toId).filter((n): n is number => n !== undefined);
}
