import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, switchMap } from 'rxjs';
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
    }).subscribe({
      next: ({ groups, students, courses, paths }) => {
        this._groups.set(groups);
        this._students.set(students);
        this._courses.set(courses.courses);
        this._paths.set(paths.learningPaths);
        this._isLoading.set(false);
      },
      error: () => {
        this._isLoading.set(false);
        this.flash('No se pudieron cargar los grupos. Intenta de nuevo.');
      },
    });
  }

  private refreshGroups(): void {
    this.groupService.getGroups().subscribe({ next: g => this._groups.set(g), error: () => this.fail() });
  }

  /** Re-syncs with the server after a failed change, so the screen never shows unsaved data. */
  private fail(): void {
    this.flash('No se pudo guardar el cambio del grupo.');
    this.groupService.getGroups().subscribe({ next: g => this._groups.set(g), error: () => {} });
  }

  private flash(msg: string): void {
    this._result.set(msg);
    setTimeout(() => this._result.set(null), 4000);
  }

  createGroup(name: string, studentIds: string[], instructorId: string | null): void {
    this.groupService.createGroup(name, studentIds, instructorId).subscribe({
      next: () => {
        this.refreshGroups();
        this.flash(`Grupo "${name}" creado con ${studentIds.length} estudiante(s).`);
      },
      error: () => this.fail(),
    });
  }

  createGroupFromExcel(name: string, instructorId: string | null, rows: INewStudentRow[]): void {
    this.groupService.createGroup(name, [], instructorId).pipe(
      switchMap(group => this.groupService.addStudentsFromRows(group.id, rows))
    ).subscribe({
      next: () => {
        this.enrollmentService.getStudents().subscribe(s => this._students.set(s));
        this.refreshGroups();
        this.flash(`Grupo "${name}" creado con ${rows.length} estudiante(s) importado(s).`);
      },
      error: () => this.fail(),
    });
  }

  enrollGroup(groupId: string, targetId: string, type: 'course' | 'path'): void {
    this.groupService.enrollGroup(groupId, targetId, type).subscribe({
      next: r => {
        this.refreshGroups();
        const target = type === 'course'
          ? this._courses().find(c => c.id === targetId)?.title
          : this._paths().find(p => p.id === targetId)?.title;
        this.flash(`Grupo inscrito en "${target}" (${r.success} matriculado(s), ${r.skipped} ya existían).`);
      },
      error: () => this.fail(),
    });
  }

  // ── Edición de grupo (drawer) ────────────────────────────────────────────────
  openEdit(groupId: string): void { this._editingGroupId.set(groupId); }
  closeEdit(): void { this._editingGroupId.set(null); }

  /** Borra el grupo; las matrículas de sus estudiantes se conservan. */
  deleteGroup(groupId: string): void {
    const name = this._groups().find(g => g.id === groupId)?.name ?? '';
    this.groupService.deleteGroup(groupId).subscribe({
      next: () => {
        this._editingGroupId.set(null);
        this.refreshGroups();
        this.flash(`Grupo "${name}" eliminado.`);
      },
      error: () => this.fail(),
    });
  }

  renameGroup(groupId: string, name: string): void {
    if (!name.trim()) return;
    this.groupService.updateGroup(groupId, { name: name.trim() }).subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }

  setInstructor(groupId: string, instructorId: string | null): void {
    this.groupService.updateGroup(groupId, { instructorId }).subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }

  addStudentsToGroup(groupId: string, studentIds: string[]): void {
    if (studentIds.length === 0) return;
    this.groupService.addStudentsToGroup(groupId, studentIds).subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }

  /** Importa estudiantes desde Excel al grupo: reutiliza los que ya existen (por correo) y crea el resto. */
  importStudentsToGroup(groupId: string, rows: INewStudentRow[]): void {
    if (rows.length === 0) return;
    this.groupService.addStudentsFromRows(groupId, rows).subscribe({
      next: () => {
        this.enrollmentService.getStudents().subscribe(s => this._students.set(s));
        this.refreshGroups();
        this.flash(`${rows.length} estudiante(s) importado(s) y agregado(s) al grupo.`);
      },
      error: () => this.fail(),
    });
  }

  removeStudentFromGroup(groupId: string, studentId: string): void {
    this.groupService.removeStudentFromGroup(groupId, studentId).subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }

  addCourseToGroup(groupId: string, courseId: string): void {
    if (!courseId) return;
    this.groupService.enrollGroup(groupId, courseId, 'course').subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }

  removeCourseFromGroup(groupId: string, courseId: string): void {
    this.groupService.removeCourseFromGroup(groupId, courseId).subscribe({ next: () => this.refreshGroups(), error: () => this.fail() });
  }
}
