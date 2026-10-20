import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TAPS_AUDIO_URL, TAPS_VOZ_URL, TapsSonidoService } from './taps-sonido.service';
import { TapsAudioRelevo } from './taps-audio-relevo';

/** Relevo fuera de TestBed (sobrevive a resetTestingModule, como el de raíz entre dos feeds). */
const nuevoRelevo = () => runInInjectionContext(Injector.create({ providers: [] }), () => new TapsAudioRelevo());

/** Sonido falso con la forma de taps-engine/audio/sonido.js: registra lo que se le pide. */
function sonidoFalso() {
  const log: string[] = [];
  return {
    log,
    contexto: null,
    desbloquear: (ctx?: unknown) => { log.push(ctx ? 'desbloquear+ctx' : 'desbloquear'); return true; },
    silenciar: (m: boolean) => log.push(`silenciar:${m}`),
    atenuar: () => undefined,
    tocar: (n: string, o?: { tema?: string }) => { log.push(`tocar:${n}:${o?.tema ?? ''}`); return true; },
    precalentar: (t: string) => log.push(`precalentar:${t}`),
    pausar: () => log.push('pausar'),
    reanudar: () => log.push('reanudar'),
    paraMotor: () => ({ play: (n: string) => log.push(`motor:${n}`) }),
    destruir: () => log.push('destruir'),
  };
}

function vozFalsa(disponible: boolean) {
  const dichos: string[] = [];
  return { dichos, preparar: () => Promise.resolve(disponible), hablar: (t: string, p?: string) => { dichos.push(`${p}:${t}`); return Promise.resolve(); }, callar: () => dichos.push('callar') };
}

function crear(platform = 'browser', disponible = true) {
  TestBed.configureTestingModule({ providers: [TapsSonidoService, { provide: PLATFORM_ID, useValue: platform }] });
  const service = TestBed.inject(TapsSonidoService);
  const sonido = sonidoFalso(), voz = vozFalsa(disponible), pedidos: string[] = [];
  spyOn(service as unknown as { importar: (url: string) => Promise<unknown> }, 'importar').and.callFake((url: string) => {
    pedidos.push(url);
    if (url === TAPS_AUDIO_URL) return Promise.resolve({ crearSonido: () => sonido });
    if (url === TAPS_VOZ_URL) return Promise.resolve({ crearVoz: () => voz });
    return Promise.reject(new Error('404'));
  });
  return { service, sonido, voz, pedidos };
}

