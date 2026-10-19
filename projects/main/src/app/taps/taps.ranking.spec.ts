import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { emptyInterest } from './taps.interest';
import { startRun } from './taps.logic';
import { MAX_PANEL_CARDS, panelCards } from './taps.panel';
import {
  IPartidaRespuesta, IRanking, UUID_V4, cierreDia, cierrePeriodo, cierreSemana, cuentaRegresiva, duracionCorta, esPartidaRespuesta, etiquetaPuesto,
  filaFijada, fraseDistancia, frasePercentil, frasePuesto, nuevoUuid, temaDeRanking, xpDeTap,
} from './taps.ranking';
import { ALIAS_KEY, JUGADOR_KEY, TapsRankingService, claveDe, rankingNoDisponible } from './taps-ranking.service';
import { TapXpComponent } from './tap-xp.component';
import { TapsRankingComponent } from './taps-ranking.component';
import { ITap } from './taps.types';

const H = 3600 * 1000;
const RESPUESTA: IPartidaRespuesta = { alias: 'Creeper Veloz 482', xpGanado: 60, semana: { puesto: 7, jugadores: 120, xp: 240 }, hoy: { percentil: 72, jugadores: 80 } };
const fila = (puesto: number, xp: number, esTu = false) => ({ puesto, alias: `Jugador ${puesto}`, xp, esTu });
const ranking = (over: Partial<IRanking> = {}): IRanking => ({
  periodo: 'semana', desde: '2026-10-19T05:00:00Z', hasta: '2026-10-26T05:00:00Z', jugadores: 120,
  top: [fila(1, 500), fila(2, 420), fila(3, 400)], yo: null, ...over,
});

