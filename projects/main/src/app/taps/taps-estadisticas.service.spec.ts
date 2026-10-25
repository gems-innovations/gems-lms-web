import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AnalyticsService } from '../analytics.service';
import { TapsEstadisticasService } from './taps-estadisticas.service';

describe('TapsEstadisticasService', () => {
  let service: TapsEstadisticasService, http: HttpTestingController, interno: boolean;

  beforeEach(() => {
    interno = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AnalyticsService, useValue: { isInternal: () => interno } }],
    });
    service = TestBed.inject(TapsEstadisticasService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const cuerpo = (): unknown => http.expectOne(r => r.method === 'POST' && r.url.endsWith('/public/taps/eventos')).request.body;

  it('envía vista, respuesta, completado y compartido sin ninguna identidad', () => {
    service.vista('napoleon'); expect(cuerpo()).toEqual({ tapId: 'napoleon', evento: 'vista' });
    service.respuesta('napoleon', 2, true); expect(cuerpo()).toEqual({ tapId: 'napoleon', evento: 'respuesta', pregunta: 2, acierto: true });
    service.completado('napoleon'); expect(cuerpo()).toEqual({ tapId: 'napoleon', evento: 'completado' });
    service.compartido('napoleon'); expect(cuerpo()).toEqual({ tapId: 'napoleon', evento: 'compartido' });
  });

  it('el navegador del equipo (?interno=1) no envía nada', () => {
    interno = true;
    service.vista('napoleon'); service.respuesta('napoleon', 0, false);
    http.expectNone(() => true);
  });
});