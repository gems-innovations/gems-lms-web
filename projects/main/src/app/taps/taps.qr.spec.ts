import { qr, qrTrazo } from './taps.qr';

// Que se lee de verdad se comprobó con un lector (zxing-cpp) para v1–v10; aquí se fija la forma.
describe('QR propio', () => {
  it('elige la versión más pequeña donde cabe y pone los tres buscadores', () => {
    const m = qr('https://gemslms.com/t/u-23456789bc')!;
    expect(m.length).toBe(29); // versión 3
    for (const [x, y] of [[0, 0], [22, 0], [0, 22]]) {
      expect(m[y][x]).toBeTrue();
      expect(m[y + 1][x + 1]).toBeFalse();
      expect(m[y + 3][x + 3]).toBeTrue();
    }
    expect(m[21][8]).toBeTrue(); // módulo oscuro fijo
  });

  it('acepta hasta 213 bytes (versión 10) y devuelve null si no cabe', () => {
    expect(qr('x'.repeat(213))!.length).toBe(57);
    expect(qr('x'.repeat(214))).toBeNull();
  });

  it('es determinista y el trazo tiene un cuadro por módulo oscuro', () => {
    const a = qr('Hola'), b = qr('Hola');
    expect(a).toEqual(b);
    const oscuros = a!.flat().filter(Boolean).length;
    expect(qrTrazo(a!).split('M').length - 1).toBe(oscuros);
  });
});