describe('ranking: lógica pura', () => {
  it('solo envía los temas que el ranking conoce', () => {
    expect(temaDeRanking('minecraft')).toBe('minecraft');
    expect(temaDeRanking('logica')).toBe('logica');
    expect(temaDeRanking('cultura')).toBe('cultura');
    expect(temaDeRanking('estudio')).toBeNull();
  });

  it('XP = aciertos × 10 + 20 si es perfecto', () => {
    expect(xpDeTap(4, 5)).toBe(40);
    expect(xpDeTap(5, 5)).toBe(70);
    expect(xpDeTap(0, 5)).toBe(0);
  });

  it('la semana cierra el lunes 00:00 de Colombia (UTC−5)', () => {
    const domingoNoche = Date.UTC(2026, 9, 19, 4, 59);           // domingo 18, 23:59 en Colombia
    expect(cierreSemana(domingoNoche)).toBe(Date.UTC(2026, 9, 19, 5));
    const lunesInicio = Date.UTC(2026, 9, 19, 5);                 // lunes 19, 00:00 en Colombia: empieza otra semana
    expect(cierreSemana(lunesInicio)).toBe(Date.UTC(2026, 9, 26, 5));
    const miercoles = Date.UTC(2026, 9, 21, 15);
    expect(cierreSemana(miercoles)).toBe(Date.UTC(2026, 9, 26, 5));
  });

  it('el día cierra a medianoche de Colombia', () => {
    expect(cierreDia(Date.UTC(2026, 9, 21, 15))).toBe(Date.UTC(2026, 9, 22, 5));
    expect(cierreDia(Date.UTC(2026, 9, 22, 3))).toBe(Date.UTC(2026, 9, 22, 5));   // 22:00 del 21 en Colombia
  });

  it('cuenta regresiva corta y legible', () => {
    expect(duracionCorta(2 * 24 * H + 5 * H + 10 * 60000)).toBe('2 d 5 h');
    expect(duracionCorta(5 * H + 12 * 60000)).toBe('5 h 12 min');
    expect(duracionCorta(12 * 60000)).toBe('12 min');
    expect(duracionCorta(20000)).toBe('menos de 1 min');
    expect(cuentaRegresiva('semana', Date.UTC(2026, 9, 25, 5))).toBe('La semana cierra en 1 d 0 h');
    expect(cuentaRegresiva('hoy', Date.UTC(2026, 9, 21, 23, 30))).toBe('Hoy se reinicia en 5 h 30 min');
  });

  it('el puesto se dice cerca; lejos, como porcentaje (nunca «puesto 18.342»)', () => {
    expect(frasePuesto(7, 120)).toBe('Puesto 7 de 120 esta semana');
    expect(frasePuesto(18342, 40000)).toBe('Estás en el 46 % de arriba esta semana');
    expect(frasePuesto(1, 1)).toBe('Abriste el ranking esta semana');
    expect(frasePuesto(0, 10)).toBeNull();
    expect(etiquetaPuesto(9, 100)).toBe('9');
    expect(etiquetaPuesto(1500, 10000)).toBe('Top 15 %');
  });

  it('el percentil compara solo cuando hay con quién y nunca dice «mejor que el 0 %»', () => {
    expect(frasePercentil(72, 80)).toBe('Mejor que el 72 % de hoy');
    expect(frasePercentil(0, 80)).toBe('Cada Tap que juegas te sube');
    expect(frasePercentil(50, 1)).toBe('Eres de los primeros en jugar hoy');
    expect(frasePercentil(50, 1, 'semana')).toBe('Eres de los primeros en jugar esta semana');
    expect(frasePercentil(72, 80, 'semana')).toBe('Mejor que el 72\u00a0% de la semana');
  });

  it('el cierre usa el `hasta` del servidor si es válido y futuro; si no, el cálculo local', () => {
    const now = Date.UTC(2026, 9, 21, 15), hasta = Date.UTC(2026, 9, 26, 6);
    expect(cierrePeriodo('semana', now, hasta)).toBe(hasta);
    expect(cierrePeriodo('semana', now, null)).toBe(Date.UTC(2026, 9, 26, 5));
    expect(cierrePeriodo('hoy', now, now - 1)).toBe(Date.UTC(2026, 9, 22, 5));
    expect(cuentaRegresiva('semana', hasta - 2 * H, hasta)).toBe('La semana cierra en 2\u00a0h 0\u00a0min');
  });

  it('«a N XP del puesto» solo si se conoce a quien va justo arriba', () => {
    const r = ranking({ top: [fila(5, 300), fila(6, 270), fila(7, 240, true)], yo: { puesto: 7, xp: 240, percentil: 90, alias: 'Yo' } });
    expect(fraseDistancia(r)).toBe('A 30 XP del puesto 6');
    expect(fraseDistancia(ranking({ yo: { puesto: 40, xp: 10, percentil: 60, alias: 'Yo' } }))).toBeNull();
    expect(fraseDistancia(ranking({ yo: { puesto: 1, xp: 500, percentil: 100, alias: 'Yo' } }))).toBe('Vas de primero');
  });

  it('tu fila se fija abajo solo si no estás en el top', () => {
    expect(filaFijada(ranking({ yo: { puesto: 40, xp: 10, percentil: 60, alias: 'Yo' } }))).toEqual({ puesto: 40, alias: 'Yo', xp: 10, esTu: true });
    expect(filaFijada(ranking({ top: [fila(1, 9, true)], yo: { puesto: 1, xp: 9, percentil: 100, alias: 'Yo' } }))).toBeNull();
    expect(filaFijada(ranking())).toBeNull();
  });

  it('genera uuid v4 y valida la respuesta de la partida', () => {
    expect(UUID_V4.test(nuevoUuid())).toBeTrue();
    expect(esPartidaRespuesta(RESPUESTA)).toBeTrue();
    expect(esPartidaRespuesta({ alias: 'x' })).toBeFalse();
    expect(esPartidaRespuesta(null)).toBeFalse();
  });
});

