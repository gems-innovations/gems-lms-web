import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';
import { CourseEditorTopbar } from '../../components/course-editor-topbar/course-editor-topbar';
import { CourseCurriculumTree } from '../../components/course-curriculum-tree/course-curriculum-tree';
import { CourseEditorPanel } from '../../components/course-editor-panel/course-editor-panel';

@Component({
  selector: 'edu-course-editor-container',
  standalone: true,
  imports: [CourseEditorTopbar, CourseCurriculumTree, CourseEditorPanel],
  templateUrl: './course-editor-container.html',
  host: { class: 'ceditor' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditorContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(CourseEditorUseCase);

  ngOnInit(): void { this.uc.init(this.route.snapshot.paramMap.get('id') ?? ''); }

  protected goBack(): void { this.router.navigate(['/education/courses']); }
}
