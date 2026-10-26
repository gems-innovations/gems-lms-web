import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../analytics.service';
import { VALIDADOR_LOOK_LOADER } from '../taps/taps.look-validador';
import { InstitutionsComponent } from './institutions.component';
import { IInstitutionRequest, PublicCatalogService } from './public-catalog.service';

/**
 * Formulario de /instituciones con `?borrador=<id>` (PR-8 del plan del diseñador, §A.3.3): muestra «Tu personaje irá adjunto» con la
 * miniatura de localStorage y manda el borrador compacto como string en el campo `draft` (PR-9b), con `message` intacto; sin
 * borrador válido funciona como siempre.
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

  it('con ?borrador= válido y desde=crear: miniatura, «Tu personaje irá adjunto», `draft` como string JSON, message intacto y registro/inicio|enviado', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('.adjunto')?.textContent).toContain('Tu personaje irá adjunto');
    expect(host.querySelector<HTMLImageElement>('.adjunto__mini')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(host.querySelector('.adjunto__contador')).withContext('ya no hay contador: el borrador no compite con el texto').toBeNull();
    expect(host.querySelector('[name="msg"]')?.getAttribute('maxlength')).toBe('2000');
    expect(eventos).toContain('taps/crear/registro/inicio');
    rellenarYEnviar(f, 'Quiero Taps');
    expect(enviados.length).toBe(1);
    expect(enviados[0].message).toBe('Quiero Taps');
    expect(enviados[0].message).not.toContain('[gems-borrador');
    const draft = enviados[0].draft;
    expect(typeof draft).toBe('string');
    expect(JSON.parse(draft!)).toEqual({ v: 1, borradorId: ID, b: 'grabador', l: { hat: 'copa', coat: '#223344' }, i: 'pluma', w: 'taller-londres' });
    expect(draft).not.toContain('miniatura');
    expect(draft).not.toContain('data:image');
    expect(new TextEncoder().encode(draft).length).toBeLessThanOrEqual(2048);
    expect(enviados[0].email).toBe('contacto@prueba.test');
    expect(eventos).toContain('taps/crear/registro/enviado');
  });

  it('un mensaje de 2000 caracteres viaja entero y el borrador también: ya no compiten por el mismo campo', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    const largo = 'm'.repeat(2000);
    rellenarYEnviar(f, largo);
    expect(enviados[0].message).toBe(largo);
    expect(enviados[0].draft).toContain(`"borradorId":"${ID}"`);
  });

  it('si el envío con draft falla, se enseña el error normal y no se reintenta sin el borrador', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    let intentos = 0;
    const servicio = TestBed.inject(PublicCatalogService) as unknown as { requestInstitution: (b: IInstitutionRequest) => unknown };
    servicio.requestInstitution = (b: IInstitutionRequest) => { intentos++; enviados.push(b); return throwError(() => new Error('500')); };
    rellenarYEnviar(f, 'Hola');
    expect(intentos).toBe(1);
    expect(enviados[0].draft).toBeDefined();
    expect((f.nativeElement as HTMLElement).querySelector('.error')?.textContent).toContain('No pudimos enviar');
    expect((f.nativeElement as HTMLElement).querySelector('.adjunto')).withContext('el personaje sigue adjunto para reintentar a mano').not.toBeNull();
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

  it('«No adjuntarlo» quita el borrador: el cuerpo va sin `draft`', async () => {
    guardarBorrador();
    const f = await crear({ borrador: ID, desde: 'crear' });
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.adjunto__quitar')!.click();
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.adjunto')).toBeNull();
    rellenarYEnviar(f, 'Sin personaje');
    expect(enviados[0].message).toBe('Sin personaje');
    expect('draft' in enviados[0]).toBeFalse();
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
      expect('draft' in enviados[0]).toBeFalse();
      expect(eventos.filter(e => e.startsWith('taps/crear/registro/'))).toEqual([]);
    }
  });
});
