import { CINTA_TRANSPARENCIA, PASO_PUBLICAR, PRONTO_PUBLICAR, hitosCrear, origenCrear } from './taps.crear';

describe('origenCrear', () => {
  it('?desde= conocido manda sobre lo que vio el diseñador', () => {
    expect(origenCrear('?desde=portada', 'abrir/directo')).toBe('portada');
    expect(origenCrear('?desde=feed', 'abrir/continuar')).toBe('feed');
    expect(origenCrear('?x=1&desde=instituciones', null)).toBe('instituciones');
  });
  it('sin ?desde= (o con uno raro) vale lo que detectó el diseñador', () => {
    expect(origenCrear('', 'abrir/enlace')).toBe('enlace');
    expect(origenCrear('?desde=cualquier-cosa', 'abrir/continuar')).toBe('continuar');
    expect(origenCrear('?desde=<script>', 'directo')).toBe('directo');
    expect(origenCrear('', null)).toBe('directo');
  });
});

describe('hitosCrear', () => {
  it('el primer gesto creativo cuenta `creo` una sola vez', () => {
    const ya = new Set<string>();
    expect(hitosCrear('preset/grabador', ya)).toEqual(['taps/crear/creo']);
    expect(hitosCrear('cambio/ropa', ya)).toEqual([]);
    expect(hitosCrear('sorprendeme/todo', ya)).toEqual([]);
  });
  it('llegar a «Listo» cierra el personaje (y cuenta `creo` si no se había contado)', () => {
    const ya = new Set<string>();
    expect(hitosCrear('paso/escenario', ya)).toEqual([]);
    expect(hitosCrear('paso/listo', ya)).toEqual(['taps/crear/creo', 'taps/crear/personaje-listo']);
    expect(hitosCrear('listo', ya)).toEqual([]);
  });
  it('lo demás (deshacer, compartir, gusto, abandono) no es hito del embudo', () => {
    const ya = new Set<string>();
    for (const n of ['deshacer', 'compartir/enlace', 'gusto/si', 'abandono/personaje/40', 'abrir/directo', 'probar']) expect(hitosCrear(n, ya)).toEqual([]);
    expect(ya.size).toBe(0);
  });
});

describe('copy de /crear', () => {
  it('es honesto y sin emojis', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const t of [CINTA_TRANSPARENCIA, PASO_PUBLICAR, PRONTO_PUBLICAR]) expect(t).not.toMatch(emoji);
    expect(CINTA_TRANSPARENCIA).toContain('sin cuenta');
    expect(CINTA_TRANSPARENCIA).toContain('se guarda en este navegador');
    expect(PASO_PUBLICAR).toBe('Publicar (con cuenta)');
  });
});
