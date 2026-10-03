import { Component, inject, input, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LibButtonComponent, LoadingSkeletonComponent, ToastService } from 'shared';
import { CourseService, EnrollmentRulesService } from 'education';
import type { IAcademicPeriod, IEnrollmentRules } from 'education';

/** Enrollment rules of a course: period, window, capacity, self-enrollment and prerequisites. */
@Component({
  selector: 'ins-enrollment-rules-panel',
  standalone: true,
  imports: [FormsModule, LibButtonComponent, LoadingSkeletonComponent],
  templateUrl: './enrollment-rules-panel.html',
  styleUrl: './enrollment-rules-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentRulesPanel {
  private readonly rulesService = inject(EnrollmentRulesService);
  private readonly courseService = inject(CourseService);
  private readonly toast = inject(ToastService);

  readonly courseId = input.required<string>();

  protected readonly state   = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly saving  = signal(false);
  protected readonly periods = signal<IAcademicPeriod[]>([]);
  protected readonly courses = signal<{ id: string; title: string }[]>([]);
  protected readonly draft   = signal<IEnrollmentRules>({
    periodId: null, opensAt: null, closesAt: null, capacity: null, selfEnrollment: true, prerequisiteIds: [],
  });

  /** Other courses of the institution that can be required. */
  protected readonly candidates = computed(() => this.courses().filter(c => c.id !== this.courseId()));

  protected readonly problem = computed<string | null>(() => {
    const d = this.draft();
    if (d.opensAt && d.closesAt && d.closesAt < d.opensAt) return 'El cierre debe ser posterior a la apertura';
    if (d.capacity !== null && (!Number.isInteger(d.capacity) || d.capacity < 1)) return 'El cupo debe ser un entero mayor que 0';
    return null;
  });

  protected readonly periodEnd = computed(() => this.periods().find(p => p.id === this.draft().periodId)?.endsOn ?? null);

  constructor() {
    effect(() => {
      const id = this.courseId();
      untracked(() => this.load(id));
    });
  }

  private load(courseId: string): void {
    this.state.set('loading');
    forkJoin({
      rules: this.rulesService.rules(courseId),
      periods: this.rulesService.periods(),
      courses: this.courseService.getCourses(),
    }).subscribe({
      next: ({ rules, periods, courses }) => {
        this.draft.set(rules);
        this.periods.set(periods);
        this.courses.set(courses.courses.map(c => ({ id: c.id, title: c.title })));
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected patch(change: Partial<IEnrollmentRules>): void { this.draft.update(d => ({ ...d, ...change })); }

  protected togglePrerequisite(id: string, checked: boolean): void {
    this.draft.update(d => ({
      ...d,
      prerequisiteIds: checked ? [...new Set([...d.prerequisiteIds, id])] : d.prerequisiteIds.filter(x => x !== id),
    }));
  }

  protected setCapacity(value: string | number | null): void {
    const n = value === null || value === '' ? null : Number(value);
    this.patch({ capacity: n });
  }

  protected save(): void {
    if (this.problem() || this.saving()) return;
    this.saving.set(true);
    this.rulesService.saveRules(this.courseId(), this.draft()).subscribe({
      next: saved => { this.saving.set(false); this.draft.set(saved); this.toast.success('Reglas de inscripción guardadas'); },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'No se pudieron guardar las reglas'); },
    });
  }
}
