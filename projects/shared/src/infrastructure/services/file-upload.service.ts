import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'shared/core';
import { ToastService } from '../ui/components/toast/toast.service';

/** avatar: foto de perfil, la puede subir cualquier usuario (solo PNG/JPG/WebP/GIF, 2 MB). */
export type TFileScope = 'public' | 'private' | 'avatar';

export interface IUploadedFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  /** Absolute URL of the file. */
  url: string;
}

/** Same limit as the API (files.max-size-bytes). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Uploads to the API (`/files`). Public files are images anyone can load (thumbnails, logos);
 * private files (assignment deliveries) need the user's token, so they are opened with {@link open}.
 */
@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly origin = new URL(environment.apiBaseUrl).origin;

  upload(file: File, scope: TFileScope = 'private'): Observable<IUploadedFile> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<IUploadedFile>(`${environment.apiUrls.files}?scope=${scope}`, body).pipe(
      map(f => ({ ...f, url: this.origin + f.url }))
    );
  }

  /** True for files of the API that need the user's token to be downloaded. */
  isPrivateApiFile(url: string): boolean {
    return url.startsWith(`${this.origin}/api/v1/files/`) && !url.includes('/api/v1/files/public/');
  }

  /** Opens a file in a new tab; private API files are fetched with the token first. */
  open(url: string): void {
    if (!this.isBrowser || !/^https?:\/\//i.test(url)) return;
    if (!this.isPrivateApiFile(url)) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.error('No se pudo abrir el archivo'),
    });
  }
}
