import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LearningPathUseCase } from '../../../../application/learning-path.usecase';
import { ILearningPath, ELearningPathStatus } from '../../../../domain/model/learning-path.model';

@Component({
  selector: 'edu-learning-path-list-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './learning-path-list-container.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './learning-path-list-container.scss'
})
export class LearningPathListContainer implements OnInit {
  private readonly router = inject(Router);
  readonly uc = inject(LearningPathUseCase);

  readonly ELearningPathStatus = ELearningPathStatus;

  readonly activeTab = signal<ELearningPathStatus | null>(null);
  readonly searchValue = signal('');

  readonly statusLabels: Record<ELearningPathStatus, string> = {
    [ELearningPathStatus.DRAFT]: 'Borrador',
    [ELearningPathStatus.PUBLISHED]: 'Publicado',
    [ELearningPathStatus.ARCHIVED]: 'Archivado'
  };

  ngOnInit(): void {
    this.uc.load();
  }

  onSearch(term: string): void {
    this.searchValue.set(term);
    this.uc.setSearch(term);
  }

  setTab(status: ELearningPathStatus | null): void {
    this.activeTab.set(status);
    this.uc.setStatusFilter(status);
  }

  createPath(): void {
    this.uc.openModal('create');
  }

  openEditor(path: ILearningPath): void {
    this.router.navigate(['/education/learning-paths', path.id, 'edit']);
  }

  confirmDelete(path: ILearningPath): void {
    this.uc.openModal('delete', path.id);
  }

  onDelete(id: string): void {
    this.uc.delete(id);
  }

  onModalClose(): void {
    this.uc.closeModal();
  }

  publishPath(id: string): void {
    this.uc.publishPath(id);
  }

  archivePath(id: string): void {
    this.uc.archivePath(id);
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  trackById(_: number, item: ILearningPath): string {
    return item.id;
  }
}
