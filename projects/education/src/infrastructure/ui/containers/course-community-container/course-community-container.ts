import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PageComponent, PageHeaderComponent, BackButtonComponent } from 'shared';
import { CourseService } from '../../../services/course.service';
import { CourseCommunity } from '../../components/course-community/course-community';
import type { TCommunityTab } from '../../components/course-community/course-community';

/** Announcements and forum of a course, from the student area (?tab=forum&thread=<id>). */
@Component({
  selector: 'edu-course-community-container',
  standalone: true,
  imports: [PageComponent, PageHeaderComponent, BackButtonComponent, CourseCommunity],
  template: `
    <lib-page>
      <lib-back-button label="Volver al curso" (back)="backToCourse()" />
      <lib-page-header title="Comunidad del curso" [subtitle]="courseTitle()" />
      <edu-course-community [courseId]="courseId()" [initialTab]="tab()" [threadId]="threadId()" />
    </lib-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCommunityContainer implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly courses = inject(CourseService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly courseId = signal('');
  protected readonly tab      = signal<TCommunityTab>('announcements');
  protected readonly threadId = signal<string | null>(null);
  protected readonly courseTitle = signal('');

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const id = params.get('id') ?? '';
        if (id !== this.courseId()) {
          this.courses.getCourseById(id).subscribe({ next: c => this.courseTitle.set(c.title), error: () => {} });
        }
        this.courseId.set(id);
        this.tab.set(query.get('tab') === 'forum' ? 'forum' : 'announcements');
        this.threadId.set(query.get('thread'));
      });
  }

  protected backToCourse(): void { this.router.navigate(['/learn/courses', this.courseId()]); }
}
