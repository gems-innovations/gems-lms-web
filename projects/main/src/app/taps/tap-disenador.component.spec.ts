import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AnalyticsService } from '../analytics.service';
import { DISENADOR_LOADER, IDisenadorModule, TapDisenadorComponent } from './tap-disenador.component';
import { CLAVE_AVISO_PUBLICAR, CLAVE_ESTUDIANTE, CLAVE_SONIDO_TAPS } from './taps.crear';

type TOpciones = Parameters<IDisenadorModule['montarDisenador']>[1];

@Component({ template: '' })
class VaciaComponent {}

describe('TapDisenadorComponent (/crear)', () => {
  let fixture: ComponentFixture<TapDisenadorComponent>;
  let eventos: string[];
  let opciones: TOpciones;
  let destruido: number;
  let apagados: number;
  let ok: boolean;
  const ID = 'mh5k2x1a-0a1b2c3';
  const ENLACE = 'http://localhost/crear#look=eyJ2IjoxfQ';
  const MINI = 'data:image/png;base64,iVBORw0KGgo=';

  /** Doble de public/taps-engine/disenador.js: pinta la ranura y el progreso, y avisa que abrió «directo». */
  const modulo: IDisenadorModule = {
    async montarDisenador(raiz, o) {
      opciones = o;
      raiz.innerHTML = '<ol id="progreso"><li>Personaje</li><li>Escenario</li><li>Listo</li></ol><section class="vista"><div id="ranuraVista"></div></section>';
      if (o.pasoPublicar) {
        const li = document.createElement('li'); const b = document.createElement('button'); b.id = 'publicar'; b.textContent = o.pasoPublicar.texto;
        b.onclick = () => o.pasoPublicar?.alTocar?.({ borradorId: ID, enlace: ENLACE, nombre: 'Tomás', miniatura: MINI, hito: null, accion: 'publicar' }); li.append(b); raiz.querySelector('#progreso')!.append(li);
      }
      o.alEvento?.('abrir/directo');
      return { ok, destruir: () => { destruido++; }, apagarHitos: () => { apagados++; } };
    },
  };

  beforeEach(async () => {
    eventos = []; destruido = 0; apagados = 0; ok = true;
    localStorage.removeItem(CLAVE_AVISO_PUBLICAR); localStorage.removeItem(CLAVE_ESTUDIANTE);
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [
        provideRouter([{ path: 'instituciones', component: VaciaComponent }]),
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

  afterEach(() => { localStorage.removeItem(CLAVE_AVISO_PUBLICAR); localStorage.removeItem(CLAVE_ESTUDIANTE); });

  const el = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
  const visible = (sel: string): boolean => { const e = el(sel); return !!e && !e.hidden; };

  it('lleva el marco de marca: el logo existente de GEMS LMS y «Volver» a la portada cuando no hay ?desde=', () => {
    const marca = el('header.marca')!;
    expect(marca).not.toBeNull();
    expect(marca.querySelector('a.marca__logo img')?.getAttribute('src')).toBe('/logo-144.png');
    expect(marca.querySelector('a.marca__logo')?.getAttribute('aria-label')).toBe('GEMS LMS, inicio');
    const volver = marca.querySelector<HTMLAnchorElement>('a#volver')!;
    expect(volver.getAttribute('href')).toBe('/');
    expect(volver.getAttribute('aria-label')).toBe('Volver al inicio');
    expect(volver.querySelector('.marca__largo')?.textContent?.trim()).toBe('Volver al inicio');
    expect(marca.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('con ?desde=feed, «Volver» lleva a /taps y mantiene el texto correspondiente', async () => {
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { desde: 'feed' } });
    fixture.detectChanges();
    const volver = el('a#volver')!;
    expect(volver.getAttribute('href')).toBe('/taps');
    expect(volver.getAttribute('aria-label')).toBe('Volver a Taps');
  });

  it('monta el diseñador con «Publicar (con cuenta)» como último punto y cuenta la apertura', () => {
    expect(el('.dsn #publicar')?.textContent).toBe('Publicar (con cuenta)');
    expect(el('#progreso')?.lastElementChild?.contains(el('#publicar'))).toBeTrue();
    expect(eventos).toContain('taps/crear/abrir/directo');
    expect(el('.crear__carga')).toBeNull();
  });

  it('la cinta de transparencia va sobre la vista previa, una vez por navegador, y «Entendido» la recuerda', () => {
    expect(el('#ranuraVista .cinta')).not.toBeNull();
    expect(visible('#ranuraVista .cinta[role="region"]')).toBeTrue();
    expect(el('#ranuraVista .cinta p')?.textContent).toContain('Publicar requiere cuenta de docente o institución');
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

  it('el altavoz del creador lee y escribe el silencio general del feed (una sola llave para todo Taps)', () => {
    localStorage.removeItem(CLAVE_SONIDO_TAPS);
    expect(opciones.sonido!.activo()).toBeTrue();
    opciones.sonido!.cambiar(false);
    expect(localStorage.getItem(CLAVE_SONIDO_TAPS)).toBe('off');
    expect(opciones.sonido!.activo()).toBeFalse();
    opciones.sonido!.cambiar(true);
    expect(localStorage.getItem(CLAVE_SONIDO_TAPS)).toBe('on');
    expect(opciones.sonido!.activo()).toBeTrue();
    localStorage.removeItem(CLAVE_SONIDO_TAPS);
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

  // ───────────── gancho de «Publicar» (PR-8, §A.3.2) ─────────────

  /** Abre la hoja y espera al foco (queueMicrotask). */
  async function abrirHoja(): Promise<void> {
    el('#publicar')!.click();
    fixture.detectChanges();
    await new Promise(r => setTimeout(r, 0));
  }

  it('«Publicar» abre la hoja accesible con el personaje detrás, las tres salidas y mide el intento sin cuenta', async () => {
    expect(visible('.gancho')).toBeFalse();
    await abrirHoja();
    const hoja = el('.gancho')!;
    expect(hoja.hidden).toBeFalse();
    expect(hoja.getAttribute('role')).toBe('dialog');
    expect(hoja.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(hoja.getAttribute('aria-labelledby')!)?.textContent).toContain('regístrate como docente o institución');
    expect(hoja.querySelectorAll('.gancho__ganas li').length).toBe(3);
    expect(hoja.querySelectorAll('.gancho__ganas svg').length).toBe(3);
    expect(el('#ganchoDocente')?.textContent).toContain('Soy docente o institución');
    expect(el('#ganchoEstudiante')?.textContent).toContain('Soy estudiante');
    expect(el('#ganchoVolver')?.textContent).toContain('Volver y seguir creando');
    expect(hoja.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(eventos.filter(e => e === 'taps/crear/intento-publicar/sin-cuenta').length).toBe(1);
    // El diseñador queda inerte detrás y el foco entra a la hoja.
    expect(el('.dsn')!.inert).toBeTrue();
    expect(hoja.contains(document.activeElement)).toBeTrue();
  });

  it('«Volver y seguir creando» (y Escape) cierra, devuelve el foco al diseñador y mide gancho/volver', async () => {
    await abrirHoja();
    el('#ganchoVolver')!.click(); fixture.detectChanges();
    expect(visible('.gancho')).toBeFalse();
    expect(el('.dsn')!.inert).toBeFalse();
    expect(el('.dsn')!.contains(document.activeElement)).toBeTrue();
    expect(eventos.filter(e => e === 'taps/crear/gancho/volver').length).toBe(1);
    await abrirHoja();
    el('.gancho')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fixture.detectChanges();
    expect(visible('.gancho')).toBeFalse();
    expect(eventos.filter(e => e === 'taps/crear/gancho/volver').length).toBe(2);
  });

  it('tocar el fondo cierra solo si el gesto empezó y terminó en el fondo (soltar fuera tras arrastrar no cierra ni cuenta)', async () => {
    await abrirHoja();
    const fondo = el('.gancho')!, hoja = el('.gancho__hoja')!;
    // Empieza dentro de la hoja (p. ej. seleccionando el enlace) y suelta en el fondo: nada.
    hoja.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fondo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(visible('.gancho')).toBeTrue();
    expect(eventos.filter(e => e === 'taps/crear/gancho/volver').length).toBe(0);
    // Empieza y termina en el fondo: vuelve.
    fondo.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fondo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(visible('.gancho')).toBeFalse();
    expect(eventos.filter(e => e === 'taps/crear/gancho/volver').length).toBe(1);
  });

  it('Tab gira dentro de la hoja: del último botón vuelve al primero y Shift+Tab al revés', async () => {
    await abrirHoja();
    const hoja = el('.gancho')!;
    el('#ganchoVolver')!.focus();
    hoja.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(el('#ganchoDocente'));
    hoja.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(el('#ganchoVolver'));
  });

  it('«Soy docente o institución» mide gancho/docente y lleva al formulario con el borrador y desde=crear', async () => {
    await abrirHoja();
    const router = TestBed.inject(Router);
    el('#ganchoDocente')!.click();
    await fixture.whenStable();
    expect(eventos).toContain('taps/crear/gancho/docente');
    expect(router.url).toBe(`/instituciones?desde=crear&borrador=${ID}#solicitud`);
  });

  it('«Soy estudiante» no pide nada: copy «pídele a tu docente» y «Copiar enlace» con el enlace del look', async () => {
    await abrirHoja();
    el('#ganchoEstudiante')!.click(); fixture.detectChanges();
    await new Promise(r => setTimeout(r, 0));
    expect(eventos).toContain('taps/crear/gancho/estudiante');
    expect(el('#ganchoEstudianteTexto')?.textContent).toContain('Pídele a tu docente');
    expect(el('.gancho')!.querySelector('input[type="email"], input[type="tel"]')).toBeNull();
    expect(document.activeElement).toBe(el('#ganchoCopiar'));
    // Sin hoja del sistema y con portapapeles: copia y lo dice.
    const nav = navigator as unknown as { share?: unknown; clipboard: Clipboard };
    const shareAntes = nav.share; const clipboardAntes = nav.clipboard;
    let copiado = '';
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t: string) => { copiado = t; return Promise.resolve(); } }, configurable: true });
    try {
      el('#ganchoCopiar')!.click();
      await new Promise(r => setTimeout(r, 0)); fixture.detectChanges();
      expect(copiado).toBe(ENLACE);
      expect(el('.gancho__estado')?.textContent).toContain('Enlace copiado');
      expect(eventos.filter(e => e === 'taps/crear/gancho/copiar').length).toBe(1);
      // Si copiar falla, el enlace se muestra para seleccionarlo.
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('no')) }, configurable: true });
      el('#ganchoCopiar')!.click();
      await new Promise(r => setTimeout(r, 0)); fixture.detectChanges();
      expect(visible('.gancho__enlace')).toBeTrue();
      expect((el('.gancho__enlace input') as HTMLInputElement).value).toBe(ENLACE);
      expect(eventos.filter(e => e === 'taps/crear/gancho/copiar').length).withContext('el fallo no cuenta como copiado').toBe(1);
      // Cerrar la hoja del sistema tampoco cuenta.
      Object.defineProperty(navigator, 'share', { value: () => Promise.reject(Object.assign(new Error('cerrada'), { name: 'AbortError' })), configurable: true });
      el('#ganchoCopiar')!.click();
      await new Promise(r => setTimeout(r, 0)); fixture.detectChanges();
      expect(eventos.filter(e => e === 'taps/crear/gancho/copiar').length).toBe(1);
    } finally {
      Object.defineProperty(navigator, 'share', { value: shareAntes, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: clipboardAntes, configurable: true });
    }
    // El enlace nunca se mide: ningún evento lo lleva.
    expect(eventos.some(e => e.includes('look='))).toBeFalse();
  });

  // ───────────── hitos de cuenta (PR-D2, disenador-v2-plan.md §2) ─────────────

  it('la hoja enseña la miniatura y «Para publicar a X…» con el nombre que trae el contexto', async () => {
    await abrirHoja();
    expect(el('#ganchoTitulo')?.textContent).toBe('Para publicar a Tomás, regístrate como docente o institución');
    expect((el('.gancho__mini') as HTMLImageElement | null)?.getAttribute('src')).toBe(MINI);
  });

  it('«Qué es la cuenta» desde un hito abre la MISMA hoja sin contar intento-publicar; «Publicar (con cuenta)» desde un hito sí lo cuenta', async () => {
    opciones.cuenta!.abrir({ borradorId: ID, enlace: ENLACE, nombre: 'Nefer', miniatura: '', hito: 'guardado', accion: 'cuenta' });
    fixture.detectChanges(); await new Promise(r => setTimeout(r, 0));
    expect(visible('.gancho')).toBeTrue();
    expect(el('#ganchoTitulo')?.textContent).toContain('Para publicar a Nefer');
    expect(el('.gancho__mini')).withContext('sin miniatura no hay imagen vacía').toBeNull();
    expect(el('#ganchoDocente')).not.toBeNull();
    expect(eventos.filter(e => e === 'taps/crear/intento-publicar/sin-cuenta').length).toBe(0);
    el('#ganchoVolver')!.click(); fixture.detectChanges();
    opciones.cuenta!.abrir({ borradorId: ID, enlace: ENLACE, nombre: 'Nefer', hito: 'probado', accion: 'publicar' });
    fixture.detectChanges();
    expect(visible('.gancho')).toBeTrue();
    expect(eventos.filter(e => e === 'taps/crear/intento-publicar/sin-cuenta').length).toBe(1);
  });

  it('los eventos hito-cuenta/<abrir|entendido>/<hito> del diseñador derivan taps/crear/cuenta/<hito>/<accion> una vez por visita', () => {
    opciones.alEvento!('hito-cuenta/visto/listo');
    opciones.alEvento!('hito-cuenta/abrir/listo'); opciones.alEvento!('hito-cuenta/abrir/listo');
    opciones.alEvento!('hito-cuenta/entendido/navegador');
    expect(eventos.filter(e => e.startsWith('taps/crear/cuenta/'))).toEqual(['taps/crear/cuenta/listo/abrir', 'taps/crear/cuenta/navegador/entendido']);
  });

  it('«Soy estudiante» apaga los avisos de cuenta para siempre en este navegador y quita los que estén a la vista', async () => {
    await abrirHoja();
    el('#ganchoEstudiante')!.click(); fixture.detectChanges();
    expect(localStorage.getItem(CLAVE_ESTUDIANTE)).toBe('1');
    expect(apagados).toBe(1);
  });

  it('al salir de la ruta desmonta el diseñador', () => {
    fixture.destroy();
    expect(destruido).toBe(1);
  });

  it('tras «Entendido» y tras volver de la hoja de «Publicar» el foco vuelve al diseñador, no al body', async () => {
    const raiz = el('.dsn')!; const titulo = document.createElement('h2'); titulo.id = 'titulo'; raiz.prepend(titulo);
    el('#ranuraVista .cinta button.primario')!.click(); fixture.detectChanges();
    expect(document.activeElement).toBe(titulo);
    // Quien abre la hoja es el botón «Publicar»: al volver, el foco regresa a él.
    el('#publicar')!.focus();
    await abrirHoja();
    el('#ganchoVolver')!.click(); fixture.detectChanges();
    expect(document.activeElement).toBe(el('#publicar'));
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