describe('panel: tarjeta de ranking en el resultado', () => {
  const tap: ITap = {
    id: 'a1', topic: 'minecraft', theme: 'minecraft', title: 'A', kicker: 'Quiz', scene: { world: 'pradera', host: 'leo' }, backdrop: ['#000', '#111'],
    questions: [1, 2, 3, 4, 5].map(n => ({ id: `q${n}`, q: '¿?', options: ['a', 'b'], answer: 0, why: '.' })), results: [{ min: 0, title: 'Novato', line: '.' }],
  };
  const next: ITap = { ...tap, id: 'a2' };
  const ctx = { tap, run: { ...startRun(tap), finished: true, score: 5 }, next, interest: emptyInterest(), now: Date.now(), topicName: 'Minecraft', topicColor: '#5fbf3a' };

  it('sin respuesta del API no hay tarjeta de ranking (nada inventado)', () => {
    expect(panelCards(ctx, [tap, next]).some(c => c.id === 'ranking')).toBeFalse();
  });

  it('con respuesta va primero, con «Ver ranking» y sin pasar de 3 tarjetas ni perder la llamada principal', () => {
    const cards = panelCards({ ...ctx, partida: RESPUESTA }, [tap, next]);
    expect(cards[0].id).toBe('ranking');
    expect(cards[0].big).toBe('Puesto 7 de 120');
    expect(cards[0].body).toBe('Llevas 240 XP esta semana.');
    expect(cards[0].link?.action).toBe('ranking');
    expect(cards.length).toBeLessThanOrEqual(MAX_PANEL_CARDS);
    expect(cards.filter(c => c.cta).length).toBe(1);
  });
});

