import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { TapComentariosComponent, motivo } from './tap-comentarios.component';
import { ITapComentarios, TapsSocialService } from './taps-social.service';

const yo = { id: 1, alias: 'Lobo Sabio 120', texto: 'el mío', creado: '2026-10-29T20:00:00Z', mio: true };
const otro = { id: 2, alias: 'Gato Leal 300', texto: 'otro', creado: '2026-10-29T19:00:00Z', mio: false };

describe('TapComentariosComponent', () => {
  let pagina: Subject<ITapComentarios>, social: jasmine.SpyObj<TapsSocialService>, conSesion: boolean;

  async function montar(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [TapComentariosComponent],
      providers: [provideRouter([]), { provide: TapsSocialService, useValue: social },
        { provide: AuthSessionService, useValue: { isAuthenticated: () => conSesion } }],
    });
    const f = TestBed.createComponent(TapComentariosComponent);
    f.componentRef.setInput('tapId', 'cu-mitos');
    f.componentRef.setInput('titulo', 'Mitos que te creíste');
    f.autoDetectChanges();
    await f.whenStable();
    return f.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    pagina = new Subject();
    conSesion = true;
    social = jasmine.createSpyObj<TapsSocialService>('TapsSocialService', ['comentarios', 'comentar', 'borrar', 'reportar', 'de']);
    social.comentarios.and.returnValue(pagina);
    social.de.and.returnValue(undefined);
  });

  it('muestra el estado vacío sin inventar comentarios', async () => {
    const el = await montar();
    pagina.next({ comentarios: [], siguiente: null });
    await new Promise(r => setTimeout(r));
    expect(el.textContent).toContain('Todavía no hay comentarios');
  });

  it('lista con «Borrar» en el propio, «Reportar» en los demás y «Ver más» si hay otra página', async () => {
    const el = await montar();
    pagina.next({ comentarios: [yo, otro], siguiente: '2' });
    await new Promise(r => setTimeout(r));
    const items = el.querySelectorAll('.cm__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Borrar');
    expect(items[1].textContent).toContain('Reportar');
    expect(el.querySelector('.cm__mas')).not.toBeNull();
  });

  it('sin sesión pide entrar en lugar del campo', async () => {
    conSesion = false;
    const el = await montar();
    pagina.next({ comentarios: [otro], siguiente: null });
    await new Promise(r => setTimeout(r));
    expect(el.querySelector('textarea')).toBeNull();
    expect(el.querySelector('.cm__nota a')?.textContent).toContain('Entrar');
    expect(el.textContent).not.toContain('Reportar');
  });

  it('publica arriba de la lista y enseña el motivo si el servidor lo rechaza', async () => {
    const el = await montar();
    pagina.next({ comentarios: [otro], siguiente: null });
    await new Promise(r => setTimeout(r));
    const campo = el.querySelector('textarea')!;
    campo.value = 'nuevo'; campo.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r));
    social.comentar.and.returnValue(of({ ...yo, id: 3, texto: 'nuevo' }));
    el.querySelector<HTMLButtonElement>('.cm__enviar')!.click();
    await new Promise(r => setTimeout(r));
    expect(el.querySelector('.cm__item .cm__texto')?.textContent).toBe('nuevo');

    social.comentar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Los comentarios no pueden llevar enlaces' } })));
    campo.value = 'www.x'; campo.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r));
    el.querySelector<HTMLButtonElement>('.cm__enviar')!.click();
    await new Promise(r => setTimeout(r));
    expect(el.querySelector('.cm__aviso')?.textContent).toBe('Los comentarios no pueden llevar enlaces');
  });

  it('motivo: 429 con mensaje, 401 y genérico', () => {
    expect(motivo(new HttpErrorResponse({ status: 429, error: { message: 'Vas muy rápido' } }))).toBe('Vas muy rápido');
    expect(motivo(new HttpErrorResponse({ status: 401 }))).toContain('Vuelve a entrar');
    expect(motivo(new HttpErrorResponse({ status: 500, error: { message: 'NPE' } }))).toContain('No pudimos publicar');
  });
});
