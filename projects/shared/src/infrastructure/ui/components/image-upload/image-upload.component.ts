import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FileUploadService, MAX_UPLOAD_BYTES } from '../../../services/file-upload.service';

/**
 * Button that uploads an image as a public file and emits its URL. Mientras sube muestra el avance real
 * (barra + porcentaje) sin cambiar de tamaño; los errores dicen qué pasó (tamaño, formato, red).
 */
@Component({
  selector: 'lib-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="img-upload" [class.img-upload--busy]="busy()" [attr.aria-busy]="busy()">
      <input class="img-upload__input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
             [disabled]="busy()" (change)="onFile($event)" />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span class="img-upload__text">
        <span [style.visibility]="busy() ? 'hidden' : null">{{ label() }}</span>
        @if (busy()) { <span>Subiendo {{ percent() }} %</span> }
      </span>
      @if (busy()) {
        <span class="img-upload__bar" role="progressbar" aria-label="Subiendo imagen" aria-valuemin="0" aria-valuemax="100"
              [attr.aria-valuenow]="percent()"><i [style.transform]="'scaleX(' + progress() + ')'"></i></span>
      }
    </label>
    @if (error(); as message) { <p class="img-upload__error" role="alert">{{ message }}</p> }
  `,
  styles: [`
    :host { display: inline-flex; flex-direction: column; gap: 4px; }
    .img-upload {
      position: relative; overflow: hidden;
      display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
      padding: 6px 12px; border-radius: 6px; font-size: 0.8125rem;
      border: 1px dashed var(--color-borde-principal); color: var(--color-texto-secundario);
    }
    .img-upload:hover { color: var(--color-texto-principal); border-color: var(--color-primario-claro); }
    .img-upload:focus-within { outline: 2px solid var(--color-focus-ring, var(--color-primario)); outline-offset: 2px; }
    .img-upload__input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }
    .img-upload__text { display: inline-grid; }
    .img-upload__text > span { grid-area: 1 / 1; white-space: nowrap; }
    .img-upload--busy { cursor: progress; color: var(--color-texto-principal); }
    .img-upload__bar { position: absolute; inset: auto 0 0 0; height: 3px; background: var(--color-borde-principal); }
    .img-upload__bar i { display: block; height: 100%; transform-origin: 0 50%; background: var(--color-primario);
      transition: transform var(--dur-base, 200ms) linear; }
    .img-upload__error { margin: 0; font-size: 0.75rem; color: var(--color-error-texto, var(--color-error)); }
  `],
})
export class ImageUploadComponent {
  private readonly files = inject(FileUploadService);

  readonly label = input('Subir imagen');
  /** 'avatar' para la foto de perfil (cualquier rol, 2 MB); 'public' para imágenes del personal. */
  readonly scope = input<'public' | 'avatar'>('public');
  readonly uploaded = output<string>();

  protected readonly busy = signal(false);
  protected readonly progress = signal(0);
  protected readonly percent = signal(0);
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
    this.setProgress(0);
    this.error.set(null);
    this.files.uploadWithProgress(file, this.scope()).subscribe({
      next: p => {
        this.setProgress(p.progress);
        if (p.file) { this.busy.set(false); this.uploaded.emit(p.file.url); }
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 413) { this.error.set('La imagen supera el tamaño permitido.'); return; }
        if (err instanceof HttpErrorResponse && err.status === 415) { this.error.set('Ese formato de imagen no se admite. Usa PNG, JPG o WebP.'); return; }
        const status = err instanceof HttpErrorResponse ? err.status : -1;
        this.error.set(status === 0
          ? 'No se subió: no hay conexión. Vuelve a elegir la imagen cuando regrese la señal.'
          : status >= 500
            ? 'No se subió por una falla nuestra (no es tu imagen). Inténtalo en un momento.'
            : 'No se pudo subir la imagen. Inténtalo de nuevo.');
      },
    });
  }

  private setProgress(p: number): void {
    this.progress.set(p);
    this.percent.set(Math.round(p * 100));
  }
}
