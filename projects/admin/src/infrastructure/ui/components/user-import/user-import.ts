import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from 'auth';
import {
  LibButtonComponent, LibSelectComponent, SelectOption, ToastService,
  AutoAnimateDirective, downloadCsv, parseCsvObjects,
} from 'shared';
import { UserDirectoryService } from '../../../services/user-directory.service';
import type { IBulkResponse, TBulkStatus } from '../../../services/user-directory.service';

type TRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
type TStatus = TBulkStatus;

interface IImportRow {
  row: number;
  firstName: string;
  lastName: string;
  email: string;
  role: TRole;
  courses: string[];
  status: TStatus | 'pending';
  message: string;
  userId?: number;
  temporaryPassword?: string;
  enrolled?: number;
}

const MAX_ROWS = 2000;
const ROLE_ALIASES: Record<string, TRole> = {
  estudiante: 'STUDENT', student: 'STUDENT', alumno: 'STUDENT', aprendiz: 'STUDENT', '': 'STUDENT',
  docente: 'INSTRUCTOR', instructor: 'INSTRUCTOR', profesor: 'INSTRUCTOR', teacher: 'INSTRUCTOR', tutor: 'INSTRUCTOR',
  administrador: 'ADMIN', admin: 'ADMIN',
};
const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['nombre', 'nombres', 'firstname', 'primernombre'],
  lastName: ['apellido', 'apellidos', 'lastname'],
  email: ['correo', 'correoelectronico', 'email', 'mail', 'emailaddress'],
  role: ['rol', 'role', 'perfil', 'tipo'],
  courses: ['cursos', 'curso', 'courses', 'course'],
};
const STATUS_LABEL: Record<IImportRow['status'], string> = {
  pending: 'Revisando', valid: 'Lista', created: 'Creada', exists: 'Ya existía',
  invalid: 'Con errores', duplicate: 'Repetida', forbidden: 'Sin permiso',
};

/**
 * Importación masiva desde CSV: valida en el navegador, pide al API una revisión sin crear nada
 * (dryRun), crea las cuentas y, si el archivo trae cursos, inscribe a los estudiantes.
 */
