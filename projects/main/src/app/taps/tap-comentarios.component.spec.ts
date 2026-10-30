import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TapComentariosComponent } from './tap-comentarios.component';
import { TapsSocialService } from './taps-social.service';

describe('TapComentariosComponent', () => {
  const mio = { id: '1', autor: 'Ana P.', texto: 'el mío', creado: '2026-10-29T20:00:00Z', mio: true };
  const otro = { id: '2', autor: 'Luis G.', texto: 'otro', creado: '2026-10-29T19:00:00Z', mio: false };
  let social: jasmine.SpyObj<TapsSocialService>;

  async function montar(): Promise<HTMLElement> {
    social = jasmine.createSpyObj<TapsSocialService>('TapsSocialService', ['comentarios', 'comentar', 'borrarComentario', 'reportar']);
    social.comentarios.and.returnValue(of({ comentarios: [mio, otro], siguiente: null }));
    social.borrarComentario.and.returnValue(of(null));
    social.reportar.and.returnValue(of(null));
    TestBed.configureTestingModule({ imports: [TapComentariosComponent], providers: [{ provide: TapsSocialService, useValue: social }] });
    const f = TestBed.createComponent(TapComentariosComponent);
    f.componentRef.setInput('tapId', 'mc-gancho');
    f.autoDetectChanges();
    await f.whenStable();
    return f.nativeElement as HTMLElement;
  }
  const boton = (el: HTMLElement, texto: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('.com__item button')].find(b => b.textContent!.trim() === texto)!;
  const pausa = () => new Promise(r => setTimeout(r));

  it('borrar pide confirmación y un doble toque no manda dos peticiones', async () => {
    const el = await montar();
    boton(el, 'Borrar').click(); await pausa();
    expect(social.borrarComentario).not.toHaveBeenCalled();
    const si = boton(el, 'Sí, borrar');
    si.click(); si.click(); await pausa();
    expect(social.borrarComentario).toHaveBeenCalledTimes(1);
    expect(el.querySelectorAll('.com__item').length).toBe(1);
  });

  it('un comentario reportado no se puede volver a reportar', async () => {
    const el = await montar();
    boton(el, 'Reportar').click(); await pausa();
    boton(el, 'Sí, reportar').click(); await pausa();
    expect(social.reportar).toHaveBeenCalledOnceWith('2');
    expect(boton(el, 'Reportar')).toBeUndefined();
    expect(el.textContent).toContain('Reportado. Gracias.');
  });
});
