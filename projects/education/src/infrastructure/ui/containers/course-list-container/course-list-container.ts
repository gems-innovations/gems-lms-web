import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseUseCase } from '../../../../application/course.usecase';
import { ICourse, ECourseStatus } from '../../../../domain/model/course.model';
import { CourseListView } from '../../views/course-list-view/course-list-view';

@Component({
  selector: 'edu-course-list-container',
  standalone: true,
  imports: [CourseListView],
  templateUrl: './course-list-container.html'
})
export class CourseListContainer implements OnInit {
  private readonly router = inject(Router);
  readonly uc = inject(CourseUseCase);

  ngOnInit(): void { this.uc.load(); }

  onSearch(term: string): void { this.uc.setSearch(term); }

  setTab(status: ECourseStatus | null): void { this.uc.setStatusFilter(status); }

  openEditor(course: ICourse): void {
    this.router.navigate(['/education/courses', course.id, 'edit']);
  }

  createCourse(): void { this.uc.openModal('create'); }

  onDelete(id: string): void { this.uc.openModal('delete', id); }

  onConfirmDelete(id: string): void { this.uc.delete(id); }

  onModalClose(): void { this.uc.closeModal(); }

  publishCourse(id: string): void { this.uc.publishCourse(id); }

  archiveCourse(id: string): void { this.uc.archiveCourse(id); }
}