@Component({
  selector: 'adm-user-import',
  imports: [LibButtonComponent, LibSelectComponent, AutoAnimateDirective],
  templateUrl: './user-import.html',
  styleUrl: './user-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserImport implements OnInit {
  private readonly directory = inject(UserDirectoryService);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(ToastService);

  protected readonly step = signal<'upload' | 'preview' | 'done'>('upload');
  protected readonly busy = signal(false);
  protected readonly dragging = signal(false);
  protected readonly fileName = signal('');
  protected readonly rows = signal<IImportRow[]>([]);
  protected readonly fileError = signal<string | null>(null);
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly isSuperAdmin = this.session.isSuperAdmin;
  protected readonly institutionId = signal<string>(this.session.institutionId() ?? '');
  protected readonly institutionOptions = signal<SelectOption[]>([]);
  private readonly courses = signal<{ id: number; title: string }[]>([]);

  protected readonly counts = computed(() => {
    const rows = this.rows();
    const ok = rows.filter(r => r.status === 'valid' || r.status === 'created').length;
    return {
      total: rows.length,
      ok,
      exists: rows.filter(r => r.status === 'exists').length,
      errors: rows.filter(r => ['invalid', 'duplicate', 'forbidden'].includes(r.status)).length,
      enrolled: rows.reduce((n, r) => n + (r.enrolled ?? 0), 0),
    };
  });
  protected readonly canImport = computed(() => this.counts().ok > 0 && !!this.institutionId() && !this.busy());

  ngOnInit(): void {
    if (this.isSuperAdmin()) {
      this.directory.institutions().subscribe({
        next: list => this.institutionOptions.set(list.map(i => ({ value: i.id, label: i.name }))),
        error: () => this.institutionOptions.set([]),
      });
    }
  }

  protected setInstitution(id: string): void {
    this.institutionId.set(id);
    if (this.rows().length) void this.review();
  }

  protected downloadTemplate(): void {
    downloadCsv('plantilla-usuarios.csv', [
      ['Nombre', 'Apellido', 'Correo', 'Rol', 'Cursos'],
      ['Ana', 'Pérez', 'ana.perez@ejemplo.edu', 'estudiante', 'Introducción a la Programación|Cálculo I'],
      ['Luis', 'Gómez', 'luis.gomez@ejemplo.edu', 'docente', ''],
    ]);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.load(file);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.load(file);
  }

  protected reset(): void {
    this.rows.set([]);
    this.fileName.set('');
    this.fileError.set(null);
    this.step.set('upload');
  }

  private async load(file: File): Promise<void> {
    this.fileError.set(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      this.fileError.set('Sube un archivo .csv (en Excel: Archivo › Guardar como › CSV).');
      return;
    }
    const { headers, rows } = parseCsvObjects(await file.text());
    const column = (field: string) => HEADER_ALIASES[field].find(h => headers.includes(h));
    const missing = ['firstName', 'lastName', 'email'].filter(f => !column(f));
    if (missing.length) {
      this.fileError.set('Faltan columnas: Nombre, Apellido y Correo son obligatorias. Descarga la plantilla para ver el formato.');
      return;
    }
    if (!rows.length || rows.length > MAX_ROWS) {
      this.fileError.set(rows.length ? `El archivo tiene ${rows.length} filas; el máximo es ${MAX_ROWS}.` : 'El archivo no tiene filas.');
      return;
    }
    const get = (r: Record<string, string>, field: string) => { const c = column(field); return c ? r[c] ?? '' : ''; };
    this.fileName.set(file.name);
    this.rows.set(rows.map((r, i) => {
      const roleText = get(r, 'role').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const role = ROLE_ALIASES[roleText];
      return {
        row: i + 1,
        firstName: get(r, 'firstName'),
        lastName: get(r, 'lastName'),
        email: get(r, 'email').toLowerCase(),
        role: role ?? 'STUDENT',
        courses: get(r, 'courses').split(/[|,]/).map(c => c.trim()).filter(Boolean),
        status: role ? 'pending' : 'invalid',
        message: role ? '' : `Rol desconocido «${get(r, 'role')}» (usa estudiante, docente o administrador)`,
      };
    }));
    this.step.set('preview');
    await this.review();
  }

  /** Revisión en el servidor sin crear nada: formato, permisos y repetidos. */
  private async review(): Promise<void> {
    if (!this.institutionId()) return;
    this.busy.set(true);
    try {
      await this.loadCourses();
      const res = await this.send(true);
      const byRow = new Map(res.rows.map(r => [r.row, r]));
      const known = new Set(this.courses().map(c => c.title.toLowerCase()));
      const ids = new Set(this.courses().map(c => String(c.id)));
      this.rows.update(rows => rows.map(r => {
        if (r.status === 'invalid' && r.message.startsWith('Rol')) return r;
        const server = byRow.get(r.row);
        const unknown = r.courses.filter(c => !known.has(c.toLowerCase()) && !ids.has(c));
        const message = [server?.message ? this.translate(server.message) : '',
          unknown.length ? `Cursos no encontrados: ${unknown.join(', ')}` : ''].filter(Boolean).join(' · ');
        return { ...r, status: server?.status ?? 'invalid', message };
      }));
    } catch {
      this.toast.error('No se pudo revisar el archivo. Reintenta.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async import(): Promise<void> {
    if (!this.canImport()) return;
    this.busy.set(true);
    try {
      const res = await this.send(false);
      const byRow = new Map(res.rows.map(r => [r.row, r]));
      this.rows.update(rows => rows.map(r => {
        const server = byRow.get(r.row);
        if (!server) return r;
        return { ...r, status: server.status, message: server.message ? this.translate(server.message) : '',
          userId: server.userId ?? undefined, temporaryPassword: server.temporaryPassword ?? undefined };
      }));
      await this.enroll();
      this.step.set('done');
      const { ok, exists } = this.counts();
      this.toast.success(`Importación lista: ${ok} cuentas nuevas${exists ? `, ${exists} ya existían` : ''}.`);
    } catch {
      this.toast.error('La importación no terminó. Revisa la conexión y reintenta: las cuentas ya creadas aparecerán como existentes.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Inscribe a los estudiantes (nuevos o ya existentes) en los cursos de su fila. */
  private async enroll(): Promise<void> {
    const students = this.rows().filter(r => r.role === 'STUDENT' && r.courses.length && (r.status === 'created' || r.status === 'exists'));
    if (!students.length) return;
    const existing = students.some(r => r.status === 'exists')
      ? await firstValueFrom(this.directory.institutionUsers(this.institutionId()))
      : [];
    const idByEmail = new Map(existing.map(u => [u.email.toLowerCase(), u.userId ?? u.id]));
    const byCourse = new Map<number, IImportRow[]>();
    for (const r of students) {
      const id = r.userId ?? idByEmail.get(r.email);
      if (!id) continue;
      r.userId = id;
      for (const name of r.courses) {
        const course = this.courses().find(c => c.title.toLowerCase() === name.toLowerCase() || String(c.id) === name);
        if (course) byCourse.set(course.id, [...(byCourse.get(course.id) ?? []), r]);
      }
    }
    const enrolled = new Map<number, number>();
    for (const [courseId, rows] of byCourse) {
      const result = await firstValueFrom(this.directory.bulkEnroll(courseId, rows.flatMap(r => r.userId ? [r.userId] : [])));
      for (const e of result ?? []) enrolled.set(e.studentId, (enrolled.get(e.studentId) ?? 0) + 1);
    }
    this.rows.update(rows => rows.map(r => r.userId && enrolled.has(r.userId) ? { ...r, enrolled: enrolled.get(r.userId) } : r));
  }

  protected downloadResults(): void {
    downloadCsv('resultado-importacion.csv', [
      ['Fila', 'Nombre', 'Apellido', 'Correo', 'Rol', 'Estado', 'Contraseña temporal', 'Cursos inscritos', 'Detalle'],
      ...this.rows().map(r => [r.row, r.firstName, r.lastName, r.email, this.roleLabel(r.role), STATUS_LABEL[r.status],
        r.temporaryPassword ?? '', r.enrolled ?? 0, r.message]),
    ]);
  }

  protected roleLabel(role: TRole): string {
    return role === 'STUDENT' ? 'Estudiante' : role === 'INSTRUCTOR' ? 'Docente' : 'Administrador';
  }

  private send(dryRun: boolean): Promise<IBulkResponse> {
    const users = this.rows().filter(r => !(r.status === 'invalid' && r.message.startsWith('Rol'))).map(r => ({
      firstName: r.firstName, lastName: r.lastName, email: r.email, role: r.role, institutionId: this.institutionId(),
    }));
    // Las filas descartadas en el navegador no viajan; se reconstruye su número de fila original.
    const rowNumbers = this.rows().filter(r => !(r.status === 'invalid' && r.message.startsWith('Rol'))).map(r => r.row);
    return firstValueFrom(this.directory.bulkRegister(users, dryRun))
      .then(res => ({ ...res, rows: res.rows.map(r => ({ ...r, row: rowNumbers[r.row - 1] })) }));
  }

  private async loadCourses(): Promise<void> {
    this.courses.set(await firstValueFrom(this.directory.courses(this.institutionId())));
  }

  private translate(message: string): string {
    return message
      .replace(/firstName: /g, 'Nombre: ').replace(/lastName: /g, 'Apellido: ').replace(/email: /g, 'Correo: ')
      .replace(/username: /g, 'Usuario: ').replace(/role: /g, 'Rol: ')
      .replace(/Name is required/g, 'es obligatorio')
      .replace(/Name must be between 2 and 50 characters/g, 'debe tener entre 2 y 50 caracteres')
      .replace(/Email is required/g, 'es obligatorio')
      .replace(/Email must be a valid email address/g, 'no es un correo válido')
      .replace(/Role is required/g, 'es obligatorio')
      .replace('Only the super admin can grant the SUPER_ADMIN role', 'Solo el superadministrador puede asignar ese rol')
      .replace('You can only manage users of your institution', 'Solo puedes crear usuarios de tu institución');
  }
}
