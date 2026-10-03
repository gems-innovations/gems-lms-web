import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CertificateService } from '../../../services/certificate.service';
import { ICertification } from '../../../../domain/model/certificate.model';

@Component({
  selector: 'edu-certificate-verification',
  imports: [DatePipe, RouterLink],
  templateUrl: './certificate-verification-container.html',
  styleUrl: './certificate-verification-container.scss',
})
export class CertificateVerificationContainer {
  private readonly service = inject(CertificateService);
  readonly certificate = signal<ICertification | null>(null);
  readonly loading = signal(true);
  readonly invalid = signal(false);

  constructor(route: ActivatedRoute) {
    const code = route.snapshot.paramMap.get('code') ?? '';
    this.service.verify(code).subscribe({
      next: certificate => { this.certificate.set(certificate); this.loading.set(false); },
      error: () => { this.invalid.set(true); this.loading.set(false); },
    });
  }
}
