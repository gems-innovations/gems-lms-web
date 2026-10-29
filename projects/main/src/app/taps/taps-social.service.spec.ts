import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TapsRankingService } from './taps-ranking.service';
import { TapsSocialService } from './taps-social.service';

const JUGADOR = '3f1c2b7a-9d4e-4c1a-8b2f-0a1b2c3d4e5f';

describe('TapsSocialService', () => {
  let service: TapsSocialService, http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TapsRankingService, useValue: { jugadorId: () => JUGADOR } }],
    });
    service = TestBed.inject(TapsSocialService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const cargar = (s = { likes: 4, comentarios: 2, yoLike: false }): void => {
    service.cargar('cu-mitos');
    const req = http.expectOne(r => r.method === 'GET' && r.url.endsWith('/public/taps/cu-mitos/social'));
    expect(req.request.params.get('jugadorId')).toBe(JUGADOR);
    req.flush(s);
  };

  it('no muestra cifras hasta que llegan, y las pide una sola vez', () => {
    expect(service.de('cu-mitos')).toBeUndefined();
    cargar();
    expect(service.de('cu-mitos')).toEqual({ likes: 4, comentarios: 2, yoLike: false });
    service.cargar('cu-mitos');
    http.expectNone(() => true);
  });

  it('si la lectura falla no inventa nada y deja reintentar', () => {
    service.cargar('cu-mitos');
    http.expectOne(r => r.url.endsWith('/social')).flush(null, { status: 500, statusText: 'x' });
    expect(service.de('cu-mitos')).toBeUndefined();
    cargar();
    expect(service.de('cu-mitos')?.likes).toBe(4);
  });

  it('el like es optimista y vuelve atrás si el servidor falla', () => {
    cargar();
    service.alternarLike('cu-mitos');
    expect(service.de('cu-mitos')).toEqual({ likes: 5, comentarios: 2, yoLike: true });
    http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/cu-mitos/like')).flush(null, { status: 500, statusText: 'x' });
    expect(service.de('cu-mitos')).toEqual({ likes: 4, comentarios: 2, yoLike: false });
  });

  it('con toques rápidos gana la última respuesta', () => {
    cargar();
    service.alternarLike('cu-mitos');
    service.alternarLike('cu-mitos');
    expect(service.de('cu-mitos')?.yoLike).toBeFalse();
    http.expectOne(r => r.method === 'PUT').flush({ likes: 5, comentarios: 2, yoLike: true });
    expect(service.de('cu-mitos')?.yoLike).toBeFalse();
    http.expectOne(r => r.method === 'DELETE').flush({ likes: 4, comentarios: 2, yoLike: false });
    expect(service.de('cu-mitos')).toEqual({ likes: 4, comentarios: 2, yoLike: false });
  });

  it('comentar y borrar mueven el contador', () => {
    cargar();
    service.comentar('cu-mitos', 'hola').subscribe();
    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/cu-mitos/comentarios'));
    expect(req.request.body).toEqual({ texto: 'hola' });
    req.flush({ id: 9, alias: 'Lobo Sabio 120', texto: 'hola', creado: '2026-10-29T20:00:00Z', mio: true });
    expect(service.de('cu-mitos')?.comentarios).toBe(3);
    service.borrar('cu-mitos', 9).subscribe();
    http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/cu-mitos/comentarios/9')).flush(null);
    expect(service.de('cu-mitos')?.comentarios).toBe(2);
  });

  it('pagina con el cursor', () => {
    service.comentarios('cu-mitos', '41').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/cu-mitos/comentarios'));
    expect(req.request.params.get('cursor')).toBe('41');
    req.flush({ comentarios: [], siguiente: null });
  });
});
