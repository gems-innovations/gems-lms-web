import { Component, OnInit, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmptyStateComponent, LoadingSkeletonComponent } from 'shared';
import { PreviewHero } from '../../components/preview-hero/preview-hero';
import { PreviewCourseOutline } from '../../components/preview-course-outline/preview-course-outline';
import { PreviewPathSequence } from '../../components/preview-path-sequence/preview-path-sequence';
import { ContentPreviewUseCase } from '../../../../application/content-preview.usecase';
import { TPreviewType } from '../../../../domain/model/catalog.model';

@Component({
  selector: 'edu-content-preview-container',
  standalone: true,
  host: { style: 'display:block' },
  imports: [EmptyStateComponent, LoadingSkeletonComponent, PreviewHero, PreviewCourseOutline, PreviewPathSequence],
  templateUrl: './content-preview-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPreviewContainer implements OnInit {
  /** "Período 2026-2 · Inscripción hasta 30/11/2026 · 12 cupos" for courses with rules. */
  protected readonly enrollmentInfo = computed(() => {
    const e = this.uc.eligibility();
    if (!e) return null;
    const parts: string[] = [];
    if (e.periodName) parts.push(`Período ${e.periodName}`);
    if (e.opensAt && e.opensAt.getTime() > Date.now()) parts.push(`Inscripción desde ${e.opensAt.toLocaleDateString('es-CO')}`);
    if (e.closesAt) parts.push(`Inscripción hasta ${e.closesAt.toLocaleDateString('es-CO')}`);
    if (e.seatsLeft !== null) parts.push(`${e.seatsLeft} cupo(s) disponibles`);
    return parts.length ? parts.join(' · ') : null;
  });

  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(ContentPreviewUseCase);

  ngOnInit(): void {
    const type = this.route.snapshot.data['previewType'] as TPreviewType;
    const id   = this.route.snapshot.paramMap.get('id')!;
    this.uc.init(type, id);
  }

  protected play(): void {
    if (this.uc.previewType() === 'course') {
      this.router.navigate(['/learn/courses', this.uc.course()?.id]);
    } else {
      const courseId = this.uc.currentCourseId();
      if (courseId) this.router.navigate(['/learn/courses', courseId]);
      else this.router.navigate(['/learn/preview', 'paths', this.uc.path()?.id]);
    }
  }

  protected back(): void { this.router.navigate(['/learn/catalog']); }
}
