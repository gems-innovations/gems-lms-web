import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { AnalyticsService } from '../analytics.service';
import { DISENADOR_LOADER, IContextoPublicar, IDisenadorModule, TapDisenadorComponent } from './tap-disenador.component';
import { ITapCreador, TapsCreadorService } from './taps-creador.service';
import { CLAVE_AVISO_PUBLICAR } from './taps.crear';

/** «Publicar» con sesión y la bandera tapsCreador: guarda y publica en el API y entrega el enlace /t/u-…. */
describe('TapDisenadorComponent: publicar con cuenta', () => {
  let fixture: ComponentFixture<TapDisenadorComponent>;
  let eventos: string[];
  let llamadas: { payload: object; idPrevio: string | null }[];
  let respuesta: () => Promise<ITapCreador>;
  let contexto: IContextoPublicar;
  const TAP = { v: 1, theme: 'epoca', title: 'Reto de Tomás' };
  const CLAVE = 'taps.crear.publicados';

  const modulo: IDisenadorModule = {
    async montarDisenador(raiz, o) {
      raiz.innerHTML = '<div id="ranuraVista"></div>';
      const b = document.createElement('button'); b.id = 'publicar';
      b.onclick = () => o.pasoPublicar?.alTocar?.(contexto); raiz.append(b);
      return { ok: true, destruir: () => undefined };
    },
  };

  beforeEach(async () => {
    eventos = []; llamadas = [];
    respuesta = () => Promise.resolve({ id: 'u-23456789bc', estado: 'publicado' });
    contexto = { borradorId: 'b-1', enlace: 'http://localhost/crear#look=x', nombre: 'Tomás', hito: null, accion: 'publicar', tap: TAP };
    localStorage.setItem(CLAVE_AVISO_PUBLICAR, '1'); localStorage.removeItem(CLAVE);
    (globalThis as Record<string, unknown>)['tapsCreador'] = true;
    await TestBed.configureTestingModule({
      imports: [TapDisenadorComponent],
      providers: [
        provideRouter([]),
        { provide: DISENADOR_LOADER, useValue: () => Promise.resolve(modulo) },
        { provide: AnalyticsService, useValue: { event: (n: string) => eventos.push(n), isInternal: () => false } },
        { provide: AuthSessionService, useValue: { isAuthenticated: () => true } },
        { provide: TapsCreadorService, useValue: { publicar: (payload: object, idPrevio: string | null) => { llamadas.push({ payload, idPrevio }); return respuesta(); } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TapDisenadorComponent);
    fixture.detectChanges();
    for (let i = 0; i < 50 && !el('#publicar'); i++) { await new Promise(r => setTimeout(r, 0)); fixture.detectChanges(); }
  });

  afterEach(() => { delete (globalThis as Record<string, unknown>)['tapsCreador']; localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_AVISO_PUBLICAR); });

  const el = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
  async function tocar(sel: string): Promise<void> {
    el(sel)!.click();
    for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 0)); fixture.detectChanges(); }
  }

  it('publica, muestra el enlace del Tap y recuerda su id para no crear otro', async () => {
    await tocar('#publicar');
    expect(el('#ganchoTitulo')?.textContent).toContain('Publicar tu Tap');
    expect(el('#ganchoDocente')).toBeNull();
    expect(eventos).toContain('taps/crear/intento-publicar/con-cuenta');
    await tocar('#ganchoPublicar');
    expect(llamadas).toEqual([{ payload: TAP, idPrevio: null }]);
    expect((el('.gancho__enlace input') as HTMLInputElement).value).toBe(`${location.origin}/t/u-23456789bc`);
    expect(el('a.gancho__btn')?.getAttribute('href')).toBe('/t/u-23456789bc');
    expect(eventos).toContain('taps/crear/publicado/nuevo');
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual({ 'b-1': 'u-23456789bc' });

    await tocar('#ganchoVolver'); await tocar('#publicar'); await tocar('#ganchoPublicar');
    expect(llamadas[1].idPrevio).toBe('u-23456789bc');
  });

  it('un creador sin aval queda en revisión, sin enlace', async () => {
    respuesta = () => Promise.resolve({ id: 'u-23456789bc', estado: 'en_revision' });
    await tocar('#publicar'); await tocar('#ganchoPublicar');
    expect(el('#ganchoIntro')?.textContent).toContain('revisión');
    expect(el('.gancho__enlace')).toBeNull();
  });

  it('un error del API se explica y deja volver a intentar', async () => {
    respuesta = () => Promise.reject(new HttpErrorResponse({ status: 400, error: { message: 'Texto no permitido en título' } }));
    await tocar('#publicar'); await tocar('#ganchoPublicar');
    expect(el('.gancho__estado--error')?.textContent).toContain('Texto no permitido en título');
    expect((el('#ganchoPublicar') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('sin las 5 preguntas completas no ofrece publicar', async () => {
    contexto = { ...contexto, tap: null };
    await tocar('#publicar');
    expect(el('#ganchoPublicar')).toBeNull();
    expect(el('#ganchoIntro')?.textContent).toContain('5 preguntas');
  });
});
