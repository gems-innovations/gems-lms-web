import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { StudentHomeUseCase } from '../../../../application/student-home.usecase';
import { IEnrolledCourseEntry } from '../../../../domain/model/enrollment.model';
import { StudentHero } from '../../components/student-hero/student-hero';
import { CourseProgressCard } from '../../components/course-progress-card/course-progress-card';
import { CatalogCard } from '../../components/catalog-card/catalog-card';
import { HomePathSidebarItem } from '../../components/home-path-sidebar-item/home-path-sidebar-item';
import { ICatalogItem } from '../../../../domain/model/catalog.model';

@Component({
  selector: 'edu-student-home-container',
  imports: [
    LoadingSkeletonComponent,
    EmptyStateComponent,
    StudentHero,
    CourseProgressCard,
    CatalogCard,
    HomePathSidebarItem,
  ],
  templateUrl: './student-home-container.html',
})
export class StudentHomeContainer implements OnInit {
  private readonly router = inject(Router);
  protected readonly uc   = inject(StudentHomeUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected continueCourse(entry: IEnrolledCourseEntry): void {
    const { courseId, currentLessonId, currentBlockId } = entry.enrollment.progress;
    const params: Record<string, string> = {};
    if (currentLessonId) params['lesson'] = currentLessonId;
    if (currentBlockId)  params['block']  = currentBlockId;
    this.router.navigate(['/learn/courses', courseId], { queryParams: params });
  }

  protected openPath(pathId: string): void {
    this.router.navigate(['/learn/preview', 'paths', pathId]);
  }

  protected openCatalogItem(item: ICatalogItem): void {
    this.router.navigate(['/learn/preview', item.kind === 'path' ? 'paths' : 'courses', item.id]);
  }

  protected enrollCatalogItem(item: ICatalogItem): void {
    this.router.navigate(['/learn/preview', 'courses', item.id]);
  }

  protected openCatalog(): void {
    this.router.navigate(['/learn/catalog']);
  }

  protected openMyLearning(): void {
    this.router.navigate(['/learn/my-learning']);
  }
}
