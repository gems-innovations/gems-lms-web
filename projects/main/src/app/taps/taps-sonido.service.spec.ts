import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TAPS_AUDIO_URL, TAPS_VOZ_URL, TapsSonidoService } from './taps-sonido.service';

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
