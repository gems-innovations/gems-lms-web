import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';
import { CourseEditorTopbar } from '../../components/course-editor-topbar/course-editor-topbar';
import { CourseCurriculumTree } from '../../components/course-curriculum-tree/course-curriculum-tree';
import { CourseEditorPanel } from '../../components/course-editor-panel/course-editor-panel';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';

@Component({
  selector: 'edu-course-editor-container',
  standalone: true,
  imports: [CourseEditorTopbar, CourseCurriculumTree, CourseEditorPanel, LoadingSkeletonComponent, EmptyStateComponent],
  templateUrl: './course-editor-container.html',
  host: { class: 'ceditor' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditorContainer implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly uc     = inject(CourseEditorUseCase);

  /** Celular: maestro-detalle. Muestra el árbol de currículo o el panel del elemento elegido. */
  protected readonly showPanel = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    // El instructor monta este editor bajo /instructor/courses/:courseId/:groupId/edit
    // (sin :id); education usa /education/courses/:id/edit. Se soportan ambos.
    this.uc.init(params.get('courseId') ?? params.get('id') ?? '');
  }

  // Vuelve al contexto desde el que se abrió el editor (lista de education o
  // detalle de curso del instructor), en lugar de una ruta fija.
  protected goBack(): void { this.location.back(); }

  // En celular, al elegir curso/módulo/lección en el árbol se pasa al panel de edición.
  protected onTreeClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.ctree__course-btn, .ctree__module-row, .ctree__lesson-row')) return;
    if (target.closest('.ctree__expand-btn, .ctree__add-lesson-btn')) return;
    this.showPanel.set(true);
  }
}
