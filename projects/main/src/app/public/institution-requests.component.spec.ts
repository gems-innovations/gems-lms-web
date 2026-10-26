import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from 'shared/core';
import { IRigPintor, RIG_PINTOR_LOADER } from '../taps/taps.look-validador';
import { InstitutionRequestsComponent } from './institution-requests.component';

/**
 * Panel /solicitudes (superadmin) con el campo `draft` del API (PR-9b del plan del diseñador): con un borrador válido enseña
 * «Personaje adjunto» con base, objeto, escenario y muestras de color como texto, y pinta la vista previa con el pintor de rig.js;
 * con `draft` nulo o corrupto, la solicitud se enseña como siempre y nada se interpreta como HTML.
 */
describe('InstitutionRequestsComponent (personaje adjunto)', () => {
  const ID = 'mh5k2x1a-0a1b2c3';
  const draft = JSON.stringify({ v: 1, borradorId: ID, b: 'arqueologa', l: { hat: 'safari', coat: '#8a6a3a', skin: '#c99a76', glasses: false }, i: 'lupa', w: 'excavacion-egipto' });
  const fila = (id: number, extra: Record<string, unknown>) => ({
    id, institutionName: `Colegio ${id}`, contactName: 'Persona', email: 'p@prueba.test', phone: null, role: null, students: 50,
    message: 'Quiero Taps', status: 'new', createdAt: '2026-10-25T10:00:00', ...extra,
  });
  let pintadas: { look: Record<string, unknown>; item: string | null }[];
  let fallarRig: boolean;
  const rig: IRigPintor = {
    lookOf: ch => ({ ...ch.look }),
    poseFor: () => ({}),
    drawHost: (_c, _x, _y, _s, _P, L, o) => { pintadas.push({ look: L, item: o?.item ?? null }); },
  };

  async function crear(lista: unknown[] | 'error'): Promise<ComponentFixture<InstitutionRequestsComponent>> {
    pintadas = [];
    await TestBed.configureTestingModule({
      imports: [InstitutionRequestsComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: RIG_PINTOR_LOADER, useValue: () => fallarRig ? Promise.reject(new Error('sin rig')) : Promise.resolve(rig) },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(InstitutionRequestsComponent);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(`${environment.apiBaseUrl}/institution-requests`);
    if (lista === 'error') req.flush('x', { status: 500, statusText: 'Error' }); else req.flush(lista);
    for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 0)); f.detectChanges(); }
    return f;
  }

  beforeEach(() => { fallarRig = false; });

  it('con draft válido: tarjeta «Personaje adjunto» con texto legible, muestras #rrggbb y vista previa pintada por rig.js', async () => {
    const f = await crear([fila(1, { draft })]);
    const host = f.nativeElement as HTMLElement;
    const adj = host.querySelector('.adj')!;
    expect(adj).not.toBeNull();
    expect(adj.textContent).toContain('Personaje adjunto');
    expect(adj.textContent).toContain('Inés (arqueóloga)');
    expect(adj.textContent).toContain('Lupa');
    expect(adj.textContent).toContain('Excavación en Egipto');
    expect(adj.textContent).toContain(ID);
    const muestras = Array.from(adj.querySelectorAll<HTMLElement>('.adj__muestra')).map(e => e.style.backgroundColor);
    expect(muestras.length).toBe(2);
    expect(adj.textContent).toContain('#c99a76'); expect(adj.textContent).toContain('#8a6a3a');
    expect(host.querySelector('.req__msg')!.textContent).toContain('Quiero Taps');
    expect(pintadas.length).toBe(1);
    expect(pintadas[0].item).toBe('lupa');
    expect(pintadas[0].look['hat']).toBe('safari');
    expect(adj.querySelector('canvas')?.getAttribute('aria-label')).toContain('Inés (arqueóloga)');
  });

  it('con draft nulo o ausente: la fila se enseña sin tarjeta', async () => {
    const f = await crear([fila(1, { draft: null }), fila(2, {})]);
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelectorAll('tbody tr').length).toBe(2);
    expect(host.querySelector('.adj')).toBeNull();
    expect(pintadas.length).toBe(0);
  });

  it('con draft corrupto, con forma rara o con HTML dentro: sin tarjeta o solo texto escapado; nunca se inyecta nada', async () => {
    const malo = JSON.stringify({ v: 1, borradorId: ID, b: '<img src=x onerror=alert(1)>', l: { coat: '<b>rojo</b>' }, i: '<script>', w: 'foro-roma' });
    const f = await crear([fila(1, { draft: '{roto' }), fila(2, { draft: '[]' }), fila(3, { draft: 12345 }), fila(4, { draft: malo })]);
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelectorAll('tbody tr').length).toBe(4);
    expect(host.querySelectorAll('.adj').length).withContext('solo la cuarta pasa la forma; las otras tres no').toBe(1);
    expect(host.querySelector('img, script, b.adj')).toBeNull();
    const adj = host.querySelector('.adj')!;
    expect(adj.textContent).toContain('Sorpréndeme');          // base rara → genérico (texto)
    expect(adj.textContent).toContain('Objeto');               // objeto raro → genérico
    expect(adj.querySelectorAll('.adj__muestra').length).toBe(0); // «<b>rojo</b>» no es #rrggbb
    expect(adj.innerHTML).not.toContain('<b>rojo');
    expect(adj.innerHTML).not.toContain('<img');
  });

  it('si rig.js no carga, queda el texto y las muestras sin vista previa y sin error', async () => {
    fallarRig = true;
    const f = await crear([fila(1, { draft })]);
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('.adj')?.textContent).toContain('Inés (arqueóloga)');
    expect(pintadas.length).toBe(0);
  });

  it('API con error: mensaje de error, como antes', async () => {
    const f = await crear('error');
    expect((f.nativeElement as HTMLElement).textContent).toContain('No se pudieron cargar');
  });
});
