import { AdvanceClock, IClockHost, TAP_RHYTHM, advanceDelay } from './taps.clock';

/** Reloj simulado: el tiempo solo avanza con `tick`. */
function fakeHost() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const host: IClockHost = {
    now: () => now,
    setTimeout: (fn, ms) => { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout: h => { timers.delete(h as number); },
  };
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); now = due[1].at; due[1].fn();
    }
    now = end;
  };
  return { host, tick };
}

describe('advanceDelay', () => {
  it('acierto 1,4 s, error 3,5 s', () => {
    expect(advanceDelay(true)).toBe(1400);
    expect(advanceDelay(false)).toBe(3500);
  });
  it('descuenta lo ya visto antes de hidratar, sin bajar del mínimo', () => {
    expect(advanceDelay(true, 600)).toBe(800);
    expect(advanceDelay(true, 5000)).toBe(TAP_RHYTHM.minMs);
  });
  it('el error siempre deja leer la explicación completa', () => {
    expect(advanceDelay(false, 2000)).toBe(3500);
  });
});

describe('AdvanceClock', () => {
  it('avanza solo al terminar la cuenta', () => {
    const { host, tick } = fakeHost(), done = jasmine.createSpy('done');
    const clock = new AdvanceClock(host, done);
    clock.start(1400);
    tick(1399);
    expect(done).not.toHaveBeenCalled();
    tick(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(clock.active).toBeFalse();
  });

  it('mantener presionado pausa y soltar sigue con lo que faltaba', () => {
    const { host, tick } = fakeHost(), done = jasmine.createSpy('done');
    const clock = new AdvanceClock(host, done);
    clock.start(3500);
    tick(1000);
    clock.pause();
    expect(clock.remaining()).toBe(2500);
    tick(10000);
    expect(done).not.toHaveBeenCalled();
    clock.resume();
    tick(2499);
    expect(done).not.toHaveBeenCalled();
    tick(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('tocar adelanta, pero no en los primeros 400 ms (el toque que respondió no salta la reacción)', () => {
    const { host, tick } = fakeHost(), done = jasmine.createSpy('done');
    const clock = new AdvanceClock(host, done);
    clock.start(1400);
    tick(100);
    expect(clock.skip()).toBeFalse();
    tick(300);
    expect(clock.skip()).toBeTrue();
    expect(done).toHaveBeenCalledTimes(1);
    tick(5000);
    expect(done).toHaveBeenCalledTimes(1);           // no se dispara dos veces
  });

  it('flush termina ya y cancel no avanza', () => {
    const { host, tick } = fakeHost(), done = jasmine.createSpy('done');
    const clock = new AdvanceClock(host, done);
    clock.start(3500);
    clock.flush();
    expect(done).toHaveBeenCalledTimes(1);
    clock.start(3500);
    clock.cancel();
    tick(9000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('empezar de nuevo reemplaza la cuenta anterior', () => {
    const { host, tick } = fakeHost(), done = jasmine.createSpy('done');
    const clock = new AdvanceClock(host, done);
    clock.start(1000);
    tick(900);
    clock.start(1000);
    tick(900);
    expect(done).not.toHaveBeenCalled();
    tick(100);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
