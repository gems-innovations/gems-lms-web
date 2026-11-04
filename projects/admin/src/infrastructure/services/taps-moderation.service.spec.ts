import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { TapsModerationService } from './taps-moderation.service';

describe('TapsModerationService', () => {
  let service: TapsModerationService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/taps/comentarios`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TapsModerationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('pide la cola con cursor y guarda la decisión', () => {
    service.reportados().subscribe();
    expect(http.expectOne(`${base}/reportados`).request.params.has('antes')).toBeFalse();
    service.reportados(42).subscribe();
    expect(http.expectOne(r => r.url === `${base}/reportados`).request.params.get('antes')).toBe('42');

    service.cambiarOculto(7, true).subscribe();
    const put = http.expectOne(`${base}/7/estado`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ oculto: true });
  });
});
