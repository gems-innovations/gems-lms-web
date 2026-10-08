import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent, ClientErrorJournal } from 'shared';
import { AuditService } from '../../../services/audit.service';
import { IAuditEvent } from '../../../../domain/model/audit-event.model';
import { LibSelectComponent, SelectOption } from 'shared';

@Component({
  selector: 'adm-audit-container',
  imports: [LibSelectComponent, DatePipe, FormsModule, PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent],
  templateUrl: './audit-container.html',
  styleUrl: './audit-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditContainer implements OnInit {
  protected readonly actionOptions: SelectOption[] = [
    { value: '', label: 'Todas' },
    { value: 'CREATE', label: 'Creación' },
    { value: 'UPDATE', label: 'Cambio' },
    { value: 'DELETE', label: 'Eliminación' },
  ];
  private readonly actionLabels: Record<string, string> = { CREATE: 'Creación', UPDATE: 'Cambio', DELETE: 'Eliminación' };
  private readonly audit = inject(AuditService);
  readonly clientErrors = inject(ClientErrorJournal);
  readonly events = signal<IAuditEvent[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageSize = 20;
  page = 1;
  search = '';
  action = '';
  from = '';
  to = '';

  ngOnInit(): void { this.load(); }

  load(page = this.page): void {
    this.page = page;
    this.loading.set(true);
    this.error.set(null);
    this.audit.search({ page, limit: this.pageSize, search: this.search, action: this.action,
      from: this.from, to: this.to }).subscribe({
      next: result => { this.events.set(result.events); this.total.set(result.total); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }

  applyFilters(): void { this.load(1); }
  clearFilters(): void { this.search = ''; this.action = ''; this.from = ''; this.to = ''; this.load(1); }
  get pages(): number { return Math.max(1, Math.ceil(this.total() / this.pageSize)); }
  label(action: string): string { return this.actionLabels[action] ?? action; }
  resource(path: string): string {
    const names: Record<string, string> = { users: 'Usuarios', institutions: 'Instituciones', branding: 'Marca',
      courses: 'Cursos', enrollments: 'Matrículas', groups: 'Grupos', 'learning-paths': 'Rutas',
      quizzes: 'Evaluaciones', submissions: 'Entregas', files: 'Archivos', notifications: 'Notificaciones' };
    const segment = path.split('/').filter(Boolean)[2] ?? path;
    return names[segment] ?? segment;
  }
}
