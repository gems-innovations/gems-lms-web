import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  GroupService, EnrollmentService, CourseService, LearningPathService,
  IGroup, INewStudentRow, IStudentProfile, ICourse, ILearningPath,
} from 'education';
import { AuthSessionService, EUserRole, UserManagementUseCase, IUser } from 'auth';

export interface IGroupEnrollResult { success: number; skipped: number; }

@Injectable({ providedIn: 'root' })
export class AdminGroupsUseCase {
  private readonly groupService      = inject(GroupService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);
  private readonly userMgmt          = inject(UserManagementUseCase);
  private readonly authSession       = inject(AuthSessionService);

  private readonly _groups   = signal<IGroup[]>([]);
  private readonly _students = signal<IStudentProfile[]>([]);
  private readonly _courses  = signal<ICourse[]>([]);
  private readonly _paths    = signal<ILearningPath[]>([]);
  private readonly _isLoading = signal(true);
  private readonly _result    = signal<string | null>(null);

  private readonly _editingGroupId = signal<string | null>(null);

  readonly groups   = this._groups.asReadonly();
  readonly students = this._students.asReadonly();
  readonly courses  = this._courses.asReadonly();
  readonly paths    = this._paths.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly result   = this._result.asReadonly();

  readonly editingGroup = computed<IGroup | null>(() =>
    this._groups().find(g => g.id === this._editingGroupId()) ?? null
  );

  readonly instructors = computed<IUser[]>(() =>
    this.userMgmt.users().filter(u => u.role === EUserRole.INSTRUCTOR)
  );

  studentName(id: string): string {
    const s = this._students().find(x => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : id;
  }

  instructorName(id: string | null): string {
    if (!id) return 'Sin asignar';
    const u = this.instructors().find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  }

  courseTitles(group: IGroup): string[] {
    return group.courseIds
      .map(cid => this._courses().find(c => c.id === cid)?.title)
      .filter((t): t is string => !!t);
  }

  load(): void {
    this._isLoading.set(true);
    const instId = this.authSession.institutionId() ?? '';
    if (instId) this.userMgmt.loadUsers(instId);
    forkJoin({
      groups:   this.groupService.getGroups(),
      students: this.enrollmentService.getStudents(),
      courses:  this.courseService.getCourses(),
      paths:    this.pathService.getLearningPaths(),
    }).subscribe(({ groups, students, courses, paths }) => {
      this._groups.set(groups);
      this._students.set(students);
      this._courses.set(courses.courses);
      this._paths.set(paths.learningPaths);
      this._isLoading.set(false);
    });
  }

  private refreshGroups(): void {
    this.groupService.getGroups().subscribe(g => this._groups.set(g));
  }

  private flash(msg: string): void {
    this._result.set(msg);
    setTimeout(() => this._result.set(null), 4000);
  }

  createGroup(name: string, studentIds: string[], instructorId: string | null): void {
    this.groupService.createGroup(name, studentIds, instructorId).subscribe(() => {
      this.refreshGroups();
      this.flash(`Grupo "${name}" creado con ${studentIds.length} estudiante(s).`);
    });
  }

  createGroupFromExcel(name: string, instructorId: string | null, rows: INewStudentRow[]): void {
    this.groupService.createGroup(name, [], instructorId).subscribe(group => {
      this.groupService.addStudentsFromRows(group.id, rows).subscribe(() => {
        this.enrollmentService.getStudents().subscribe(s => this._students.set(s));
        this.refreshGroups();
        this.flash(`Grupo "${name}" creado con ${rows.length} estudiante(s) importado(s).`);
      });
    });
  }

  enrollGroup(groupId: string, targetId: string, type: 'course' | 'path'): void {
    this.groupService.enrollGroup(groupId, targetId, type).subscribe(r => {
      this.refreshGroups();
      const target = type === 'course'
        ? this._courses().find(c => c.id === targetId)?.title
        : this._paths().find(p => p.id === targetId)?.title;
      this.flash(`Grupo inscrito en "${target}" (${r.success} matriculado(s), ${r.skipped} ya existían).`);
    });
  }

  // ── Edición de grupo (drawer) ────────────────────────────────────────────────
  openEdit(groupId: string): void { this._editingGroupId.set(groupId); }
  closeEdit(): void { this._editingGroupId.set(null); }

  renameGroup(groupId: string, name: string): void {
    if (!name.trim()) return;
    this.groupService.updateGroup(groupId, { name: name.trim() }).subscribe(() => this.refreshGroups());
  }

  setInstructor(groupId: string, instructorId: string | null): void {
    this.groupService.updateGroup(groupId, { instructorId }).subscribe(() => this.refreshGroups());
  }

  addStudentsToGroup(groupId: string, studentIds: string[]): void {
    if (studentIds.length === 0) return;
    this.groupService.addStudentsToGroup(groupId, studentIds).subscribe(() => this.refreshGroups());
  }

  /** Importa estudiantes desde Excel al grupo: reutiliza los que ya existen (por correo) y crea el resto. */
  importStudentsToGroup(groupId: string, rows: INewStudentRow[]): void {
    if (rows.length === 0) return;
    this.groupService.addStudentsFromRows(groupId, rows).subscribe(() => {
      this.enrollmentService.getStudents().subscribe(s => this._students.set(s));
      this.refreshGroups();
      this.flash(`${rows.length} estudiante(s) importado(s) y agregado(s) al grupo.`);
    });
  }

  removeStudentFromGroup(groupId: string, studentId: string): void {
    this.groupService.removeStudentFromGroup(groupId, studentId).subscribe(() => this.refreshGroups());
  }

  addCourseToGroup(groupId: string, courseId: string): void {
    if (!courseId) return;
    this.groupService.enrollGroup(groupId, courseId, 'course').subscribe(() => this.refreshGroups());
  }

  removeCourseFromGroup(groupId: string, courseId: string): void {
    this.groupService.removeCourseFromGroup(groupId, courseId).subscribe(() => this.refreshGroups());
  }
}
