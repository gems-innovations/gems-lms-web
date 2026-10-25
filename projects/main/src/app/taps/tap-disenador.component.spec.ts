import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../analytics.service';
import { DISENADOR_LOADER, IDisenadorModule, TapDisenadorComponent } from './tap-disenador.component';
import { CLAVE_AVISO_PUBLICAR } from './taps.crear';

type TOpciones = Parameters<IDisenadorModule['montarDisenador']>[1];

describe('TapDisenadorComponent (/crear)', () => {
  let fixture: ComponentFixture<TapDisenadorComponent>;
  let eventos: string[];
  let opciones: TOpciones;
  let destruido: number;
  let ok: boolean;

  /** Doble de public/taps-engine/disenador.js: pinta la ranura y el progreso, y avisa que abrió «directo». */
  const modulo: IDisenadorModule = {
    async montarDisenador(raiz, o) {
      opciones = o;
      raiz.innerHTML = '<ol id="progreso"><li>Personaje</li><li>Escenario</li><li>Listo</li></ol><section class="vista"><div id="ranuraVista"></div></section>';
      if (o.pasoPublicar) {
        const li = document.createElement('li'); const b = document.createElement('button'); b.id = 'publicar'; b.textContent = o.pasoPublicar.texto;
        b.onclick = () => o.pasoPublicar?.alTocar?.(); li.append(b); raiz.querySelector('#progreso')!.append(li);
      }
      o.alEvento?.('abrir/directo');
      return { ok, destruir: () => { destruido++; } };
    },
  };

  beforeEach(async () => {
    eventos = []; destruido = 0; ok = true;
    localStorage.removeItem(CLAVE_AVISO_PUBLICAR);
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [
        provideRouter([]),
        { provide: DISENADOR_LOADER, useValue: () => Promise.resolve(modulo) },
        { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TapDisenadorComponent);
    await montado(fixture);
  });

  /** El montaje es asíncrono (afterNextRender → import → montarDisenador): espera a que el componente se marque listo (o falle). */
  async function montado(f: ComponentFixture<TapDisenadorComponent>): Promise<void> {
    f.detectChanges();
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 0));
      f.detectChanges();
      if ((f.nativeElement as HTMLElement).querySelector('.crear--listo, [role="alert"]')) return;
    }
  }

  afterEach(() => localStorage.removeItem(CLAVE_AVISO_PUBLICAR));

  const el = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
  const visible = (sel: string): boolean => { const e = el(sel); return !!e && !e.hidden; };

  it('monta el diseñador con «Publicar (con cuenta)» como último punto y cuenta la apertura', () => {
    expect(el('.dsn #publicar')?.textContent).toBe('Publicar (con cuenta)');
    expect(el('#progreso')?.lastElementChild?.contains(el('#publicar'))).toBeTrue();
    expect(eventos).toContain('taps/crear/abrir/directo');
    expect(el('.crear__carga')).toBeNull();
  });

  it('la cinta de transparencia va sobre la vista previa, una vez por navegador, y «Entendido» la recuerda', () => {
    expect(el('#ranuraVista .cinta')).not.toBeNull();
    expect(visible('#ranuraVista .cinta[role="region"]')).toBeTrue();
    expect(el('#ranuraVista .cinta p')?.textContent).toContain('Para publicar y compartir con tu grupo necesitas una cuenta');
    expect(eventos).toContain('taps/crear/aviso-publicar/visto');
    el('#ranuraVista .cinta button.primario')!.click();
    fixture.detectChanges();
    expect(visible('#ranuraVista .cinta[role="region"]')).toBeFalse();
    expect(localStorage.getItem(CLAVE_AVISO_PUBLICAR)).toBe('1');
    expect(eventos).toContain('taps/crear/aviso-publicar/entendido');
  });

  it('con la cinta ya vista no vuelve a salir ni a contarse', async () => {
    localStorage.setItem(CLAVE_AVISO_PUBLICAR, '1');
    eventos = [];
    const otra = TestBed.createComponent(TapDisenadorComponent);
    await montado(otra);
    const cinta = otra.nativeElement.querySelector('#ranuraVista .cinta[role="region"]') as HTMLElement;
    expect(cinta.hidden).toBeTrue();
    expect(eventos.filter(e => e.startsWith('taps/crear/aviso-publicar/'))).toEqual([]);
  });

  it('los eventos del diseñador salen por AnalyticsService y derivan los hitos del embudo una sola vez', () => {
    opciones.enviar!('taps/disenador/preset/grabador'); opciones.alEvento!('preset/grabador');
    opciones.alEvento!('cambio/ropa');
    opciones.alEvento!('paso/listo');
    opciones.enviar!('taps/disenador/listo'); opciones.alEvento!('listo');
    expect(eventos.filter(e => e.startsWith('taps/disenador/'))).toEqual(['taps/disenador/preset/grabador', 'taps/disenador/listo']);
    expect(eventos.filter(e => e === 'taps/crear/creo').length).toBe(1);
    expect(eventos.filter(e => e === 'taps/crear/personaje-listo').length).toBe(1);
  });

  it('«Publicar» aún no publica: dice que llega pronto y mide el intento', () => {
    el('#publicar')!.click();
    fixture.detectChanges();
    expect(visible('#ranuraVista .cinta--pronto')).toBeTrue();
    expect(el('.cinta--pronto p')?.textContent).toContain('todavía no está listo');
    expect(eventos).toContain('taps/crear/intento-publicar/sin-cuenta');
    el('.cinta--pronto .cerrar')!.click();
    fixture.detectChanges();
    expect(visible('#ranuraVista .cinta--pronto')).toBeFalse();
  });

  it('al salir de la ruta desmonta el diseñador', () => {
    fixture.destroy();
    expect(destruido).toBe(1);
  });

  it('tras «Entendido» y tras cerrar el aviso de «Publicar» el foco vuelve al diseñador, no al body', () => {
    const raiz = el('.dsn')!; const titulo = document.createElement('h2'); titulo.id = 'titulo'; raiz.prepend(titulo);
    el('#ranuraVista .cinta button.primario')!.click(); fixture.detectChanges();
    expect(document.activeElement).toBe(titulo);
    (document.activeElement as HTMLElement).blur();
    el('#publicar')!.click(); fixture.detectChanges();
    el('.cinta--pronto .cerrar')!.click(); fixture.detectChanges();
    expect(document.activeElement).toBe(titulo);
  });

  it('si se destruye mientras el diseñador se está montando, lo destruye en cuanto termina y no toca el componente', async () => {
    TestBed.resetTestingModule();
    eventos = [];
    let resolver!: () => void; let destruidoTarde = 0;
    const lento: IDisenadorModule = {
      montarDisenador: (raiz, o) => new Promise(res => { resolver = () => { raiz.innerHTML = '<div id="ranuraVista"></div>'; res({ ok: true, destruir: () => { destruidoTarde++; } }); }; }),
    };
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [provideRouter([]), { provide: DISENADOR_LOADER, useValue: () => Promise.resolve(lento) }, { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } }],
    }).compileComponents();
    const f = TestBed.createComponent(TapDisenadorComponent);
    f.detectChanges();
    for (let i = 0; i < 10 && !resolver; i++) await new Promise(r => setTimeout(r, 0));
    expect(resolver).toBeDefined();
    f.destroy();
    resolver();
    await new Promise(r => setTimeout(r, 0));
    expect(destruidoTarde).toBe(1);
    expect(eventos.filter(e => e.startsWith('taps/crear/aviso-publicar/'))).toEqual([]);
  });

  it('si montarDisenador falla, lo dice en vez de dejar «Cargando…» para siempre', async () => {
    TestBed.resetTestingModule();
    eventos = [];
    const roto: IDisenadorModule = { montarDisenador: () => Promise.reject(new Error('tema')) };
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [provideRouter([]), { provide: DISENADOR_LOADER, useValue: () => Promise.resolve(roto) }, { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } }],
    }).compileComponents();
    const f = TestBed.createComponent(TapDisenadorComponent);
    await montado(f);
    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
    expect(eventos).toContain('taps/crear/error/carga');
  });

  it('si el módulo no carga, lo dice sin romper', async () => {
    TestBed.resetTestingModule();
    eventos = [];
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [
        provideRouter([]),
        { provide: DISENADOR_LOADER, useValue: () => Promise.reject(new Error('sin red')) },
        { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(TapDisenadorComponent);
    await montado(f);
    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
    expect(eventos).toContain('taps/crear/error/carga');
  });
});
