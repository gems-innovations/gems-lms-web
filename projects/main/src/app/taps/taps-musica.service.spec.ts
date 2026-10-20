import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ITapsAudioOyente, TapsSonidoService } from './taps-sonido.service';
import { MUSICA_KEY, TAPS_MUSICA_URL, TapsMusicaService, musicaDe } from './taps-musica.service';
import { TAPS } from './taps.data';

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
    alTap: (i: { mundo: string }) => { log.push(`tap:${i.mundo}`); return Promise.resolve('x'); },
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
  desbloqueos = 0;
  escuchar(o: ITapsAudioOyente | null) { this.oyente = o; o?.silencio?.(true); if (this.ctx) o?.contexto?.(this.ctx); }
  contexto() { return this.ctx; }
  desbloquear() { this.desbloqueos++; this.ctx ??= {} as AudioContext; this.oyente?.contexto?.(this.ctx); }
}

function crear(platform = 'browser') {
  const sonido = new SonidoFalso();
  TestBed.configureTestingModule({ providers: [TapsMusicaService, { provide: TapsSonidoService, useValue: sonido }, { provide: PLATFORM_ID, useValue: platform }] });
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
    service.iniciar(false);
    service.alTap(tapCueva);
    await espera();
    expect(service.encendida()).toBeFalse();
    expect(pedidos).toEqual([]);
  });

  it('apagada por defecto: no carga el reproductor aunque haya gestos', async () => {
    const { service, sonido, pedidos } = crear();
    service.iniciar(false);
    expect(service.encendida()).toBeFalse();
    sonido.desbloquear();
    service.alTap(tapCueva);
    await espera();
    expect(pedidos).toEqual([]);
  });

  it('encendida y guardada: espera al primer gesto (AudioContext) para cargar y suena la pista del Tap', async () => {
    localStorage.setItem(MUSICA_KEY, 'on');
    const { service, sonido, musica, pedidos } = crear();
    service.iniciar(false);
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
  });

  it('en la portada arranca apagada aunque en /taps se dejara encendida', () => {
    localStorage.setItem(MUSICA_KEY, 'on');
    const { service } = crear();
    service.iniciar(true);
    expect(service.encendida()).toBeFalse();
  });

  it('alternar: desbloquea en el gesto, carga, recuerda la preferencia y apaga', async () => {
    const { service, sonido, musica } = crear();
    service.iniciar(false);
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
    service.iniciar(false);
    service.alternar();
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

  it('musicaDe: mundo, categoría y motor del Tap', () => {
    expect(musicaDe(tapCueva)).toEqual({ mundo: 'cueva', tema: tapCueva.topic ?? tapCueva.theme, motor: tapCueva.theme });
  });
});
