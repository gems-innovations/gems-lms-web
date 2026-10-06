import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FileUploadService, MAX_UPLOAD_BYTES } from '../../../services/file-upload.service';

/** Button that uploads an image as a public file and emits its URL. */
@Component({
  selector: 'lib-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="img-upload" [class.img-upload--busy]="busy()">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden
             [disabled]="busy()" (change)="onFile($event)" />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>{{ busy() ? 'Subiendo…' : label() }}</span>
    </label>
    @if (error(); as message) { <p class="img-upload__error" role="alert">{{ message }}</p> }
  `,
  styles: [`
    :host { display: inline-flex; flex-direction: column; gap: 4px; }
    .img-upload {
      display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
      padding: 6px 12px; border-radius: 6px; font-size: 0.8125rem;
      border: 1px dashed var(--color-borde-principal); color: var(--color-texto-secundario);
    }
    .img-upload:hover { color: var(--color-texto-principal); border-color: var(--color-primario-claro); }
    .img-upload--busy { opacity: 0.6; cursor: progress; }
    .img-upload__error { margin: 0; font-size: 0.75rem; color: var(--color-error); }
  `],
})
export class ImageUploadComponent {
  private readonly files = inject(FileUploadService);

  readonly label = input('Subir imagen');
  /** 'avatar' para la foto de perfil (cualquier rol, 2 MB); 'public' para imágenes del personal. */
  readonly scope = input<'public' | 'avatar'>('public');
  readonly uploaded = output<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.error.set('Selecciona una imagen.'); return; }
    const avatar = this.scope() === 'avatar';
    if (avatar && !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { this.error.set('Usa una imagen PNG, JPG, WebP o GIF.'); return; }
    const limit = avatar ? 2 * 1024 * 1024 : MAX_UPLOAD_BYTES;
    if (file.size > limit) { this.error.set(`La imagen supera los ${limit / (1024 * 1024)} MB.`); return; }
    this.busy.set(true);
    this.error.set(null);
    this.files.upload(file, this.scope()).subscribe({
      next: f => { this.busy.set(false); this.uploaded.emit(f.url); },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(err instanceof HttpErrorResponse && err.status === 413
          ? 'La imagen supera el tamaño permitido.' : 'No se pudo subir la imagen.');
      },
    });
  }
}
