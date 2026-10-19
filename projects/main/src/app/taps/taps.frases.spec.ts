import { FRASES, FRASES_GENERALES, FRASES_RACHA, elegir, fraseActual, frasesPartida, lineaResultado, semillaNumero } from './taps.frases';
import { TAPS } from './taps.data';
import { orderFeed, resultFor, topicOf } from './taps.logic';

describe('frases de reacción (azar con semilla)', () => {
  it('la misma semilla da siempre la misma frase (servidor, hidratación y repintado coinciden)', () => {
    const c = { host: 'leo', theme: 'minecraft', semilla: '42|mc-gancho|0' };
    const respuestas = [true, false, true, true, false];
    expect(frasesPartida(respuestas, c)).toEqual(frasesPartida(respuestas, c));
    expect(fraseActual(respuestas.slice(0, 2), c)).toBe(frasesPartida(respuestas, c)[1]);
    expect(semillaNumero('abc')).toBe(semillaNumero('abc'));
    expect(elegir(['x', 'y', 'z'], 's')).toBe(elegir(['x', 'y', 'z'], 's'));
  });

  it('nunca repite la frase anterior dentro de una partida', () => {
    for (let s = 0; s < 300; s++) {
      for (const host of Object.keys(FRASES)) {
        const out = frasesPartida([true, true, false, false, true], { host, theme: 'estudio', semilla: `s${s}` });
        out.forEach((f, i) => { if (i) expect(f).not.toBe(out[i - 1]); });
      }
    }
  });

  it('en 9 Taps seguidos ninguna secuencia de 4 frases se repite', () => {
    const feed = orderFeed(TAPS, {}).slice(0, 9);
    const patrones = [[true, true, false, true, true], [true, false, true, true, false], [false, true, true, true, true]];
    const secuencias: string[] = [];
    feed.forEach((tap, k) => {
      const frases = frasesPartida(patrones[k % patrones.length], { host: tap.scene.host, theme: tap.theme, semilla: `123|${tap.id}|0` });
      for (let i = 0; i + 4 <= frases.length; i++) secuencias.push(frases.slice(i, i + 4).join(' / '));
      // En el mismo Tap, ninguna frase sale dos veces seguidas.
      frases.forEach((f, i) => { if (i) expect(f).not.toBe(frases[i - 1]); });
    });
    expect(new Set(secuencias).size).toBe(secuencias.length);
  });

  it('la revancha (otra partida) cambia las frases', () => {
    const r = [true, true, false, true, false];
    const a = frasesPartida(r, { host: 'nube', theme: 'estudio', semilla: '7|lg-zorgs|0' });
    const b = frasesPartida(r, { host: 'nube', theme: 'estudio', semilla: '7|lg-zorgs|1' });
    expect(a).not.toEqual(b);
  });

  it('las rachas de 3 y de 5 usan sus frases', () => {
    const out = frasesPartida([true, true, true, true, true], { host: 'leo', theme: 'minecraft', semilla: 'x' });
    expect(FRASES['leo'].acierto).toContain(out[0]);
    expect(FRASES_RACHA['minecraft'].tres).toContain(out[2]);
    expect(FRASES_RACHA['minecraft'].cinco).toContain(out[4]);
  });

  it('cada personaje de los temas tiene 10-12 frases por tipo, cortas, sin repetir y sin emojis', () => {
    const hosts = new Set(TAPS.map(t => t.scene.host));
    for (const host of hosts) expect(FRASES[host]).withContext(`frases de ${host}`).toBeDefined();
    for (const lista of [...Object.values(FRASES), FRASES_GENERALES]) {
      for (const tipo of [lista.acierto, lista.fallo]) {
        expect(tipo.length).toBeGreaterThanOrEqual(10);
        expect(tipo.length).toBeLessThanOrEqual(12);
        expect(new Set(tipo).size).toBe(tipo.length);
        for (const f of tipo) {
          expect(f.length).withContext(f).toBeLessThanOrEqual(22);        // cabe en la píldora a 320 px
          expect(/\p{Extended_Pictographic}/u.test(f)).withContext(f).toBeFalse();
        }
      }
    }
  });

  it('un personaje sin frases propias usa las generales', () => {
    expect(FRASES_GENERALES.acierto).toContain(fraseActual([true], { host: 'nadie', theme: 'otro', semilla: 'q' }));
  });
});

describe('títulos y líneas del resultado', () => {
  it('4 Taps de Minecraft seguidos dan al menos 3 títulos distintos', () => {
    const mc = orderFeed(TAPS, { topic: 'minecraft' }).filter(t => topicOf(t) === 'minecraft').slice(0, 4);
    for (const score of [2, 4, 5]) {
      expect(new Set(mc.map(t => resultFor(t, score).title)).size).withContext(`con ${score} aciertos`).toBeGreaterThanOrEqual(3);
    }
  });

  it('la línea se elige entre sus variantes y es fija para la misma partida', () => {
    const r = { min: 4, title: 'T', line: 'uno', lines: ['uno', 'dos', 'tres'] };
    const vistas = new Set(Array.from({ length: 40 }, (_, i) => lineaResultado(r, `t|${i}`)));
    expect(vistas.size).toBe(3);
    expect(lineaResultado(r, 't|11011')).toBe(lineaResultado(r, 't|11011'));
    expect(lineaResultado({ min: 0, title: 'S', line: 'sola' }, 'x')).toBe('sola');
  });

  it('todos los Taps del banco traen variantes de línea en cada título', () => {
    for (const t of TAPS) for (const r of t.results) expect(r.lines?.length).withContext(`${t.id} ${r.title}`).toBe(3);
  });
});

describe('frase del script previo a hidratar', () => {
  it('se conserva en la primera respuesta y la siguiente no la repite', () => {
    for (let s = 0; s < 50; s++) {
      const out = frasesPartida([true, true], { host: 'leo', theme: 'minecraft', semilla: `p${s}`, primera: '¡Exacto!' });
      expect(out[0]).toBe('¡Exacto!');
      expect(out[1]).not.toBe('¡Exacto!');
    }
  });
});
