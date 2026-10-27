import { Component, inject, output, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent, ImageUploadComponent } from 'shared';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';
import { ContentBlockModal } from '../content-block-modal/content-block-modal';
import { CoursePlayerPreview } from '../course-player-preview/course-player-preview';
import { ICreateContentBlockRequest, IContentBlock } from '../../../../domain/model/course.model';

type TKind = 'module' | 'lesson' | 'block';
type TKindEdicion = 'module' | 'lesson';
interface IEdicion { kind: TKindEdicion; id: string; title: string; description: string; }
interface IBorrado { kind: TKind; id: string; blockId?: string; title: string; message: string; }

@Component({
  selector: 'edu-course-editor-panel',
  standalone: true,
  imports: [CommonModule, ContentBlockModal, CoursePlayerPreview, ImageUploadComponent, ConfirmationDialogComponent],
  templateUrl: './course-editor-panel.html',
  styleUrl: './course-editor-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditorPanel {
  protected readonly uc = inject(CourseEditorUseCase);

  /** Celular (maestro-detalle): vuelve al árbol de currículo. */
  readonly backToTree = output<void>();

  protected readonly showBlockModal      = signal(false);
  protected readonly blockModalLessonId  = signal<string | null>(null);
  protected readonly previewBlock        = signal<IContentBlock | null>(null);

  protected readonly editingBlock        = signal<IContentBlock | null>(null);

  protected openBlockModal(lessonId: string): void { this.editingBlock.set(null); this.blockModalLessonId.set(lessonId); this.showBlockModal.set(true); }
  protected openBlockEdit(lessonId: string, block: IContentBlock): void { this.editingBlock.set(block); this.blockModalLessonId.set(lessonId); this.showBlockModal.set(true); }
  protected closeBlockModal(): void { this.showBlockModal.set(false); this.blockModalLessonId.set(null); this.editingBlock.set(null); }
  protected saveBlock(req: ICreateContentBlockRequest): void {
    const b = this.editingBlock();
    if (b) this.uc.replaceBlock(req, b.id); else this.uc.saveBlock(req);
    this.closeBlockModal();
  }

  protected readonly editing       = signal<IEdicion | null>(null);
  protected readonly pendingDelete = signal<IBorrado | null>(null);

  constructor() {
    effect(() => { this.uc.selectedItem(); untracked(() => this.editing.set(null)); });
  }

  protected startEdit(kind: TKindEdicion, id: string): void {
    const src = kind === 'module' ? this.uc.selectedModule() : this.uc.selectedLesson();
    if (!src) return;
    this.editing.set({ kind, id, title: src.title, description: src.description ?? '' });
  }

  protected setEdit<K extends 'title' | 'description'>(key: K, value: IEdicion[K]): void {
    this.editing.update(e => (e ? { ...e, [key]: value } : e));
  }

  protected saveEdit(): void {
    const e = this.editing();
    if (!e || !e.title.trim()) return;
    const f = { title: e.title.trim(), description: e.description.trim() || undefined };
    if (e.kind === 'module') this.uc.updateModule(e.id, f);
    else this.uc.updateLesson(e.id, f);
    this.editing.set(null);
  }

  protected askDelete(kind: TKind, id: string, block?: IContentBlock): void {
    const nombre = kind === 'module' ? this.uc.selectedModule()?.title : kind === 'lesson' ? this.uc.selectedLesson()?.title : block?.title;
    const que = kind === 'module' ? 'el módulo' : kind === 'lesson' ? 'la lección' : 'el contenido';
    const mas = kind === 'module' ? ' con todas sus lecciones' : kind === 'lesson' ? ' con todo su contenido' : '';
    this.pendingDelete.set({ kind, id, blockId: block?.id, title: '¿Eliminar?', message: `Se eliminará ${que} «${nombre ?? ''}»${mas}. Esta acción no se puede deshacer.` });
  }

  protected confirmDelete(): void {
    const p = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!p) return;
    if (p.kind === 'module') this.uc.deleteModule(p.id);
    else if (p.kind === 'lesson') this.uc.deleteLesson(this.uc.selectedItem().moduleId ?? '', p.id);
    else if (p.blockId) this.uc.deleteBlock(p.id, p.blockId);
  }

  protected openPreview(block: IContentBlock): void { this.previewBlock.set(block); }
  protected closePreview(): void { this.previewBlock.set(null); }
}
