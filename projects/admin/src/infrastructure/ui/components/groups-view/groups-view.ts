import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LoadingSkeletonComponent, EmptyStateComponent, LibButtonComponent,
  LibSelectComponent, BadgeComponent, AvatarComponent, ModalBaseComponent,
  SearchBarComponent, PaginationComponent,
} from 'shared';
import type { SelectOption } from 'shared';
import { EnrollStudentSearch } from 'education';
import type { IGroup, IStudentProfile, INewStudentRow } from 'education';
import { AdminGroupsUseCase } from '../../../../application/admin-groups.usecase';
import { parseUsersXlsx } from '../user-import-panel/user-xlsx.parser';

type TCreateMode = 'select' | 'excel';

const PAGE_SIZE = 6;

@Component({
  selector: 'adm-groups-view',
  standalone: true,
  imports: [
    FormsModule, LoadingSkeletonComponent, EmptyStateComponent, LibButtonComponent,
    LibSelectComponent, BadgeComponent, AvatarComponent, EnrollStudentSearch,
    ModalBaseComponent, SearchBarComponent, PaginationComponent,
  ],
  templateUrl: './groups-view.html',
  styleUrl: './groups-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsView implements OnInit {
  protected readonly uc = inject(AdminGroupsUseCase);

  // ── Buscador + paginación ────────────────────────────────────────────────────
  protected readonly search = signal('');
  protected readonly page   = signal(1);

  protected readonly filteredGroups = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.uc.groups();
    return this.uc.groups().filter(g =>
      g.name.toLowerCase().includes(q) ||
      this.uc.instructorName(g.instructorId).toLowerCase().includes(q) ||
      this.uc.courseTitles(g).some(t => t.toLowerCase().includes(q))
    );
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredGroups().length / PAGE_SIZE))
  );

  protected readonly pagedGroups = computed(() => {
    const p = this.page();
    return this.filteredGroups().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  protected onSearch(v: string): void { this.search.set(v); this.page.set(1); }

  // ── Crear grupo (estado de formulario) ──────────────────────────────────────
  protected readonly creating     = signal(false);
  protected readonly name         = signal('');
  protected readonly instructorId = signal('');
  protected readonly mode         = signal<TCreateMode>('select');
  protected readonly selectedIds  = signal<Set<string>>(new Set());
  protected readonly excelRows    = signal<INewStudentRow[]>([]);
  protected readonly excelError   = signal<string | null>(null);
  protected readonly fileName     = signal('');

  protected readonly instructorOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin instructor' },
    ...this.uc.instructors().map(i => ({ value: i.id, label: `${i.firstName} ${i.lastName}` })),
  ]);

  protected readonly courseOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Seleccionar curso…' },
    ...this.uc.courses().map(c => ({ value: c.id, label: c.title })),
  ]);

  protected readonly canCreate = computed(() =>
    this.name().trim().length > 0 &&
    (this.mode() === 'select' ? this.selectedIds().size > 0 : this.excelRows().length > 0)
  );

  ngOnInit(): void { this.uc.load(); }

  protected openCreate(): void {
    this.creating.set(true);
    this.name.set(''); this.instructorId.set(''); this.mode.set('select');
    this.selectedIds.set(new Set()); this.excelRows.set([]); this.excelError.set(null); this.fileName.set('');
  }
  protected cancelCreate(): void { this.creating.set(false); }

  protected toggleStudent(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    const buffer = await file.arrayBuffer();
    const result = parseUsersXlsx(buffer);
    if (result.error) { this.excelError.set(result.error); this.excelRows.set([]); return; }
    this.excelError.set(null);
    this.excelRows.set(result.rows.map(r => ({ firstName: r.firstName, lastName: r.lastName, email: r.email })));
  }

  protected create(): void {
    if (!this.canCreate()) return;
    const instructor = this.instructorId() || null;
    if (this.mode() === 'select') {
      this.uc.createGroup(this.name().trim(), [...this.selectedIds()], instructor);
    } else {
      this.uc.createGroupFromExcel(this.name().trim(), instructor, this.excelRows());
    }
    this.creating.set(false);
  }

  // ── Editar grupo (drawer) ────────────────────────────────────────────────────
  protected readonly editName       = signal('');
  protected readonly editAddCourse  = signal('');
  protected readonly editExcelError = signal<string | null>(null);
  protected readonly editFileName   = signal('');

  protected readonly editStudentIds = computed(() => new Set(this.uc.editingGroup()?.studentIds ?? []));

  protected readonly editCourseOptions = computed<SelectOption[]>(() => {
    const current = new Set(this.uc.editingGroup()?.courseIds ?? []);
    return [
      { value: '', label: 'Agregar curso…' },
      ...this.uc.courses().filter(c => !current.has(c.id)).map(c => ({ value: c.id, label: c.title })),
    ];
  });

  protected readonly editStudents = computed<IStudentProfile[]>(() => {
    const ids = this.uc.editingGroup()?.studentIds ?? [];
    return ids
      .map(id => this.uc.students().find(s => s.id === id))
      .filter((s): s is IStudentProfile => !!s);
  });

  protected openEdit(groupId: string): void {
    const group = this.uc.groups().find(g => g.id === groupId);
    this.editName.set(group?.name ?? '');
    this.editAddCourse.set('');
    this.editExcelError.set(null);
    this.editFileName.set('');
    this.uc.openEdit(groupId);
  }

  protected closeEdit(): void { this.uc.closeEdit(); }

  protected onDeleteGroup(group: IGroup): void {
    if (!confirm(`¿Eliminar el grupo "${group.name}"? Las matrículas de sus estudiantes se conservan.`)) return;
    this.uc.deleteGroup(group.id);
  }

  protected commitName(): void {
    const group = this.uc.editingGroup();
    if (group && this.editName().trim() && this.editName().trim() !== group.name) {
      this.uc.renameGroup(group.id, this.editName());
    }
  }

  protected onEditInstructor(instructorId: string): void {
    const group = this.uc.editingGroup();
    if (group) this.uc.setInstructor(group.id, instructorId || null);
  }

  protected onEditAddCourse(courseId: string): void {
    const group = this.uc.editingGroup();
    if (group && courseId) {
      this.uc.addCourseToGroup(group.id, courseId);
      this.editAddCourse.set('');
    }
  }

  protected onEditRemoveCourse(courseId: string): void {
    const group = this.uc.editingGroup();
    if (group) this.uc.removeCourseFromGroup(group.id, courseId);
  }

  protected onEditRemoveStudent(studentId: string): void {
    const group = this.uc.editingGroup();
    if (group) this.uc.removeStudentFromGroup(group.id, studentId);
  }

  protected onEditAddStudent(student: IStudentProfile): void {
    const group = this.uc.editingGroup();
    if (!group) return;
    if (this.editStudentIds().has(student.id)) {
      this.uc.removeStudentFromGroup(group.id, student.id);
    } else {
      this.uc.addStudentsToGroup(group.id, [student.id]);
    }
  }

  protected async onEditFile(event: Event): Promise<void> {
    const group = this.uc.editingGroup();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !group) return;
    this.editFileName.set(file.name);
    const buffer = await file.arrayBuffer();
    const result = parseUsersXlsx(buffer);
    if (result.error) { this.editExcelError.set(result.error); input.value = ''; return; }
    this.editExcelError.set(null);
    this.uc.importStudentsToGroup(
      group.id,
      result.rows.map(r => ({ firstName: r.firstName, lastName: r.lastName, email: r.email })),
    );
    input.value = '';
    this.editFileName.set('');
  }
}
