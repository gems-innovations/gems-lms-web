import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CertificateService } from '../../../services/certificate.service';
import { ICertification } from '../../../../domain/model/certificate.model';

const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;

@Component({
  selector: 'edu-certificate-verification',
  imports: [DatePipe, RouterLink],
  templateUrl: './certificate-verification-container.html',
  styleUrl: './certificate-verification-container.scss',
})
export class CertificateVerificationContainer {
  private readonly service = inject(CertificateService);
  private readonly code: string;
  readonly certificate = signal<ICertification | null>(null);
  readonly loading = signal(true);
  readonly invalid = signal(false);
  readonly failed = signal(false);

  constructor(route: ActivatedRoute) {
    this.code = route.snapshot.paramMap.get('code') ?? '';
    this.verify();
  }

  verify(): void {
    this.loading.set(true);
    this.invalid.set(false);
    this.failed.set(false);
    this.service.verify(this.code).subscribe({
      next: certificate => { this.certificate.set(certificate); this.loading.set(false); },
      error: (error: unknown) => {
        if (this.isRejection(error)) this.invalid.set(true);
        else this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private isRejection(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    return error.status >= HTTP_CLIENT_ERROR_MIN && error.status < HTTP_SERVER_ERROR_MIN
      && error.status !== HTTP_REQUEST_TIMEOUT && error.status !== HTTP_TOO_MANY_REQUESTS;
  }
}
