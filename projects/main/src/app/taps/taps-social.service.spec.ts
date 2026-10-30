import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { signal } from '@angular/core';
import { AuthSessionService } from 'auth/core';
import { TapsSocialService } from './taps-social.service';
import { cifraCompacta, haceCuanto, leerComentarios, leerMeGusta, leerMios, leerSociales, portadasAnimadas } from './taps.social';

describe('taps.social', () => {
  it('cifra compacta en español, truncando (nunca redondea hacia arriba)', () => {
    expect([0, 7, 999, 1000, 1234, 1999, 12_345, 99_999, 100_000, 999_999, 1_000_000, 1_250_000, 25_300_000].map(cifraCompacta))
      .toEqual(['0', '7', '999', '1 mil', '1,2 mil', '1,9 mil', '12,3 mil', '99,9 mil', '100 mil', '999 mil', '1 M', '1,2 M', '25,3 M']);
    expect(cifraCompacta(-3)).toBe('0');
    expect(cifraCompacta(NaN)).toBe('0');
  });

  it('valida las respuestas del contrato y descarta filas raras', () => {
    expect(leerSociales([])).toBeNull();
    expect(leerSociales({ taps: [{ tapId: 'a', vistas: 3, meGusta: 1, comentarios: 4 }, { tapId: 'b', vistas: 2, meGusta: 0 }, { tapId: 'c', vistas: 'x', meGusta: 1 }, { vistas: 1, meGusta: 1 }] }))
      .toEqual({ a: { vistas: 3, meGusta: 1, comentarios: 4 }, b: { vistas: 2, meGusta: 0, comentarios: null } });
    expect(leerMios({ taps: [{ tapId: 'a', meGustaYo: true }, { tapId: 'b' }] })).toEqual({ a: true, b: false });
    expect(leerMeGusta({ tapId: 'a', meGusta: true, total: 4 }, 'a')).toEqual({ meGusta: true, total: 4 });
    expect(leerMeGusta({ tapId: 'otro', meGusta: true, total: 4 }, 'a')).toBeNull();
    expect(leerComentarios({})).toBeNull();
    expect(leerComentarios({ comentarios: [{ id: 7, autor: 'Ana', texto: '<b>hola</b>', creado: '2026-10-29T10:00:00Z', mio: true }, { id: 'x' }], siguiente: 'c2' }))
      .toEqual({ comentarios: [{ id: '7', autor: 'Ana', texto: '<b>hola</b>', creado: '2026-10-29T10:00:00Z', mio: true }], siguiente: 'c2' });
    expect(leerComentarios({ comentarios: [], siguiente: null })?.siguiente).toBeNull();
  });

  it('hace cuánto, corto', () => {
    const ahora = Date.parse('2026-10-29T12:00:00Z');
    expect(['2026-10-29T11:59:30Z', '2026-10-29T11:55:00Z', '2026-10-29T09:00:00Z', '2026-10-27T12:00:00Z', 'nada'].map(t => haceCuanto(t, ahora)))
      .toEqual(['ahora', 'hace 5 min', 'hace 3 h', 'hace 2 d', '']);
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
  const sesion = signal(false);
  const usuario = signal<{ email: string } | null>(null);
  // Hace las veces del interceptor de auth: marca lo que pasa por el HttpClient normal.
  const marca: HttpInterceptorFn = (req, next) => next(req.clone({ setHeaders: { Authorization: 'Bearer prueba' } }));

  beforeEach(() => {
    sesion.set(false);
    usuario.set(null);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([marca])), provideHttpClientTesting(), { provide: AuthSessionService, useValue: { isAuthenticated: sesion, user: usuario } }],
    });
    service = TestBed.inject(TapsSocialService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => http.verify());

  const tic = () => new Promise<void>(r => queueMicrotask(r));
  const sociales = () => http.expectOne(r => r.method === 'GET' && r.url.endsWith('/public/taps/sociales'));
  const mios = () => http.expectOne(r => r.method === 'GET' && r.url.endsWith('/taps/sociales/yo'));
  const meGusta = (id: string) => http.expectOne(r => r.method === 'PUT' && r.url.endsWith(`/taps/${id}/me-gusta`));

  async function conCifras(): Promise<void> {
    service.pedir(['a', 'b']);
    await tic();
    const req = sociales();
    expect(req.request.params.get('ids')).toBe('a,b');
    expect(req.request.params.has('jugador')).toBeFalse();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ taps: [{ tapId: 'a', vistas: 1200, meGusta: 10, comentarios: 3 }, { tapId: 'b', vistas: 5, meGusta: 2, comentarios: 0 }] });
  }

  async function conSesion(): Promise<void> {
    await conCifras();
    sesion.set(true);
    TestBed.tick();
    const req = mios();
    expect(req.request.headers.get('Authorization')).toBe('Bearer prueba');
    req.flush({ taps: [{ tapId: 'a', meGustaYo: false }, { tapId: 'b', meGustaYo: true }] });
  }

  it('un invitado cuenta como sin sesión: el corazón pide cuenta y no se piden sus me gusta', async () => {
    await conCifras();
    usuario.set({ email: 'x@invitado.gems.lat' });
    sesion.set(true);
    TestBed.tick();
    http.expectNone(r => r.url.endsWith('/taps/sociales/yo'));
    expect(service.alternar('a')).toBeFalse();
    http.expectNone(r => r.method === 'PUT');
  });

  it('junta los pedidos en uno, no repite ids y parte en tandas de 60', async () => {
    await conCifras();
    expect(service.disponible()).toBeTrue();
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 10, comentarios: 3, meGustaYo: false });
    service.pedir(['a', 'b']);
    await tic();
    http.expectNone(() => true);
    service.pedir(Array.from({ length: 70 }, (_, i) => 'x' + i));
    await tic();
    const tandas = http.match(r => r.url.endsWith('/public/taps/sociales'));
    expect(tandas.map(t => t.request.params.get('ids')!.split(',').length)).toEqual([60, 10]);
    tandas.forEach(t => t.flush({ taps: [] }));
  });

  it('sin sesión, tocar el corazón no pide nada y avisa que hay que entrar', async () => {
    await conCifras();
    expect(service.alternar('a')).toBeFalse();
    http.expectNone(() => true);
    expect(service.datos()['a'].meGusta).toBe(10);
  });

  it('con sesión: los propios llegan de /sociales/yo y el me gusta es optimista contra PUT', async () => {
    await conSesion();
    expect(service.datos()['b'].meGustaYo).toBeTrue();
    expect(service.alternar('a')).toBeTrue();
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 11, comentarios: 3, meGustaYo: true });
    const req = meGusta('a');
    expect(req.request.body).toEqual({ meGusta: true });
    req.flush({ tapId: 'a', meGusta: true, total: 15 });
    expect(service.datos()['a'].meGusta).toBe(15);
    sesion.set(false);
    TestBed.tick();
    expect(Object.values(service.datos()).some(d => d.meGustaYo)).toBeFalse();
  });

  it('dos toques que fallan vuelven a lo que confirmó el servidor (no queda un me gusta inventado)', async () => {
    await conSesion();
    service.alternar('a');
    service.alternar('a');
    const [dar, quitar] = http.match(r => r.method === 'PUT');
    dar.flush({}, { status: 500, statusText: 'Error' });
    quitar.flush({}, { status: 500, statusText: 'Error' });
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 10, comentarios: 3, meGustaYo: false });

    // El primero llega bien y el segundo falla: queda lo que dijo el servidor del primero.
    service.alternar('a');
    service.alternar('a');
    const [dar2, quitar2] = http.match(r => r.method === 'PUT');
    dar2.flush({ tapId: 'a', meGusta: true, total: 12 });
    quitar2.flush({}, { status: 500, statusText: 'Error' });
    expect(service.datos()['a']).toEqual({ vistas: 1200, meGusta: 12, comentarios: 3, meGustaYo: true });
  });

  it('al salir y volver a entrar, el corazón tocado sale como dice /yo, y una respuesta tardía no lo repinta sin sesión', async () => {
    await conSesion();
    service.alternar('a');
    const tarde = meGusta('a');
    sesion.set(false);
    TestBed.tick();
    tarde.flush({ tapId: 'a', meGusta: true, total: 11 });
    expect(service.datos()['a'].meGustaYo).toBeFalse();
    sesion.set(true);
    TestBed.tick();
    mios().flush({ taps: [{ tapId: 'a', meGustaYo: true }, { tapId: 'b', meGustaYo: true }] });
    expect(service.datos()['a'].meGustaYo).toBeTrue();
  });

  it('si el envío falla (o 429) vuelve atrás sin reintentar; con 404 se ocultan los corazones', async () => {
    await conSesion();
    service.alternar('b');
    meGusta('b').flush({}, { status: 500, statusText: 'Error' });
    expect(service.datos()['b']).toEqual({ vistas: 5, meGusta: 2, comentarios: 0, meGustaYo: true });
    service.alternar('b');
    meGusta('b').flush({ codigo: 'TAPS_TOO_MANY_GAMES' }, { status: 429, statusText: 'Too Many Requests' });
    expect(service.datos()['b'].meGustaYo).toBeTrue();
    http.expectNone(() => true);
    service.alternar('b');
    meGusta('b').flush({}, { status: 404, statusText: 'No existe' });
    expect(service.disponible()).toBeFalse();
    service.alternar('a');
    http.expectNone(() => true);
  });

  it('comentarios: página con cursor, publicar suma y borrar resta; 404 apaga el botón', async () => {
    await conSesion();
    let pagina: unknown;
    service.comentarios('a', 'c1').subscribe(p => (pagina = p));
    const req = http.expectOne(r => r.method === 'GET' && r.url.endsWith('/taps/a/comentarios'));
    expect(req.request.params.get('antes')).toBe('c1');
    req.flush({ comentarios: [{ id: 1, autor: 'Ana', texto: 'hola', creado: '', mio: false }], siguiente: null });
    expect(pagina).toEqual({ comentarios: [{ id: '1', autor: 'Ana', texto: 'hola', creado: '', mio: false }], siguiente: null });
    service.comentar('a', 'genial').subscribe();
    const post = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/taps/a/comentarios'));
    expect(post.request.body).toEqual({ texto: 'genial' });
    post.flush({ id: 2, autor: 'Yo', texto: 'genial', creado: '', mio: true });
    expect(service.datos()['a'].comentarios).toBe(4);
    service.borrarComentario('a', '2').subscribe();
    http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/taps/comentarios/2')).flush(null);
    expect(service.datos()['a'].comentarios).toBe(3);
    service.reportar('1').subscribe();
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/taps/comentarios/1/reportar')).flush(null);
    service.comentarios('a').subscribe({ error: () => undefined });
    http.expectOne(r => r.url.endsWith('/taps/a/comentarios')).flush({}, { status: 404, statusText: 'No existe' });
    expect(service.sinComentarios()).toBeTrue();
  });

  it('sin la ruta (404) o con una respuesta ajena al contrato no hay cifras ni corazón', async () => {
    service.pedir(['a']);
    await tic();
    sociales().flush({}, { status: 404, statusText: 'No existe' });
    expect(service.disponible()).toBeFalse();
    service.pedir(['b']);
    await tic();
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
