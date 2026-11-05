import { ITap } from './taps.types';
import { esIdDeUsuario, tapDeUsuario } from './taps.usuario';
import { mensajeError } from './tap-disenador.component';
import { HttpErrorResponse } from '@angular/common/http';

const publico = () => ({
  id: 'u-23456789bc', version: 1, soloEnlace: true, v: 1, theme: 'epoca', title: 'Reto de Ada', kicker: 'Hecho en GEMS',
  scene: { world: 'foro-roma', host: 'senador', item: 'pergamino' },
  questions: Array.from({ length: 5 }, (_, i) => ({ q: `¿Pregunta ${i}?`, options: ['A', 'B', 'C', 'D'], answer: 1, why: 'Porque sí.', tipo: i === 4 ? 'vf' : 'clasica' })),
  results: [{ min: 0, title: 'Uno', line: 'L1' }, { min: 3, title: 'Dos', line: 'L2' }, { min: 5, title: 'Tres', line: 'L3' }],
  topic: 'creador', estilo: { marco: 'neon' },
});
const banco = [{ id: 'x', theme: 'epoca', scene: { world: 'foro-roma', host: 'senador' }, backdrop: ['#111111', '#222222'], ground: '#333333' }] as unknown as ITap[];

describe('Taps de usuario (/t/u-…)', () => {
  it('reconoce solo ids u- del alfabeto del API', () => {
    expect(esIdDeUsuario('u-23456789bc')).toBeTrue();
    for (const id of [null, 'u-2345', 'u-23456789ba', 'napoleon', 'U-23456789bc', 'u-23456789bc/x']) expect(esIdDeUsuario(id)).toBeFalse();
  });

  it('convierte lo publicado en un Tap solo por enlace, con ids de pregunta y el fondo de su lugar', () => {
    const t = tapDeUsuario(publico(), banco)!;
    expect(t.soloEnlace).toBeTrue();
    expect(t.questions.map(q => q.id)).toEqual(['u-23456789bc-1', 'u-23456789bc-2', 'u-23456789bc-3', 'u-23456789bc-4', 'u-23456789bc-5']);
    expect(t.questions[0].tipo).toBeUndefined();
    expect(t.questions[4].tipo).toBe('vf');
    expect(t.backdrop).toEqual(['#111111', '#222222']);
    expect(t.ground).toBe('#333333');
    expect(t.scene).toEqual({ world: 'foro-roma', host: 'senador', item: 'pergamino' });
    expect(t.estilo).toEqual({ marco: 'neon' });
  });

  it('el look propio del personaje viaja a la escena; uno con forma rara se ignora (el Tap se juega igual)', () => {
    const look = { hairStyle: 'rizos', coat: '#336699', glasses: true };
    expect(tapDeUsuario({ ...publico(), scene: { ...publico().scene, look } }, banco)!.scene.look).toEqual(look);
    for (const raro of [[1], 'rizos', { coat: 5 }, { coat: null }]) {
      expect(tapDeUsuario({ ...publico(), scene: { ...publico().scene, look: raro } }, banco)!.scene.look).withContext(JSON.stringify(raro)).toBeUndefined();
    }
  });

  it('descarta formas raras en vez de jugar algo a medias', () => {
    expect(tapDeUsuario(null, banco)).toBeNull();
    expect(tapDeUsuario({ ...publico(), id: 'napoleon' }, banco)).toBeNull();
    expect(tapDeUsuario({ ...publico(), theme: 'minecraft' }, banco)).toBeNull();
    const malo = publico(); malo.questions[2].answer = 7;
    expect(tapDeUsuario(malo, banco)).toBeNull();
    expect(tapDeUsuario({ ...publico(), results: [{ min: 'x', title: 'a', line: 'b' }] }, banco)).toBeNull();
    expect(tapDeUsuario({ ...publico(), scene: { world: 'luna', host: 'senador' } }, [])!.backdrop.length).toBe(2);
  });

  it('el mensaje de error de publicar nombra el campo del 400 y explica los demás', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 400, error: { message: 'Texto no permitido en título' } }))).toContain('Texto no permitido en título');
    expect(mensajeError(new HttpErrorResponse({ status: 403 }))).toContain('docente');
    expect(mensajeError(new HttpErrorResponse({ status: 0 }))).toContain('Sin conexión');
    expect(mensajeError(new Error('x'))).toContain('No se pudo publicar');
  });
});
