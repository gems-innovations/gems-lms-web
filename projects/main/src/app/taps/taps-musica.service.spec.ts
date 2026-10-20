import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ITapsAudioOyente, TapsSonidoService } from './taps-sonido.service';
import { MUSICA_KEY, TAPS_MUSICA_URL, TapsMusicaService, musicaDe, redLimitada } from './taps-musica.service';
import { TAPS } from './taps.data';
import { TapsAudioRelevo } from './taps-audio-relevo';

/** Relevo fuera de TestBed (sobrevive a resetTestingModule, como el de raíz entre dos feeds). */
const nuevoRelevo = () => runInInjectionContext(Injector.create({ providers: [] }), () => new TapsAudioRelevo());

/** Reproductor falso con la forma de taps-engine/audio/musica.js: registra lo que se le pide. */
function musicaFalsa() {
  const log: string[] = [];
  return {
    log,
    conectar: () => log.push('conectar'),
    encender: (on: boolean) => log.push(`encender:${on}`),
    silenciar: (m: boolean) => log.push(`silenciar:${m}`),
    pausar: (p?: string) => log.push(`pausar:${p}`),
    reanudar: (p?: string) => log.push(`reanudar:${p}`),
    alTap: (i: { mundo: string }, o?: { continuar?: boolean }) => { log.push(`tap:${i.mundo}`); if (o?.continuar) log.push(`tap:${i.mundo}:continuar`); return Promise.resolve('x'); },
    preparar: (i: { mundo: string }, ctx?: unknown) => { log.push(`preparar:${i.mundo}:${ctx ? 'ctx' : 'sin'}`); return Promise.resolve('x'); },
    alResultado: (o: { perfecto?: boolean; racha?: boolean }) => { log.push(`resultado:${!!o.perfecto}:${!!o.racha}`); return Promise.resolve('x'); },
    anticipar: (i: { mundo: string }) => { log.push(`anticipar:${i.mundo}`); return Promise.resolve(); },
    voz: (on: boolean) => log.push(`voz:${on}`),
    efecto: () => log.push('efecto'),
    destruir: () => log.push('destruir'),
  };
}

/** Sonido falso: guarda el oyente y simula el AudioContext que solo existe tras un gesto. */
class SonidoFalso {
  oyente: ITapsAudioOyente | null = null;
  ctx: AudioContext | null = null;
  /** El contexto creado sin gesto (suspendido) para decodificar de antemano; el gesto lo adopta. */
  previo: AudioContext | null = null;
  desbloqueos = 0;
  escuchar(o: ITapsAudioOyente | null) { this.oyente = o; o?.silencio?.(true); if (this.ctx) o?.contexto?.(this.ctx); }
  contexto() { return this.ctx; }
  contextoPrevio() { return this.ctx ? null : (this.previo ??= {} as AudioContext); }
  desbloquear() { this.desbloqueos++; this.ctx ??= this.previo ?? ({} as AudioContext); this.oyente?.contexto?.(this.ctx); }
}

function crear(platform = 'browser', relevo = nuevoRelevo(), ctx: AudioContext | null = null) {
  const sonido = new SonidoFalso();
  sonido.ctx = ctx;                                                    // el contexto que trae el sonido relevado
  TestBed.configureTestingModule({ providers: [TapsMusicaService, { provide: TapsSonidoService, useValue: sonido }, { provide: PLATFORM_ID, useValue: platform },
    { provide: TapsAudioRelevo, useValue: relevo }] });
  const service = TestBed.inject(TapsMusicaService);
  const musica = musicaFalsa(), pedidos: string[] = [];
  spyOn(service as unknown as { importar: (url: string) => Promise<unknown> }, 'importar').and.callFake((url: string) => {
    pedidos.push(url);
    return url === TAPS_MUSICA_URL ? Promise.resolve({ crearMusica: () => musica }) : Promise.reject(new Error('404'));
  });
  return { service, sonido, musica, pedidos };
}
const espera = () => new Promise(r => setTimeout(r));
const tapCueva = TAPS.find(t => t.scene.world === 'cueva')!;

