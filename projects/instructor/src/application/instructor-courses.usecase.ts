import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CourseService, EnrollmentService, GroupService } from 'education';
import { AuthSessionService } from 'auth';
import type { ICourse, IGroup } from 'education';
import type {
  ICourseStats, ICohort, IEnrollmentRow, ISubmissionRow,
} from '../domain/model/instructor.model';

@Injectable({ providedIn: 'root' })
export class InstructorCoursesUseCase {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly groupService      = inject(GroupService);
  private readonly authSession       = inject(AuthSessionService);

  private readonly _groups      = signal<IGroup[]>([]);
  private readonly _courses     = signal<ICourse[]>([]);
  private readonly _enrollments = signal<IEnrollmentRow[]>([]);
  private readonly _submissions = signal<ISubmissionRow[]>([]);
  private readonly _isLoading   = signal(true);
  private _loaded = false;

  // Filtros / búsqueda
  readonly search        = signal('');
  readonly courseFilter  = signal<string>('');   // '' = todos
  readonly groupFilter   = signal<string>('');   // '' = todos

  readonly isLoading = this._isLoading.asReadonly();

  // Todos los cohortes (curso × grupo) de los grupos del instructor.
  readonly cohorts = computed<ICohort[]>(() => {
    const courses = this._courses();
    const list: ICohort[] = [];
    for (const group of this._groups()) {
      for (const courseId of group.courseIds) {
        const course = courses.find(c => c.id === courseId);
        if (course) list.push({ course, group, stats: this.statsFor(courseId, group) });
      }
    }
    return list;
  });

  // Opciones de filtro (únicas).
  readonly courseOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const c of this.cohorts()) seen.set(c.course.id, c.course.title);
    return [...seen].map(([id, title]) => ({ id, title }));
  });

  readonly groupOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const c of this.cohorts()) seen.set(c.group.id, c.group.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  });

  readonly filteredCohorts = computed<ICohort[]>(() => {
    const q  = this.search().toLowerCase().trim();
    const cf = this.courseFilter();
    const gf = this.groupFilter();
    return this.cohorts().filter(c =>
      (!cf || c.course.id === cf) &&
      (!gf || c.group.id === gf) &&
      (!q ||
        c.course.title.toLowerCase().includes(q) ||
        c.group.name.toLowerCase().includes(q))
    );
  });

  // Cursos únicos (deduplicados por curso) con stats agregadas entre todos los grupos del instructor.
  readonly courses = computed<{ course: ICourse; groupCount: number; stats: ICourseStats }[]>(() => {
    const byCourse = new Map<string, { course: ICourse; cohorts: ICohort[] }>();
    for (const c of this.cohorts()) {
      const entry = byCourse.get(c.course.id);
      if (entry) entry.cohorts.push(c);
      else byCourse.set(c.course.id, { course: c.course, cohorts: [c] });
    }
    return [...byCourse.values()].map(({ course, cohorts }) => {
      const studentCount = cohorts.reduce((a, c) => a + c.stats.studentCount, 0);
      const avgProgress = cohorts.length
        ? Math.round(cohorts.reduce((a, c) => a + c.stats.avgProgress, 0) / cohorts.length)
        : 0;
      const graded = cohorts.filter(c => c.stats.avgGrade != null);
      const avgGrade = graded.length
        ? Math.round(graded.reduce((a, c) => a + (c.stats.avgGrade ?? 0), 0) / graded.length)
        : null;
      const pendingCount = cohorts.reduce((a, c) => a + c.stats.pendingCount, 0);
      return { course, groupCount: cohorts.length, stats: { studentCount, avgProgress, avgGrade, pendingCount } };
    });
  });

  readonly filteredCourses = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.courses();
    return this.courses().filter(c => c.course.title.toLowerCase().includes(q));
  });

  // Grupos del instructor para un curso específico (usado por el selector de grupo).
  cohortsForCourse(courseId: string): ICohort[] {
    return this.cohorts().filter(c => c.course.id === courseId);
  }

  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this._isLoading.set(true);
    const instructorId = this.authSession.user()?.id ?? '';

    forkJoin({
      groups:      this.groupService.getGroupsForInstructor(instructorId),
      courses:     this.courseService.getCourses(),
      enrollments: this.enrollmentService.getAllCourseEnrollments(),
      submissions: this.enrollmentService.getAllSubmissions(),
    }).subscribe(({ groups, courses, enrollments, submissions }) => {
      this._groups.set(groups);
      this._courses.set(courses.courses);
      this._enrollments.set(enrollments as IEnrollmentRow[]);
      this._submissions.set(submissions as ISubmissionRow[]);
      this._isLoading.set(false);
    });
  }

  statsFor(courseId: string, group: IGroup): ICourseStats {
    const studentSet = new Set(group.studentIds);
    const enr = this._enrollments().filter(e =>
      e.courseId === courseId && (e.groupId === group.id || studentSet.has(e.student.id))
    );
    const sub = this._submissions().filter(s => s.courseId === courseId && studentSet.has(s.student.id));
    const graded = sub.filter(s => s.grade != null);
    return {
      studentCount: group.studentIds.length,
      avgProgress: enr.length
        ? Math.round(enr.reduce((a, e) => a + (e.progress?.overallPercentage ?? 0), 0) / enr.length)
        : 0,
      avgGrade: graded.length
        ? Math.round(graded.reduce((a, s) => a + (s.grade ?? 0), 0) / graded.length)
        : null,
      pendingCount: sub.filter(s => s.status === 'pending').length,
    };
  }
}
