import { HttpErrorResponse } from '@angular/common/http';
import { loginErrorMessage } from './login.usecase';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error, url: '/auth/login' });

describe('loginErrorMessage', () => {
  it('solo culpa a la contraseña cuando de verdad es la contraseña', () => {
    expect(loginErrorMessage(http(401))).toBe('Correo o contraseña incorrectos');
    expect(loginErrorMessage(http(500))).not.toContain('contraseña incorrect');
    expect(loginErrorMessage(http(503))).toContain('nuestro lado');
  });

  it('distingue la falta de conexión y el exceso de intentos', () => {
    expect(loginErrorMessage(http(0))).toMatch(/conexión|conectarnos/);
    expect(loginErrorMessage(http(429))).toContain('Demasiados intentos');
    expect(loginErrorMessage(http(403, { code: 'USER_DEACTIVATED' }))).toContain('desactivada');
  });
});