describe('TapsMusicaService', () => {
  beforeEach(() => { try { localStorage.removeItem(MUSICA_KEY); } catch { /* sin storage */ } });
  afterEach(() => { try { localStorage.removeItem(MUSICA_KEY); } catch { /* sin storage */ } });

  it('en el servidor (SSR/prerender) no hace nada', async () => {
    const { service, pedidos } = crear('server');
    service.iniciar();
    service.alTap(tapCueva);
    await espera();
    expect(service.encendida()).toBeFalse();
    expect(pedidos).toEqual([]);
  });

  it('apagada a propósito (guardado «off»): sigue apagada y no carga el reproductor aunque haya gestos', async () => {
    localStorage.setItem(MUSICA_KEY, 'off');
    const { service, sonido, pedidos } = crear();
    service.iniciar();
    expect(service.encendida()).toBeFalse();
    sonido.desbloquear();
    service.alTap(tapCueva);
    await espera();
    expect(pedidos).toEqual([]);
  });

  for (const guardado of [null, 'on']) {
    it(`encendida (${guardado ?? 'sin preferencia: por defecto'}): espera al primer gesto (AudioContext) para cargar y suena la pista del Tap`, async () => {
      if (guardado) localStorage.setItem(MUSICA_KEY, guardado);
      const { service, sonido, musica, pedidos } = crear();
      service.iniciar();
      expect(service.encendida()).toBeTrue();
      service.alTap(tapCueva);
      await espera();
      expect(pedidos).toEqual([]);                                      // sin gesto, nada
      sonido.desbloquear();
      await espera(); await espera();
      expect(pedidos).toEqual([TAPS_MUSICA_URL]);
      expect(musica.log).toContain('encender:true');
      expect(musica.log).toContain('conectar');
      expect(musica.log).toContain(`tap:${tapCueva.scene.world}`);
      expect(localStorage.getItem(MUSICA_KEY)).toBe(guardado, 'el defecto no se escribe: solo lo que decide la persona');
    });
  }

  // Antes la portada no tenía música (iniciar(portada) la dejaba apagada siempre). Ahora sigue la misma preferencia que
  // /taps (fix/taps-musica-primer-tap): el dueño quiere música desde el primer Tap, y la portada es donde entra la mayoría.
  it('la portada usa la misma preferencia que /taps: encendida por defecto o con «on», apagada con «off»', () => {
    for (const [guardado, esperado] of [['on', true], [null, true], ['off', false]] as const) {
      TestBed.resetTestingModule();
      if (guardado) localStorage.setItem(MUSICA_KEY, guardado); else localStorage.removeItem(MUSICA_KEY);
      const { service } = crear();
      service.iniciar();
      expect(service.encendida()).toBe(esperado);
    }
  });

  it('precargar: en reposo solo baja; con intención decodifica con el contexto suspendido, sin conectar ni sonar', async () => {
    const { service, sonido, musica, pedidos } = crear();
    service.iniciar();
    service.alTap(tapCueva);
    service.precargar(tapCueva);
    await espera(); await espera();
    expect(pedidos).toEqual([TAPS_MUSICA_URL]);
    expect(musica.log).toContain(`preparar:${tapCueva.scene.world}:sin`);
    expect(sonido.previo).toBeNull('sin intención no se crea contexto ni se decodifica');
    service.intencion();
    await espera(); await espera();
    expect(musica.log).toContain(`preparar:${tapCueva.scene.world}:ctx`);
    expect(musica.log).not.toContain('conectar');                    // nada suena antes del gesto
    expect(sonido.desbloqueos).toBe(0);
    sonido.desbloquear();                                             // el gesto: adopta el mismo contexto y conecta
    await espera(); await espera();
    expect(sonido.ctx).toBe(sonido.previo);
    expect(musica.log).toContain('conectar');
    expect(musica.log).toContain(`tap:${tapCueva.scene.world}`);
    expect(pedidos).toEqual([TAPS_MUSICA_URL], 'el módulo no se vuelve a pedir');
  });

  it('precargar: con la música apagada a propósito no pide nada', async () => {
    localStorage.setItem(MUSICA_KEY, 'off');
    const { service, sonido, pedidos } = crear();
    service.iniciar();
    service.precargar(tapCueva);
    await espera();
    expect(pedidos).toEqual([]);
    expect(sonido.previo).toBeNull();
  });

  it('relevo portada → /taps: el reproductor que suena pasa al feed nuevo sin destruirse y su primer Tap continúa la pista', async () => {
    const relevo = nuevoRelevo();
    const a = crear('browser', relevo);
    a.service.iniciar();
    a.sonido.desbloquear();
    a.service.alTap(tapCueva);
    await espera(); await espera();
    a.service.relevarAlSalir();
    TestBed.resetTestingModule();                                     // se va la portada
    expect(a.musica.log).not.toContain('destruir');
    const b = crear('browser', relevo, a.sonido.ctx);
    b.service.iniciar();
    b.service.alTap(tapCueva);
    await espera();
    expect(b.pedidos).toEqual([], 'el feed nuevo no vuelve a cargar el reproductor');
    expect(a.musica.log).toContain(`tap:${tapCueva.scene.world}:continuar`);
    expect(relevo.recoger('musica')).toBeNull();
  });

  it('relevo: si el sonido no se entregó (sin contexto o cerrado), la música recogida se cierra', async () => {
    for (const ctx of [null, { state: 'closed' } as AudioContext]) {
      const relevo = nuevoRelevo();
      const a = crear('browser', relevo);
      a.service.iniciar();
      a.sonido.desbloquear();
      await espera(); await espera();
      a.service.relevarAlSalir();
      TestBed.resetTestingModule();
      const b = crear('browser', relevo, ctx);
      b.service.iniciar();
      expect(a.musica.log).toContain('destruir');
      TestBed.resetTestingModule();
    }
  });

  it('redLimitada: ahorro de datos, 2G y 3G no precargan; 4G sí', () => {
    const previo = Object.getOwnPropertyDescriptor(navigator, 'connection');
    const poner = (c: unknown) => Object.defineProperty(navigator, 'connection', { value: c, configurable: true });
    try {
      for (const [c, esperado] of [[{ saveData: true, effectiveType: '4g' }, true], [{ effectiveType: '2g' }, true], [{ effectiveType: 'slow-2g' }, true],
        [{ effectiveType: '3g' }, true], [{ effectiveType: '4g' }, false], [undefined, false]] as const) {
        poner(c);
        expect(redLimitada()).withContext(JSON.stringify(c)).toBe(esperado);
      }
    } finally {
      if (previo) Object.defineProperty(navigator, 'connection', previo); else delete (navigator as unknown as { connection?: unknown }).connection;
    }
  });

  it('sin relevo (salir a otra página): el reproductor se destruye', async () => {
    const a = crear();
    a.service.iniciar();
    a.sonido.desbloquear();
    await espera(); await espera();
    TestBed.resetTestingModule();
    expect(a.musica.log).toContain('destruir');
  });

  it('alternar: desbloquea en el gesto, carga, recuerda la preferencia y apaga', async () => {
    localStorage.setItem(MUSICA_KEY, 'off');
    const { service, sonido, musica } = crear();
    service.iniciar();
    service.alTap(tapCueva);
    expect(service.alternar()).toBeTrue();
    expect(sonido.desbloqueos).toBe(1);
    expect(localStorage.getItem(MUSICA_KEY)).toBe('on');
    await espera(); await espera();
    expect(musica.log).toContain(`tap:${tapCueva.scene.world}`);
    expect(service.alternar()).toBeFalse();
    expect(localStorage.getItem(MUSICA_KEY)).toBe('off');
    expect(musica.log).toContain('encender:false');
  });

  it('reenvía silencio, efectos y voz del audio compartido; resultado y anticipar', async () => {
    const { service, sonido, musica } = crear();
    service.iniciar();
    sonido.desbloquear();                                             // encendida por defecto: el gesto la carga
    await espera(); await espera();
    sonido.oyente?.silencio?.(false);
    sonido.oyente?.efecto?.('acierto');
    sonido.oyente?.voz?.(true);
    service.alResultado({ perfecto: true, racha: false });
    service.anticipar(tapCueva);
    service.pausar('pausa-sana');
    service.reanudar('pausa-sana');
    expect(musica.log).toEqual(jasmine.arrayContaining(['silenciar:false', 'efecto', 'voz:true', 'resultado:true:false', `anticipar:${tapCueva.scene.world}`,
      'pausar:pausa-sana', 'reanudar:pausa-sana']));
  });

  it('musicaDe: id, mundo, categoría y motor del Tap', () => {
    expect(musicaDe(tapCueva)).toEqual({ id: tapCueva.id, mundo: 'cueva', tema: tapCueva.topic ?? tapCueva.theme, motor: tapCueva.theme });
  });
});