describe('TapsSonidoService', () => {
  it('en el servidor (SSR/prerender) no carga nada ni lanza', async () => {
    const { service, pedidos } = crear('server');
    expect(await service.precargar()).toBeNull();
    expect(await service.prepararVoz()).toBeFalse();
    service.desbloquear();
    service.tocar('acierto');
    expect(pedidos).toEqual([]);
  });

  it('arranca silenciado: tocar no suena hasta que se quita el silencio', async () => {
    const { service, sonido } = crear();
    await service.precargar();
    service.tocar('acierto', { tema: 'minecraft' });
    expect(sonido.log).not.toContain('tocar:acierto:minecraft');
    service.silenciar(false);
    service.tocar('acierto', { tema: 'minecraft' });
    expect(sonido.log).toContain('tocar:acierto:minecraft');
  });

  it('el módulo se pide una sola vez y recibe el estado de silencio actual', async () => {
    const { service, sonido, pedidos } = crear();
    service.silenciar(false);
    await Promise.all([service.precargar(), service.precargar()]);
    expect(pedidos.filter(u => u === TAPS_AUDIO_URL).length).toBe(1);
    expect(sonido.log[0]).toBe('silenciar:false');
  });

  it('el motor recibe un adaptador estable que reenvía al módulo cuando carga', async () => {
    const { service, sonido } = crear();
    service.motorAudio.play('pop', { theme: 'estudio' });                 // antes de cargar: no lanza
    await service.precargar();
    service.motorAudio.play('pop', { theme: 'estudio' });
    expect(sonido.log).toContain('motor:pop');
  });

  it('la voz solo habla encendida y con sonido; apagarla o silenciar la calla', async () => {
    const { service, voz } = crear();
    expect(await service.prepararVoz()).toBeTrue();
    expect(service.vozDisponible()).toBeTrue();
    void service.motorVoz.hablar('¿Hola?', 'leo');
    expect(voz.dichos).toEqual([]);                                       // voz apagada por defecto
    service.activarVoz(true);
    void service.motorVoz.hablar('¿Hola?', 'leo');
    expect(voz.dichos).toEqual([]);                                       // sonido aún silenciado
    service.silenciar(false);
    void service.motorVoz.hablar('¿Hola?', 'leo');
    expect(voz.dichos).toEqual(['leo:¿Hola?']);
    service.silenciar(true);
    expect(voz.dichos).toContain('callar');
  });

  it('sin voz utilizable en el dispositivo lo dice (el botón no se muestra)', async () => {
    const { service } = crear('browser', false);
    expect(await service.prepararVoz()).toBeFalse();
    expect(service.vozDisponible()).toBeFalse();
  });

  it('desbloquea solo con gestos que cuentan como activación (no con pointerdown) y recuerda que hubo gesto', async () => {
    const { service, sonido } = crear();
    await service.precargar();
    let permitido = true;
    service.escucharGestos(() => permitido);
    window.dispatchEvent(new PointerEvent('pointerdown'));
    expect(sonido.log).not.toContain('desbloquear');
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(sonido.log).toContain('desbloquear');
    expect(service.huboGesto()).toBeTrue();
    permitido = false;
    const antes = sonido.log.length;
    window.dispatchEvent(new MouseEvent('click'));
    expect(sonido.log.length).toBe(antes);                                // sonido apagado: no desbloquea
    service.destruir();
  });

  it('el oyente (música) recibe el contexto tras el gesto, el silencio, los efectos de respuesta y la voz', async () => {
    const { service, sonido } = crear();
    const log: string[] = [];
    service.escuchar({
      contexto: () => log.push('contexto'), silencio: m => log.push(`silencio:${m}`), efecto: n => log.push(`efecto:${n}`), voz: on => log.push(`voz:${on}`),
    });
    expect(log).toEqual(['silencio:true']);                               // sin gesto no hay contexto
    await service.precargar();
    (sonido as { contexto: unknown }).contexto = {};
    service.desbloquear();
    expect(log).toContain('contexto');
    service.silenciar(false);
    service.tocar('toque');
    service.tocar('acierto');
    (sonido as unknown as { atenuar: (on: boolean) => void }).atenuar(true);   // lo que hace voz.js al hablar
    expect(log).toEqual(jasmine.arrayContaining(['silencio:false', 'efecto:acierto', 'voz:true']));
    expect(log).not.toContain('efecto:toque');
  });

  it('iOS: declara audioSession «ambient» en el gesto, aunque sonido.js aún no haya cargado (el interruptor de silencio calla Taps)', () => {
    const previo = Object.getOwnPropertyDescriptor(navigator, 'audioSession');
    const sesion = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { value: sesion, configurable: true });
    try {
      const { service } = crear();
      service.desbloquear();                                              // primer gesto, antes de que llegue sonido.js
      expect(sesion.type).toBe('ambient');
      service.destruir();
    } finally {
      if (previo) Object.defineProperty(navigator, 'audioSession', previo); else delete (navigator as unknown as { audioSession?: unknown }).audioSession;
    }
  });

  it('el efecto pedido antes de cargar sonido.js suena al llegar si fue hace menos de 300 ms (y solo el último)', async () => {
    const { service, sonido } = crear();
    service.silenciar(false);
    service.tocar('toque');
    service.tocar('acierto', { tema: 'minecraft' });
    await service.precargar();
    expect(sonido.log.filter(l => l.startsWith('tocar:'))).toEqual(['tocar:acierto:minecraft']);
  });

  it('un efecto pedido antes de cargar que ya quedó viejo (≥ 300 ms) no suena tarde', async () => {
    const { service, sonido } = crear();
    let t = 1000;
    spyOn(performance, 'now').and.callFake(() => t);
    service.silenciar(false);
    service.tocar('acierto');
    t = 1400;
    await service.precargar();
    expect(sonido.log.some(l => l.startsWith('tocar:'))).toBeFalse();
  });

  it('Tab y las modificadoras desbloquean los efectos pero no arrancan la música; un toque o una tecla sí', async () => {
    const { service, sonido } = crear();
    const log: string[] = [];
    service.escuchar({ contexto: () => log.push('contexto') });
    await service.precargar();
    (sonido as { contexto: unknown }).contexto = {};
    service.escucharGestos(() => true);
    for (const key of ['Tab', 'Shift', 'Control']) window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    expect(sonido.log).toContain('desbloquear');
    expect(log).toEqual([]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(log).toEqual(['contexto']);
    service.destruir();
  });

  it('contextoPrevio: se crea suspendido sin gesto (nadie lo recibe) y el gesto reanuda ese mismo, sin crear otro', async () => {
    const creados: string[] = [];
    class ACFalso {
      // Nace 'suspended' y pasa solo a 'running' una microtarea después (Chrome con autoplay permitido): por eso se suspende siempre.
      state = 'suspended';
      private suspendido = false;
      constructor() { creados.push('nuevo'); queueMicrotask(() => { if (!this.suspendido) this.state = 'running'; }); }
      suspend() { this.suspendido = true; this.state = 'suspended'; creados.push('suspend'); return Promise.resolve(); }
      resume() { this.state = 'running'; creados.push('resume'); return Promise.resolve(); }
      close() { creados.push('close'); return Promise.resolve(); }
    }
    const w = window as unknown as { AudioContext: unknown };
    const original = w.AudioContext;
    w.AudioContext = ACFalso;
    try {
      const { service } = crear();
      const log: string[] = [];
      service.escuchar({ contexto: () => log.push('contexto') });
      const previo = service.contextoPrevio();
      expect(previo).not.toBeNull();
      expect(creados).toEqual(['nuevo', 'suspend'], 'se suspende siempre, mire lo que mire su estado');
      await Promise.resolve();
      expect((previo as unknown as { state: string }).state).toBe('suspended', 'no arranca solo tras la microtarea');
      expect(service.contexto()).toBeNull('antes del gesto no hay contexto «desbloqueado»');
      expect(log).toEqual([]);
      service.desbloquear();                                              // el gesto
      expect(service.contexto()).toBe(previo as unknown as AudioContext);
      expect(creados).toEqual(['nuevo', 'suspend', 'resume']);
      expect(log).toEqual(['contexto']);
      expect(service.contextoPrevio()).toBeNull('tras el gesto vale contexto()');
      service.destruir();
    } finally {
      w.AudioContext = original;
    }
  });

  it('contextoPrevio creado en el mismo gesto (intención con el pointerdown del toque): el gesto lo reanuda aunque aún diga «running»', async () => {
    const ordenes: string[] = [];
    class ACFalso {
      // Creado dentro del gesto: nace 'running' y el suspend() se aplica más tarde (como en Chrome). Las órdenes van en fila.
      state = 'running';
      private fila: Promise<void> = Promise.resolve();
      suspend() { ordenes.push('suspend'); return (this.fila = this.fila.then(() => { this.state = 'suspended'; })); }
      resume() { ordenes.push('resume'); return (this.fila = this.fila.then(() => { this.state = 'running'; })); }
      close() { return Promise.resolve(); }
    }
    const w = window as unknown as { AudioContext: unknown };
    const original = w.AudioContext;
    w.AudioContext = ACFalso;
    try {
      const { service } = crear();
      const previo = service.contextoPrevio() as unknown as { state: string };   // pointerdown: señal de intención
      expect(previo.state).toBe('running', 'el suspend() aún no se aplicó');
      service.desbloquear();                                              // pointerup del mismo toque
      await new Promise(r => setTimeout(r, 0));
      expect(ordenes).toEqual(['suspend', 'resume']);
      expect(previo.state).toBe('running', 'antes quedaba suspendido: la primera respuesta sin efecto ni música');
      service.destruir();
    } finally {
      w.AudioContext = original;
    }
  });

  it('relevo portada → /taps: el feed nuevo sigue con el mismo sonido (no lo destruye ni crea otro contexto)', async () => {
    const relevo = nuevoRelevo();
    TestBed.configureTestingModule({ providers: [{ provide: TapsAudioRelevo, useValue: relevo }] });
    const a = crear();
    await a.service.precargar();
    (a.sonido as { contexto: unknown }).contexto = { state: 'running' };
    a.service.desbloquear();
    a.service.relevarAlSalir();
    a.service.destruir();
    expect(a.sonido.log).not.toContain('destruir');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: TapsAudioRelevo, useValue: relevo }] });
    const b = crear();
    const log: string[] = [];
    b.service.escuchar({ contexto: () => log.push('contexto') });
    expect(log).toEqual(['contexto'], 'la música del feed nuevo recibe el contexto en marcha sin otro gesto');
    expect(await b.service.precargar()).toBe(a.sonido as never);
    expect(b.pedidos).toEqual([]);
    b.service.destruir();
    expect(a.sonido.log).toContain('destruir');
  });

  it('pausar calla la voz y suspende el audio; destruir libera todo', async () => {
    const { service, sonido, voz } = crear();
    await service.prepararVoz();
    service.pausar();
    expect(sonido.log).toContain('pausar');
    expect(voz.dichos).toContain('callar');
    service.destruir();
    expect(sonido.log).toContain('destruir');
    expect(await service.precargar()).toBeNull();
  });
});