describe('TapsRankingService', () => {
  let http: HttpTestingController;
  let service: TapsRankingService;
  const usuario = signal<{ id: string } | null>(null);
  const sesion = { user: usuario, isAuthenticated: () => !!usuario() };
  const setup = (platform = 'browser') => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: platform }, { provide: AuthSessionService, useValue: sesion },
    ] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TapsRankingService);
  };
  const partida = { tapId: 'mc-1', topic: 'minecraft', aciertos: 4, total: 5, duracionMs: 41234.6 };

  const limpiar = () => [JUGADOR_KEY, ALIAS_KEY].forEach(k => [null, 'ana', 'beto'].forEach(u => localStorage.removeItem(claveDe(k, u))));
  beforeEach(() => { usuario.set(null); limpiar(); });
  afterEach(() => { http?.verify(); limpiar(); });

  it('id y alias van por dueño: iniciar o cerrar sesión cambia de jugador (equipo compartido)', () => {
    setup();
    const invitado = service.jugadorId();
    service.enviarPartida(partida);
    http.expectOne(r => r.url.endsWith('/public/taps/partidas')).flush(RESPUESTA);
    expect(service.alias()).toBe('Creeper Veloz 482');

    usuario.set({ id: 'ana' });
    TestBed.tick();
    const ana = service.jugadorId();
    expect(ana).not.toBe(invitado);
    expect(localStorage.getItem(claveDe(JUGADOR_KEY, 'ana'))).toBe(ana);
    expect(service.alias()).toBeNull();                       // el alias del invitado no es de Ana
    expect(service.partida('mc-1')).toBeUndefined();          // ni su tarjeta de XP

    usuario.set({ id: 'beto' });
    TestBed.tick();
    expect(service.jugadorId()).not.toBe(ana);

    usuario.set(null);
    TestBed.tick();
    expect(service.jugadorId()).toBe(invitado);
    expect(service.alias()).toBe('Creeper Veloz 482');
  });

  it('una respuesta que llega después de cambiar de sesión no guarda el alias en el dueño nuevo', () => {
    setup();
    service.enviarPartida(partida);
    usuario.set({ id: 'ana' });
    TestBed.tick();
    http.expectOne(r => r.url.endsWith('/public/taps/partidas')).flush(RESPUESTA);
    expect(service.alias()).toBeNull();
    expect(localStorage.getItem(claveDe(ALIAS_KEY, 'ana'))).toBeNull();
  });

  it('crea un id uuid v4 por dispositivo y lo conserva', () => {
    setup();
    const id = service.jugadorId();
    expect(UUID_V4.test(id)).toBeTrue();
    expect(localStorage.getItem(JUGADOR_KEY)).toBe(id);
    expect(service.jugadorId()).toBe(id);
  });

  it('reemplaza un id guardado que no es uuid v4', () => {
    localStorage.setItem(JUGADOR_KEY, 'no-es-un-uuid');
    setup();
    expect(UUID_V4.test(service.jugadorId())).toBeTrue();
  });

  it('sin almacenamiento usa un id en memoria estable', () => {
    setup();
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    const id = service.jugadorId();
    expect(UUID_V4.test(id)).toBeTrue();
    expect(service.jugadorId()).toBe(id);
  });

  it('envía la partida con el contrato y guarda XP, puesto y alias', () => {
    setup();
    expect(service.enviarPartida(partida)).toBeTrue();
    expect(service.partida('mc-1')).toEqual({ estado: 'enviando' });
    const req = http.expectOne(r => r.url.endsWith('/public/taps/partidas'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ jugadorId: service.jugadorId(), tapId: 'mc-1', tema: 'minecraft', aciertos: 4, total: 5, duracionMs: 41235 });
    req.flush(RESPUESTA);
    expect(service.partida('mc-1')).toEqual({ estado: 'listo', datos: RESPUESTA });
    expect(service.alias()).toBe('Creeper Veloz 482');
    expect(localStorage.getItem(ALIAS_KEY)).toBe('Creeper Veloz 482');
  });

  it('si el API no está (404) o limita (429) la partida queda sin datos, sin lanzar', () => {
    setup();
    service.enviarPartida(partida);
    http.expectOne(r => r.url.endsWith('/public/taps/partidas')).flush('', { status: 404, statusText: 'Not Found' });
    expect(service.partida('mc-1')).toEqual({ estado: 'sin-datos' });
    service.enviarPartida(partida);
    http.expectOne(r => r.url.endsWith('/public/taps/partidas')).flush('', { status: 429, statusText: 'Too Many Requests' });
    expect(service.partida('mc-1')).toEqual({ estado: 'sin-datos' });
  });

  it('una respuesta vieja no pisa la de una partida más nueva del mismo Tap', () => {
    setup();
    service.enviarPartida(partida);
    service.enviarPartida({ ...partida, aciertos: 5 });
    const [vieja, nueva] = http.match(r => r.url.endsWith('/public/taps/partidas'));
    nueva.flush({ ...RESPUESTA, xpGanado: 70 });
    vieja.flush(RESPUESTA);
    expect((service.partida('mc-1') as { datos: IPartidaRespuesta }).datos.xpGanado).toBe(70);
  });

  it('no envía temas desconocidos ni pide nada en el prerender', () => {
    setup();
    expect(service.enviarPartida({ ...partida, topic: 'estudio' })).toBeFalse();
    http.expectNone(() => true);
    TestBed.resetTestingModule();
    setup('server');
    expect(service.enviarPartida(partida)).toBeFalse();
    let emitted = false;
    service.ranking('semana', null).subscribe(() => (emitted = true));
    http.expectNone(() => true);
    expect(emitted).toBeFalse();
  });

  it('olvidar quita la partida de un Tap (al repetirlo)', () => {
    setup();
    service.enviarPartida(partida);
    service.olvidar('mc-1');
    expect(service.partida('mc-1')).toBeUndefined();
    http.expectOne(r => r.url.endsWith('/public/taps/partidas')).flush(RESPUESTA);
    expect(service.partida('mc-1')).toBeUndefined();
  });

  it('pide el ranking con periodo, tema, jugadorId y límite 20', () => {
    setup();
    let r: IRanking | undefined;
    service.ranking('hoy', 'logica').subscribe(v => (r = v));
    const req = http.expectOne(x => x.url.endsWith('/public/taps/ranking'));
    expect(req.request.params.get('periodo')).toBe('hoy');
    expect(req.request.params.get('tema')).toBe('logica');
    expect(req.request.params.get('jugadorId')).toBe(service.jugadorId());
    expect(req.request.params.get('limite')).toBe('20');
    req.flush(ranking({ yo: { puesto: 3, xp: 400, percentil: 98, alias: 'Zombi Sabio 12' } }));
    expect(r?.top.length).toBe(3);
    expect(service.alias()).toBe('Zombi Sabio 12');
  });

  it('404 del ranking = «se está preparando»; 500 no', () => {
    expect(rankingNoDisponible(new HttpErrorResponse({ status: 404 }))).toBeTrue();
    expect(rankingNoDisponible(new HttpErrorResponse({ status: 500 }))).toBeFalse();
  });
});

