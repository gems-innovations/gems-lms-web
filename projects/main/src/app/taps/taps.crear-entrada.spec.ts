import {
  CADA_RESULTADOS, COPY_ENTRADA, descartarEntrada, enlaceCrear, eventoEntrada, leerEstadoEntrada, registrarResultado,
} from './taps.crear-entrada';
import { ORIGENES_CREAR, origenCrear } from './taps.crear';

describe('enlaceCrear', () => {
  it('cada entrada lleva a /crear con su ?desde= y /crear lo reconoce', () => {
    for (const origen of ['portada', 'feed', 'instituciones', 'instructor'] as const) {
      const e = enlaceCrear(origen);
      expect(e.ruta).toBe('/crear');
      expect(e.query).toEqual({ desde: origen });
      expect(origenCrear(`?${new URLSearchParams(e.query)}`, 'abrir/directo')).toBe(origen);
      expect(ORIGENES_CREAR).toContain(origen);
    }
  });
  it('solo lleva lo que /crear lee (sin tema)', () => {
    expect(Object.keys(enlaceCrear('feed').query)).toEqual(['desde']);
  });
});

describe('eventoEntrada', () => {
  it('sigue la taxonomía taps/crear/entrada/<entrada>/<accion>', () => {
    expect(eventoEntrada('resultado', 'mostrado')).toBe('taps/crear/entrada/resultado/mostrado');
    expect(eventoEntrada('instituciones', 'clic')).toBe('taps/crear/entrada/instituciones/clic');
    expect(eventoEntrada('menu', 'clic')).toBe('taps/crear/entrada/menu/clic');
  });
});

describe('«Haz tu personaje» en el resultado (1 de cada 5, nunca tras 0 de 5)', () => {
  const jugar = (veces: number, aciertos = 3, inicial = leerEstadoEntrada(null)) => {
    let estado = inicial;
    const ofrecidos: number[] = [];
    for (let k = 1; k <= veces; k++) {
      const r = registrarResultado(estado, aciertos, 5);
      estado = r.estado;
      if (r.ofrecer) ofrecidos.push(k);
    }
    return { estado, ofrecidos };
  };

  it('se ofrece en el resultado 5, 10 y 15, no antes ni entre medias', () => {
    expect(CADA_RESULTADOS).toBe(5);
    expect(jugar(15).ofrecidos).toEqual([5, 10, 15]);
  });
  it('nunca tras 0 aciertos: ese turno se pierde y el siguiente es el 10', () => {
    const hasta4 = jugar(4);
    const quinto = registrarResultado(hasta4.estado, 0, 5);
    expect(quinto.ofrecer).toBeFalse();
    expect(quinto.estado.n).toBe(5);
    expect(jugar(5, 3, quinto.estado).ofrecidos).toEqual([5]);          // el 10.º en total
  });
  it('un Tap sin preguntas puntuables no ofrece nada', () => {
    expect(registrarResultado({ n: 4, descartado: false }, 0, 0).ofrecer).toBeFalse();
  });
  it('descartado: no se vuelve a ofrecer, pero sigue contando', () => {
    const d = descartarEntrada(jugar(5).estado);
    expect(d.descartado).toBeTrue();
    const despues = jugar(10, 5, d);
    expect(despues.ofrecidos).toEqual([]);
    expect(despues.estado.n).toBe(15);
  });
  it('lee lo guardado con tolerancia a basura', () => {
    expect(leerEstadoEntrada(null)).toEqual({ n: 0, descartado: false });
    expect(leerEstadoEntrada('{"n":7,"descartado":true}')).toEqual({ n: 7, descartado: true });
    expect(leerEstadoEntrada('{"n":"x"}')).toEqual({ n: 0, descartado: false });
    expect(leerEstadoEntrada('no es json')).toEqual({ n: 0, descartado: false });
    expect(leerEstadoEntrada('{"n":-3,"descartado":"si"}')).toEqual({ n: 0, descartado: false });
  });
});

describe('copy de las entradas', () => {
  it('es para personas, honesto y sin emojis', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const t of Object.values(COPY_ENTRADA)) expect(t).not.toMatch(emoji);
    expect(COPY_ENTRADA.portadaLinea).toContain('sin cuenta');
    expect(COPY_ENTRADA.portadaLinea).toContain('docentes e instituciones');
    expect(COPY_ENTRADA.hazTuPersonaje).toBe('Haz tu personaje');
    expect(COPY_ENTRADA.probarCreador).toBe('Probar el creador');
  });
});
