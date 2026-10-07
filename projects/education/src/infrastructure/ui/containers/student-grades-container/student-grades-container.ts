import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MarkdownComponent } from 'ngx-markdown';
import {
  PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent, BackButtonComponent,
} from 'shared';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { GradebookService } from '../../../services/gradebook.service';
import type { ICourse, IContentBlock } from '../../../../domain/model/course.model';
import type { IAssignmentSubmission } from '../../../../domain/model/enrollment.model';
import type { IGradebook, IGradebookCell, IGradebookItem } from '../../../../domain/model/gradebook.model';

interface IGradeLine {
  item: IGradebookItem;
  cell?: IGradebookCell;
  share: number;
  submission?: IAssignmentSubmission;
  rubric: { criterion: string; maxPoints: number; score: number; comment?: string }[];
}

/** The student's own grades in a course: every evaluation, its weight and the course grade. */
@Component({
  selector: 'edu-student-grades-container',
  standalone: true,
  imports: [DecimalPipe, MarkdownComponent, PageComponent, PageHeaderComponent, LoadingSkeletonComponent,
    EmptyStateComponent, BackButtonComponent],
  templateUrl: './student-grades-container.html',
  styleUrl: './student-grades-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentGradesContainer implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly courses     = inject(CourseService);
  private readonly enrollments = inject(EnrollmentService);
  private readonly gradebooks  = inject(GradebookService);

  protected readonly loading     = signal(true);
  protected readonly error       = signal<string | null>(null);
  protected readonly course      = signal<ICourse | null>(null);
  private readonly book          = signal<IGradebook | null>(null);
  private readonly submissions   = signal<IAssignmentSubmission[]>([]);
  private courseId = '';

  protected readonly row = computed(() => this.book()?.rows[0] ?? null);

  protected readonly lines = computed<IGradeLine[]>(() => {
    const book = this.book();
    if (!book) return [];
    const total = book.items.reduce((a, i) => a + i.weight, 0);
    const blocks = new Map<string, IContentBlock>();
    for (const m of this.course()?.modules ?? []) {
      for (const l of m.lessons ?? []) for (const b of l.contentBlocks ?? []) blocks.set(b.id, b);
    }
    return book.items.map(item => {
      const submission = this.submissions().find(s => s.blockId === item.blockId);
      const criteria = blocks.get(item.blockId)?.rubric ?? [];
      return {
        item,
        cell: this.row()?.cells.find(c => c.blockId === item.blockId),
        share: total ? Math.round(item.weight * 100 / total) : 0,
        submission,
        rubric: (submission?.rubricScores ?? []).map(s => {
          const c = criteria.find(r => r.id === s.criterionId);
          return { criterion: c?.criterion ?? s.criterionId, maxPoints: c?.maxPoints ?? 0, score: s.score, comment: s.comment };
        }),
      };
    });
  });

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') ?? '';
    forkJoin({
      course: this.courses.getCourseById(this.courseId),
      book: this.gradebooks.mine(this.courseId),
      submissions: this.enrollments.getMySubmissions(),
    }).subscribe({
      next: ({ course, book, submissions }) => {
        this.course.set(course);
        this.book.set(book);
        this.submissions.set(submissions.filter(s => s.courseId === this.courseId));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar tus calificaciones');
        this.loading.set(false);
      },
    });
  }

  protected backToCourse(): void { this.router.navigate(['/learn/courses', this.courseId]); }

  protected gradeClass(score: number | null | undefined): string {
    if (score == null) return '';
    if (score >= 80) return 'sgrades__score--high';
    if (score >= 60) return 'sgrades__score--mid';
    return 'sgrades__score--low';
  }
}
