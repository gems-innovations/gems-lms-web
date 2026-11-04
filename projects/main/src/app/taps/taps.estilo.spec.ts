import { TAPS } from './taps.data';
import { MAX_CAPAS, MAX_TEXTO_CAPA, MUSICAS, PALETAS, STICKERS, estiloDe, fondoCss, validarEstilo } from './taps.estilo';
import { ITap } from './taps.types';

/** Contraste WCAG entre un color #rrggbb y el blanco. */
function contrasteConBlanco(hex: string): number {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return 1.05 / (l + 0.05);
}

describe('taps.estilo', () => {
  it('sin estilo o con basura no cambia nada', () => {
    expect(validarEstilo(undefined)).toBeNull();
    expect(validarEstilo('marco')).toBeNull();
    expect(validarEstilo({ marco: 'no-existe', paleta: 7, capas: 'x' })).toBeNull();
    expect(TAPS.some(t => estiloDe(t) !== null)).toBeFalse();   // el banco se ve como siempre
  });

  it('acepta ids del catálogo y descarta lo demás', () => {
    expect(validarEstilo({ marco: 'neon', paleta: 'oceano', letra: 'pixel', musica: 'wonder-loop', otro: 1 }))
      .toEqual({ marco: 'neon', paleta: 'oceano', letra: 'pixel', musica: 'wonder-loop' });
    expect(validarEstilo({ musica: 'tap-tap-aprende' })).toBeNull();          // canción de celebración: no es de fondo
    expect(validarEstilo({ marco: '__proto__' })).toBeNull();
  });

  it('el fondo solo admite #rrggbb y acota la fuerza', () => {
    expect(validarEstilo({ fondo: { tipo: 'color', color: 'red' } })).toBeNull();
    expect(validarEstilo({ fondo: { tipo: 'color', color: '#FF0000', fuerza: 3 } })!.fondo).toEqual({ tipo: 'color', color: '#ff0000', fuerza: 0.7 });
    const d = validarEstilo({ fondo: { tipo: 'degradado', de: '#000000', a: '#ffffff', angulo: 999 } })!.fondo!;
    expect(fondoCss(d)).toBe('linear-gradient(360deg, #000000, #ffffff)');
    expect(validarEstilo({ fondo: { tipo: 'degradado', de: '#000000', a: 'url(x)' } })).toBeNull();
    expect(validarEstilo({ fondo: { tipo: 'patron', id: 'rayas', color: 'javascript:' } })!.fondo).toEqual({ tipo: 'patron', id: 'rayas', color: '#ffffff', fuerza: 0.35 });
  });

  it('las capas: máximo 6, texto corto en una línea, posiciones acotadas', () => {
    const muchas = Array.from({ length: 9 }, () => ({ tipo: 'sticker', id: 'estrella', x: 500, y: -3, giro: 90 }));
    const e = validarEstilo({ capas: [...muchas] })!;
    expect(e.capas!.length).toBe(MAX_CAPAS);
    expect(e.capas![0]).toEqual({ tipo: 'sticker', id: 'estrella', x: 100, y: 0, escala: 1, giro: 45, color: '#ffffff' });
    const t = validarEstilo({ capas: [{ tipo: 'texto', texto: '  hola\n<b>mundo</b>' + 'x'.repeat(80) }, { tipo: 'texto', texto: '   ' }, { tipo: 'sticker', id: 'emoji' }] })!;
    expect(t.capas!.length).toBe(1);
    expect(t.capas![0].texto!.length).toBe(MAX_TEXTO_CAPA);
    expect(t.capas![0].texto).not.toContain('\n');
  });

  it('las paletas dejan leer el texto blanco (≥ 3,8:1)', () => {
    for (const [id, p] of Object.entries(PALETAS)) for (const c of p.colores) expect(contrasteConBlanco(c)).withContext(`${id} ${c}`).toBeGreaterThanOrEqual(3.8);
  });

  it('cada sticker y pista tiene nombre; estiloDe guarda el resultado por Tap', () => {
    expect(Object.values(STICKERS).every(s => s.nombre && s.d)).toBeTrue();
    expect(Object.keys(MUSICAS).length).toBe(9);
    const tap = { ...TAPS[0], estilo: { marco: 'brillo' } } as ITap;
    expect(estiloDe(tap)).toBe(estiloDe(tap));
  });
});
