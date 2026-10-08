import { Component, inject, input, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { AuthSessionService } from 'auth';
import {
  EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent, MarkdownEditorComponent, PaginationComponent,
  ConfirmationDialogComponent, ToastService,
} from 'shared';
import { CourseCommunityService } from '../../../services/course-community.service';
import type { IAnnouncement, IForumPost, IForumThread } from '../../../services/course-community.service';

export type TCommunityTab = 'announcements' | 'forum';

const PAGE_SIZE = 15;

interface IPendingDelete {
  kind: 'announcement' | 'thread' | 'post';
  id: string;
}

/**
 * Announcements and forum of a course, for students and staff alike: staff publish
 * announcements and moderate; everyone asks, answers and edits their own messages.
 */
@Component({
  selector: 'edu-course-community',
  standalone: true,
  imports: [DatePipe, FormsModule, MarkdownComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent,
    MarkdownEditorComponent, PaginationComponent, ConfirmationDialogComponent],
  templateUrl: './course-community.html',
  styleUrl: './course-community.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCommunity {
  private readonly service = inject(CourseCommunityService);
  private readonly session = inject(AuthSessionService);
  private readonly toast   = inject(ToastService);

  readonly courseId   = input.required<string>();
  readonly initialTab = input<TCommunityTab>('announcements');
  /** Opens this thread on load (e.g. from a notification). */
  readonly threadId   = input<string | null>(null);

  protected readonly staff  = this.session.isInstructorOrAbove;
  protected readonly userId = computed(() => this.session.user()?.id ?? '');
  protected readonly tab    = signal<TCommunityTab>('announcements');

  // Announcements
  protected readonly announcements      = signal<IAnnouncement[]>([]);
  protected readonly announcementsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly announcementDraft  = signal<{ id?: string; title: string; body: string; pinned: boolean } | null>(null);

  // Forum list
  protected readonly threads      = signal<IForumThread[]>([]);
  protected readonly threadTotal  = signal(0);
  protected readonly threadsState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly search       = signal('');
  protected readonly page         = signal(1);
  protected readonly totalPages   = computed(() => Math.max(1, Math.ceil(this.threadTotal() / PAGE_SIZE)));
  protected readonly threadDraft  = signal<{ id?: string; title: string; body: string } | null>(null);

  // Forum detail
  protected readonly openThread  = signal<IForumThread | null>(null);
  protected readonly posts       = signal<IForumPost[]>([]);
  protected readonly replyText   = signal('');
  protected readonly editingPost = signal<{ id: string; body: string } | null>(null);

  protected readonly busy          = signal(false);
  protected readonly pendingDelete = signal<IPendingDelete | null>(null);

  protected readonly canReply = computed(() => {
    const t = this.openThread();
    return !!t && (!t.locked || this.staff());
  });

  constructor() {
    effect(() => {
      const courseId = this.courseId();
      const tab = this.initialTab();
      const threadId = this.threadId();
      untracked(() => {
        this.tab.set(threadId ? 'forum' : tab);
        this.loadAnnouncements(courseId);
        this.loadThreads();
        if (threadId) this.showThread(threadId);
      });
    });
  }

  protected setTab(tab: TCommunityTab): void {
    this.tab.set(tab);
    if (tab === 'forum') this.openThread.set(null);
  }

  protected isMine(authorId: string): boolean { return authorId === this.userId(); }

  protected roleLabel(role: string): string {
    return role === 'STUDENT' ? '' : role === 'INSTRUCTOR' ? 'Instructor' : 'Administración';
  }

  // ── Announcements ──────────────────────────────────────────────────────────

  private loadAnnouncements(courseId = this.courseId()): void {
    this.announcementsState.set('loading');
    this.service.announcements(courseId).subscribe({
      next: list => { this.announcements.set(list); this.announcementsState.set('ready'); },
      error: () => this.announcementsState.set('error'),
    });
  }

  protected newAnnouncement(): void { this.announcementDraft.set({ title: '', body: '', pinned: false }); }

  protected editAnnouncement(a: IAnnouncement): void {
    this.announcementDraft.set({ id: a.id, title: a.title, body: a.body, pinned: a.pinned });
  }

  protected patchAnnouncement(change: Partial<{ title: string; body: string; pinned: boolean }>): void {
    this.announcementDraft.update(d => d ? { ...d, ...change } : d);
  }

  protected saveAnnouncement(): void {
    const d = this.announcementDraft();
    if (!d || !d.title.trim() || !d.body.trim() || this.busy()) return;
    this.busy.set(true);
    this.service.saveAnnouncement(this.courseId(), { title: d.title, body: d.body, pinned: d.pinned }, d.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.announcementDraft.set(null);
        this.toast.success(d.id ? 'Anuncio actualizado' : 'Anuncio publicado. Los estudiantes fueron notificados.');
        this.loadAnnouncements();
      },
      error: err => this.fail(err, 'No se pudo guardar el anuncio'),
    });
  }

  // ── Forum list ─────────────────────────────────────────────────────────────

  protected loadThreads(): void {
    this.threadsState.set('loading');
    this.service.threads(this.courseId(), { search: this.search().trim(), page: this.page() - 1, limit: PAGE_SIZE }).subscribe({
      next: p => { this.threads.set(p.items); this.threadTotal.set(p.total); this.threadsState.set('ready'); },
      error: () => this.threadsState.set('error'),
    });
  }

  protected applySearch(): void { this.page.set(1); this.loadThreads(); }
  protected goToPage(page: number): void { this.page.set(page); this.loadThreads(); }

  protected newThread(): void { this.threadDraft.set({ title: '', body: '' }); }

  protected editThread(t: IForumThread): void { this.threadDraft.set({ id: t.id, title: t.title, body: t.body }); }

  protected patchThread(change: Partial<{ title: string; body: string }>): void {
    this.threadDraft.update(d => d ? { ...d, ...change } : d);
  }

  protected saveThread(): void {
    const d = this.threadDraft();
    if (!d || !d.title.trim() || !d.body.trim() || this.busy()) return;
    this.busy.set(true);
    const request = d.id
      ? this.service.updateThread(this.courseId(), d.id, { title: d.title, body: d.body })
      : this.service.openThread(this.courseId(), d.title, d.body);
    request.subscribe({
      next: saved => {
        this.busy.set(false);
        this.threadDraft.set(null);
        if (d.id) this.openThread.set(saved);
        else this.showThread(saved.id);
        this.loadThreads();
      },
      error: err => this.fail(err, 'No se pudo guardar el tema'),
    });
  }

  // ── Forum detail ───────────────────────────────────────────────────────────

  protected showThread(threadId: string): void {
    this.service.thread(this.courseId(), threadId).subscribe({
      next: d => { this.openThread.set(d.thread); this.posts.set(d.posts); this.replyText.set(''); },
      error: () => this.toast.error('No se encontró el tema'),
    });
  }

  protected backToThreads(): void { this.openThread.set(null); this.threadDraft.set(null); }

  protected moderate(change: { pinned?: boolean; locked?: boolean }): void {
    const t = this.openThread();
    if (!t) return;
    this.service.updateThread(this.courseId(), t.id, { title: t.title, body: t.body, ...change }).subscribe({
      next: saved => { this.openThread.set(saved); this.loadThreads(); },
      error: err => this.fail(err, 'No se pudo actualizar el tema'),
    });
  }

  protected sendReply(): void {
    const t = this.openThread();
    const body = this.replyText().trim();
    if (!t || !body || this.busy()) return;
    this.busy.set(true);
    this.service.reply(this.courseId(), t.id, body).subscribe({
      next: post => {
        this.busy.set(false);
        this.posts.update(p => [...p, post]);
        this.openThread.set({ ...t, replyCount: t.replyCount + 1 });
        this.replyText.set('');
      },
      error: err => this.fail(err, 'No se pudo enviar la respuesta'),
    });
  }

  protected startEditPost(p: IForumPost): void { this.editingPost.set({ id: p.id, body: p.body }); }

  protected saveEditPost(): void {
    const e = this.editingPost();
    if (!e || !e.body.trim()) return;
    this.service.updatePost(this.courseId(), e.id, e.body).subscribe({
      next: saved => { this.posts.update(list => list.map(p => p.id === saved.id ? saved : p)); this.editingPost.set(null); },
      error: err => this.fail(err, 'No se pudo editar la respuesta'),
    });
  }

  // ── Deleting ───────────────────────────────────────────────────────────────

  protected askDelete(kind: IPendingDelete['kind'], id: string): void { this.pendingDelete.set({ kind, id }); }

  protected confirmDelete(): void {
    const p = this.pendingDelete();
    if (!p) return;
    const courseId = this.courseId();
    const request = p.kind === 'announcement' ? this.service.deleteAnnouncement(courseId, p.id)
      : p.kind === 'thread' ? this.service.deleteThread(courseId, p.id)
      : this.service.deletePost(courseId, p.id);
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.pendingDelete.set(null);
        if (p.kind === 'announcement') this.loadAnnouncements();
        if (p.kind === 'thread') { this.openThread.set(null); this.loadThreads(); }
        if (p.kind === 'post') {
          this.posts.update(list => list.filter(x => x.id !== p.id));
          this.openThread.update(t => t ? { ...t, replyCount: Math.max(0, t.replyCount - 1) } : t);
        }
      },
      error: err => { this.pendingDelete.set(null); this.fail(err, 'No se pudo eliminar'); },
    });
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(false);
    this.toast.error(err instanceof HttpErrorResponse && err.status === 403 ? 'No tienes permiso para hacer esto' : fallback);
  }
}