describe('TapXpComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('con datos muestra XP, puesto de la semana y percentil de hoy', async () => {
    const f = TestBed.createComponent(TapXpComponent);
    f.componentRef.setInput('estado', { estado: 'listo', datos: RESPUESTA });
    f.detectChanges();
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.xp__lineas')?.textContent).toContain('Puesto 7 de 120 esta semana');
    expect(el.querySelector('.xp__lineas')?.textContent).toContain('Mejor que el 72 % de hoy');
    expect(el.querySelector('.visually-hidden')?.textContent).toContain('Ganaste 60 XP');
    await new Promise(r => setTimeout(r, 800));
    f.detectChanges();
    expect(el.querySelector('.xp__num')?.textContent?.trim()).toBe('+60 XP');
  });

  it('sin datos (el API no respondió) no aparece nada', async () => {
    const f = TestBed.createComponent(TapXpComponent);
    f.componentRef.setInput('estado', { estado: 'sin-datos' });
    f.detectChanges();
    await f.whenStable();
    expect(f.nativeElement.querySelector('.xp')).toBeNull();
  });

  it('«Ver ranking» avisa al resultado', async () => {
    const f = TestBed.createComponent(TapXpComponent);
    f.componentRef.setInput('estado', { estado: 'listo', datos: RESPUESTA });
    const spy = jasmine.createSpy('ranking');
    f.componentInstance.ranking.subscribe(spy);
    f.detectChanges();
    await f.whenStable();
    (f.nativeElement.querySelector('.xp__ver') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalled();
  });
});

