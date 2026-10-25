import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from '../analytics.service';
import { MARCA_ADJUNTO_INICIO } from '../taps/taps.crear';
import { VALIDADOR_LOOK_LOADER } from '../taps/taps.look-validador';
import { InstitutionsComponent } from './institutions.component';
import { IInstitutionRequest, PublicCatalogService } from './public-catalog.service';

/**
 * Formulario de /instituciones con `?borrador=<id>` (PR-8 del plan del diseñador, §A.3.3): muestra «Tu personaje irá adjunto» con la
 * miniatura de localStorage y manda el borrador compacto dentro de `message`; sin borrador válido funciona como siempre.
 */
describe('InstitutionsComponent (borrador adjunto)', () => {
  const CLAVE = 'taps.disenador.borrador';
  const ID = 'mh5k2x1a-0a1b2c3';
  let enviados: IInstitutionRequest[];
  let eventos: string[];
  const validar = (look: Record<string, unknown>): string[] => Object.keys(look).filter(k => !['hat', 'coat'].includes(k)).map(k => `campo desconocido «${k}»`);

  function guardarBorrador(id = ID, look: Record<string, unknown> = { hat: 'copa', coat: '#223344' }): void {
    localStorage.setItem(CLAVE, JSON.stringify({ v: 1, borradorId: id, paso: 3, fecha: 1, base: 'grabador', look, item: 'pluma', world: 'taller-londres', miniatura: 'data:image/png;base64,AAAA' }));
  }

  async function crear(query: Record<string, string>): Promise<ComponentFixture<InstitutionsComponent>> {
    enviados = []; eventos = [];
    await TestBed.configureTestingModule({
      imports: [InstitutionsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        { provide: PublicCatalogService, useValue: { requestInstitution: (b: IInstitutionRequest) => { enviados.push(b); return of({ id: 1 }); } } },
        { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } },
        { provide: VALIDADOR_LOOK_LOADER, useValue: () => Promise.resolve(validar) },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(InstitutionsComponent);
    f.detectChanges();
    for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 0)); f.detectChanges(); }
    return f;
  }

  function rellenarYEnviar(f: ComponentFixture<InstitutionsComponent>, mensaje = ''): void {
    const host = f.nativeElement as HTMLElement;
    const poner = (name: string, v: string) => { const el = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!; el.value = v; el.dispatchEvent(new Event('input')); };
    poner('inst', 'Colegio de Prueba'); poner('contact', 'Persona de Prueba'); poner('email', 'contacto@prueba.test'); poner('msg', mensaje);
    f.detectChanges();
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();
  }

  afterEach(() => { localStorage.removeItem(CLAVE); sessionStorage.removeItem('taps-crear-registro-inicio'); });

  it('con ?borrador= válido y desde=crear: miniatura, «Tu personaje irá adjunto», bloque en message y registro/inicio|enviado', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('.adjunto')?.textContent).toContain('Tu personaje irá adjunto');
    expect(host.querySelector<HTMLImageElement>('.adjunto__mini')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(eventos).toContain('taps/crear/registro/inicio');
    rellenarYEnviar(f, 'Quiero Taps');
    expect(enviados.length).toBe(1);
    const msg = enviados[0].message!;
    expect(msg.startsWith('Quiero Taps\n\n' + MARCA_ADJUNTO_INICIO)).toBeTrue();
    expect(msg).toContain(`"borradorId":"${ID}"`);
    expect(msg).not.toContain('miniatura');
    expect(msg).not.toContain('data:image');
    expect(msg.length).toBeLessThanOrEqual(2000);
    expect(enviados[0].email).toBe('contacto@prueba.test');
    expect(eventos).toContain('taps/crear/registro/enviado');
  });

  it('si el texto de la persona no deja sitio al bloque, va el texto entero sin recortar, sin bloque, y se avisa en pantalla', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('.adjunto__contador')?.textContent).toContain('Te quedan');
    const largo = 'm'.repeat(1990);
    const msg = host.querySelector<HTMLTextAreaElement>('[name="msg"]')!; msg.value = largo; msg.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(host.querySelector('.adjunto__aviso')?.textContent).toContain('no cabe junto a él');
    expect(host.querySelector('.adjunto__contador')).toBeNull();
    expect(host.querySelector('.adjunto')).withContext('el aviso de adjunto sigue; solo se explica que no viaja').not.toBeNull();
    rellenarYEnviar(f, largo);
    expect(enviados[0].message).toBe(largo);
    expect(enviados[0].message).not.toContain(MARCA_ADJUNTO_INICIO);
  });

  it('registro/inicio se cuenta una vez por pestaña, no en cada recarga', async () => {
    guardarBorrador();
    await crear({ borrador: ID, desde: 'crear' });
    expect(eventos.filter(e => e === 'taps/crear/registro/inicio').length).toBe(1);
    TestBed.resetTestingModule();
    await crear({ borrador: ID, desde: 'crear' });
    expect(eventos.filter(e => e === 'taps/crear/registro/inicio').length).toBe(0);
    expect(sessionStorage.getItem('taps-crear-registro-inicio')).toBe('1');
  });

  it('«No adjuntarlo» quita el bloque y el mensaje va limpio', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.adjunto__quitar')!.click();
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.adjunto')).toBeNull();
    rellenarYEnviar(f, 'Sin personaje');
    expect(enviados[0].message).toBe('Sin personaje');
  });

  it('sin borrador, con otro id, con id raro o con look inválido: el formulario funciona normal y no adjunta nada', async () => {
    for (const [query, prepara] of [
      [{}, () => guardarBorrador()],
      [{ borrador: 'otro1234-0000000' }, () => guardarBorrador()],
      [{ borrador: '<script>' }, () => guardarBorrador()],
      [{ borrador: ID }, () => localStorage.removeItem(CLAVE)],
      [{ borrador: ID }, () => guardarBorrador(ID, { hat: 'copa', raro: 'x' })],
    ] as [Record<string, string>, () => void][]) {
      TestBed.resetTestingModule();
      prepara();
      const f = await crear(query);
      expect((f.nativeElement as HTMLElement).querySelector('.adjunto')).withContext(JSON.stringify(query)).toBeNull();
      rellenarYEnviar(f, 'Hola');
      expect(enviados[0].message).toBe('Hola');
      expect(eventos.filter(e => e.startsWith('taps/crear/registro/'))).toEqual([]);
    }
  });
});
