import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthSessionService } from 'auth';
import { LibButtonComponent, PageComponent, PageHeaderComponent, TenantHomeComponent, ToastService } from 'shared';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { HomeService, IHomeVersionSummary, IHomeView, THomeMode } from '../../../services/home.service';
import { BASE_BANNER_EXAMPLE, BASE_CSS_EXAMPLE, STARTER_CSS, STARTER_HTML } from './home-starter';
import { SkeletonComponent } from 'shared/loading';

/**
 * Editor de la home de una institución: HTML y CSS (sin JavaScript), borrador, publicación con historial
 * de versiones y vista previa. El admin edita la suya; el super admin elige la institución y asigna el slug.
 */
@Component({
  selector: 'adm-home-editor-container',
  imports: [FormsModule, DatePipe, PageComponent, PageHeaderComponent, LibButtonComponent, SkeletonComponent,
    TenantHomeComponent],
  templateUrl: './home-editor-container.html',
  styleUrl: './home-editor-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeEditorContainer implements OnInit {
  private readonly homes = inject(HomeService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(AuthSessionService);
  private readonly institutionsUc = inject(InstitutionUseCase);

  protected readonly isSuperAdmin = this.session.isSuperAdmin;
  protected readonly institutions = this.institutionsUc.institutions;
  protected readonly institutionId = signal<string | null>(this.session.institutionId());

  protected readonly state = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly view = signal<IHomeView | null>(null);
  protected readonly versions = signal<IHomeVersionSummary[]>([]);
  protected readonly mode = signal<THomeMode>('BASE');
  protected readonly html = signal('');
  protected readonly css = signal('');
  protected readonly slug = signal('');
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly showPreview = signal(true);

  protected readonly baseDomain = (globalThis as { TENANT_BASE_DOMAIN?: string }).TENANT_BASE_DOMAIN || 'gemsinnovations.com';
  protected readonly publicUrl = computed(() => {
    const slug = this.view()?.slug;
    return slug ? `https://${slug}.${this.baseDomain}` : null;
  });
  protected readonly dirty = computed(() => {
    const draft = this.view()?.draft;
    return !!draft && (this.mode() !== draft.mode || this.html() !== (draft.html ?? '') || this.css() !== (draft.css ?? ''));
  });

  /** Vista previa: los marcadores se muestran de forma simbólica; el resultado real se ve en el subdominio. */
  protected readonly previewHtml = computed(() => this.mode() === 'CUSTOM'
    ? this.html().split('{{cursos}}').join('<p><em>[aquí aparecen los cursos de la institución]</em></p>')
      .split('{{nombre}}').join('Tu institución').split('{{ingresar}}').join('#').split('{{logo}}').join('')
    : this.html());

  constructor() {
    effect(() => { if (this.institutionId()) this.load(); });
  }

  ngOnInit(): void {
    if (this.isSuperAdmin()) this.institutionsUc.load(undefined, 1, 100);
  }

  protected selectInstitution(id: string): void {
    this.view.set(null);
    this.versions.set([]);
    this.state.set('idle');
    this.institutionId.set(id || null);
  }

  private load(): void {
    const id = this.institutionId();
    if (!id) return;
    this.state.set('loading');
    this.homes.get(id).subscribe({
      next: view => { this.apply(view); this.state.set('ready'); this.loadVersions(); },
      error: () => this.state.set('error'),
    });
  }

  private loadVersions(): void {
    const id = this.institutionId();
    if (id) this.homes.versions(id).subscribe({ next: list => this.versions.set(list), error: () => this.versions.set([]) });
  }

  private apply(view: IHomeView): void {
    this.view.set(view);
    this.mode.set(view.draft.mode ?? 'BASE');
    this.html.set(view.draft.html ?? '');
    this.css.set(view.draft.css ?? '');
    this.slug.set(view.slug ?? '');
  }

  private run(action: (id: string) => Observable<IHomeView>, success: string, refreshVersions = false): void {
    const id = this.institutionId();
    if (!id || this.busy()) return;
    this.busy.set(true);
    action(id).subscribe({
      next: view => {
        this.busy.set(false);
        this.apply(view);
        this.toast.success(success);
        if (refreshVersions) this.loadVersions();
      },
      error: err => { this.busy.set(false); this.toast.error(err?.error?.message ?? 'No se pudo completar la acción'); },
    });
  }

  protected saveDraft(): void {
    this.run(id => this.homes.saveDraft(id, this.mode(), this.html(), this.css()), 'Borrador guardado');
  }

  /** Guarda lo escrito y lo publica como una nueva versión. */
  protected publish(): void {
    const note = this.note();
    this.run(id => new Observable<IHomeView>(subscriber => {
      this.homes.saveDraft(id, this.mode(), this.html(), this.css()).subscribe({
        next: () => this.homes.publish(id, note).subscribe(subscriber),
        error: error => subscriber.error(error),
      });
    }), 'Versión publicada', true);
    this.note.set('');
  }

  protected setMode(mode: THomeMode): void { this.mode.set(mode); }

  /** Carga un ejemplo para empezar; pide confirmar si ya hay algo escrito. */
  protected useExample(): void {
    if ((this.html().trim() || this.css().trim()) && !confirm('Esto reemplaza el HTML y el CSS del editor. ¿Continuar?')) return;
    if (this.mode() === 'CUSTOM') { this.html.set(STARTER_HTML); this.css.set(STARTER_CSS); }
    else { this.html.set(BASE_BANNER_EXAMPLE); this.css.set(BASE_CSS_EXAMPLE); }
  }

  protected unpublish(): void {
    this.run(id => this.homes.unpublish(id), 'La institución vuelve a la portada por defecto', true);
  }

  protected restore(version: number): void {
    this.run(id => this.homes.restore(id, version), `Versión ${version} cargada en el borrador (publícala para usarla)`);
  }

  protected assignSlug(): void {
    this.run(id => this.homes.assignSlug(id, this.slug()), 'Subdominio asignado');
  }
}