describe('TapsRankingComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(ALIAS_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: AuthSessionService, useValue: { isAuthenticated: () => false } }],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem(ALIAS_KEY); });

  const abrir = async (tema: string | null = null) => {
    const f = TestBed.createComponent(TapsRankingComponent);
    f.componentRef.setInput('temaInicial', tema);
    f.detectChanges();
    await f.whenStable();
    return f;
  };
  const responder = async (f: Awaited<ReturnType<typeof abrir>>, body: IRanking | null, status = 200) => {
    const req = http.expectOne(r => r.url.endsWith('/public/taps/ranking'));
    if (status === 200) req.flush(body); else req.flush('', { status, statusText: 'x' });
    f.detectChanges();
    await f.whenStable();
    return req;
  };

  it('abre como diálogo modal con pestañas y el filtro del feed', async () => {
    const f = await abrir('logica');
    const req = await responder(f, ranking());
    expect(req.request.params.get('tema')).toBe('logica');
    const el: HTMLElement = f.nativeElement;
    expect((el.querySelector('dialog') as HTMLDialogElement).open).toBeTrue();
    expect(el.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Esta semana');
    expect(el.querySelector('.rk__tema[aria-pressed="true"]')?.textContent).toContain('Lógica y trampas');
    f.destroy();
  });

  it('resalta tu fila y la fija abajo cuando no estás en el top', async () => {
    const f = await abrir();
    await responder(f, ranking({ yo: { puesto: 34, xp: 50, percentil: 72, alias: 'Creeper Veloz 482' } }));
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelectorAll('.rk__lista .rk__fila').length).toBe(3);
    expect(el.querySelector('.rk__fija .is-tu')?.textContent).toContain('Creeper Veloz 482');
    expect(el.querySelector('.rk__yo')?.textContent).toContain('Puesto 34 de 120 esta semana');
    expect(el.querySelector('.rk__yo')?.textContent).toContain('Mejor que el 72 % de la semana');
    expect(el.querySelector('.rk__alias')?.textContent).toContain('Juegas como Creeper Veloz 482');
    expect(el.querySelector('.rk__nota')?.textContent).toContain('Al iniciar sesión se guarda tu progreso');
    f.destroy();
  });

  it('dentro del top, tu fila va resaltada con aria-current', async () => {
    const f = await abrir();
    await responder(f, ranking({ top: [fila(1, 500), fila(2, 300, true)], yo: { puesto: 2, xp: 300, percentil: 99, alias: 'Jugador 2' } }));
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.rk__lista [aria-current="true"]')?.textContent).toContain('Tú');
    expect(el.querySelector('.rk__fija')).toBeNull();
    expect(el.querySelector('.rk__yo')?.textContent).toContain('A 200 XP del puesto 1');
    f.destroy();
  });

  it('con el backend aún sin desplegar (404) dice que se está preparando, sin error rojo', async () => {
    const f = await abrir();
    await responder(f, null, 404);
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('El ranking se está preparando');
    expect(el.querySelector('lib-load-error')).toBeNull();
    f.destroy();
  });

  it('un fallo del servidor muestra el error del sistema con «Reintentar»', async () => {
    const f = await abrir();
    await responder(f, null, 500);
    expect(f.nativeElement.querySelector('lib-load-error')).not.toBeNull();
    f.destroy();
  });

  it('vacío: invita a jugar', async () => {
    const f = await abrir();
    await responder(f, ranking({ top: [], jugadores: 0 }));
    expect(f.nativeElement.textContent).toContain('Nadie juega todavía esta semana');
    f.destroy();
  });

  it('las flechas cambian de pestaña y piden el ranking de hoy', async () => {
    const f = await abrir();
    await responder(f, ranking());
    const tab = f.nativeElement.querySelector('#rk-tab-semana') as HTMLElement;
    tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    f.detectChanges();
    await f.whenStable();
    const req = await responder(f, ranking({ periodo: 'hoy' }));
    expect(req.request.params.get('periodo')).toBe('hoy');
    expect(f.nativeElement.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Hoy');
    expect(f.nativeElement.querySelector('.rk__reloj')?.textContent).toContain('Hoy se reinicia en');
    f.destroy();
  });

  it('al cerrar el periodo con la hoja abierta se pide el ranking del periodo nuevo (una sola vez)', async () => {
    const f = await abrir();
    const hasta = Date.now() + 60_000;
    await responder(f, ranking({ hasta: new Date(hasta).toISOString() }));
    expect(f.nativeElement.querySelector('.rk__reloj')?.textContent).toContain('La semana cierra en 1\u00a0min');
    const c = f.componentInstance as unknown as { tic(now?: number): void };
    c.tic(hasta + 1000);
    await responder(f, ranking({ hasta: new Date(hasta + 7 * 24 * H).toISOString() }));
    c.tic(hasta + 2000);                                       // ya es otro periodo: no vuelve a pedir
    http.expectNone(r => r.url.endsWith('/public/taps/ranking'));
    f.destroy();
  });

  it('avisa al feed cuando el diálogo ya se abrió', async () => {
    const f = TestBed.createComponent(TapsRankingComponent);
    const spy = jasmine.createSpy('abierto');
    f.componentInstance.abierto.subscribe(spy);
    f.detectChanges();
    await f.whenStable();
    expect(spy).toHaveBeenCalled();
    await responder(f, ranking());
    f.destroy();
  });

  it('cerrar el diálogo avisa al feed', async () => {
    const f = await abrir();
    await responder(f, ranking());
    const spy = jasmine.createSpy('cerrado');
    f.componentInstance.cerrado.subscribe(spy);
    (f.nativeElement.querySelector('.rk__cerrar') as HTMLButtonElement).click();
    await f.whenStable();
    expect(spy).toHaveBeenCalled();
    f.destroy();
  });
});
