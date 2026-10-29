import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TapsRankingService } from './taps-ranking.service';
import { TapsSocialService } from './taps-social.service';
import { cifraCompacta, leerMeGusta, leerSociales, portadasAnimadas } from './taps.social';

describe('taps.social', () => {
  it('cifra compacta en español, truncando (nunca redondea hacia arriba)', () => {
    expect([0, 7, 999, 1000, 1234, 1999, 12_345, 99_999, 100_000, 999_999, 1_000_000, 1_250_000, 25_300_000].map(cifraCompacta))
      .toEqual(['0', '7', '999', '1 mil', '1,2 mil', '1,9 mil', '12,3 mil', '99,9 mil', '100 mil', '999 mil', '1 M', '1,2 M', '25,3 M']);
    expect(cifraCompacta(-3)).toBe('0');
    expect(cifraCompacta(NaN)).toBe('0');
  });

  it('valida la respuesta del contrato y descarta filas raras', () => {
    expect(leerSociales([])).toBeNull();
    expect(leerSociales({ taps: [{ tapId: 'a', vistas: 3, meGusta: 1, meGustaYo: true }, { tapId: 'b', vistas: 2, meGusta: 0 }, { tapId: 'c', vistas: 'x', meGusta: 1 }, { vistas: 1, meGusta: 1 }] }))
      .toEqual({ a: { vistas: 3, meGusta: 1, meGustaYo: true }, b: { vistas: 2, meGusta: 0, meGustaYo: false } });
    expect(leerMeGusta({ tapId: 'a', meGusta: true, total: 4 }, 'a')).toEqual({ meGusta: true, total: 4 });
    expect(leerMeGusta({ tapId: 'otro', meGusta: true, total: 4 }, 'a')).toBeNull();
  });

  it('portadas animadas solo sin movimiento reducido, sin ahorro de datos y con más de 2 GB', () => {
    expect(portadasAnimadas({ reducido: false })).toBeTrue();
    expect(portadasAnimadas({ reducido: false, memoria: 4 })).toBeTrue();
    expect(portadasAnimadas({ reducido: true })).toBeFalse();
    expect(portadasAnimadas({ reducido: false, saveData: true })).toBeFalse();
    expect(portadasAnimadas({ reducido: false, memoria: 2 })).toBeFalse();
  });
});

describe('TapsSocialService', () => {
  let service: TapsSocialService, http: HttpTestingController;
  const JUGADOR = '9b1f5c1e-3a2b-4c5d-8e9f-0a1b2c3d4e5f';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TapsRankingService, useValue: { jugadorId: () => JUGADOR } }],
    });
    service = TestBed.inject(TapsSocialService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const tic = () => new Promise<void>(r => queueMicrotask(r));
  const sociales = () => http.expectOne(r => r.method === 'GET' && r.url.endsWith('/public/taps/sociales'));
  const meGusta = (id: string) => http.expectOne(r => r.method === 'POST' && r.url.endsWith(`/public/taps/${id}/me-gusta`));

  async function conCifras(): Promise<void> {
    service.pedir(['a', 'b']);
    await tic();
    const req = sociales();
    expect(req.request.params.get('ids')).toBe('a,b');
    expect(req.request.params.get('jugador')).toBe(JUGADOR);
    req.flush({ taps: [{ tapId: 'a', vistas: 1200, meGusta: 10, meGustaYo: false }, { tapId: 'b', vistas: 5, meGusta: 2, meGustaYo: true }] });
  }

  it('junta los pedidos en uno, no repite ids y parte en tandas de 60', async () => {
    await conCifras();
    expect(service.disponible()).toBeTrue();
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 10, meGustaYo: false });
    service.pedir(['a', 'b']);
    await tic();
    http.expectNone(() => true);
    service.pedir(Array.from({ length: 70 }, (_, i) => 'x' + i));
    await tic();
    const tandas = http.match(r => r.url.endsWith('/public/taps/sociales'));
    expect(tandas.map(t => t.request.params.get('ids')!.split(',').length)).toEqual([60, 10]);
    tandas.forEach(t => t.flush({ taps: [] }));
  });

  it('me gusta optimista: sube al tocar y queda con el total del servidor', async () => {
    await conCifras();
    service.alternar('a');
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 11, meGustaYo: true });
    const req = meGusta('a');
    expect(req.request.body).toEqual({ jugador: JUGADOR, meGusta: true });
    req.flush({ tapId: 'a', meGusta: true, total: 15 });
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 15, meGustaYo: true });
  });

  it('si el envío falla, vuelve atrás; con 404 se ocultan los corazones', async () => {
    await conCifras();
    service.alternar('b');
    expect(service.datos()['b'].meGustaYo).toBeFalse();
    meGusta('b').flush({}, { status: 500, statusText: 'Error' });
    expect(service.datos()['b']).toEqual({ vistas: 5, meGusta: 2, meGustaYo: true });
    expect(service.disponible()).toBeTrue();
    service.alternar('b');
    const limite = meGusta('b');
    expect(limite.request.headers.has('Authorization')).toBeFalse();
    limite.flush({ codigo: 'TAPS_TOO_MANY_GAMES' }, { status: 429, statusText: 'Too Many Requests' });
    expect(service.datos()['b'].meGustaYo).toBeTrue();
    http.expectNone(() => true);
    service.alternar('b');
    meGusta('b').flush({}, { status: 404, statusText: 'No existe' });
    expect(service.datos()['b'].meGustaYo).toBeTrue();
    expect(service.disponible()).toBeFalse();
    service.alternar('a');
    http.expectNone(() => true);
  });

  it('sin la ruta (404) o con una respuesta ajena al contrato no hay cifras ni corazón', async () => {
    service.pedir(['a']);
    await tic();
    sociales().flush({}, { status: 404, statusText: 'No existe' });
    expect(service.disponible()).toBeFalse();
    service.pedir(['b']);
    await tic();
    http.expectNone(() => true);
    service.alternar('a');
    http.expectNone(() => true);
  });

  it('una respuesta que no es la del contrato cuenta como sin API', async () => {
    service.pedir(['a']);
    await tic();
    sociales().flush([]);
    expect(service.disponible()).toBeFalse();
    expect(service.datos()).toEqual({});
  });
});
