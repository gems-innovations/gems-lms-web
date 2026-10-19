import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import { LoadingGate } from '../../../loading/src/loading-timing';
import { describeLoadError, isTransientError } from '../../../loading/src/http-error';
import { optimisticUpdate } from '../../../loading/src/optimistic';
import { retryTransient } from '../../../loading/src/retry';
import { SkeletonComponent } from '../../../loading/src/skeleton/skeleton.component';
import { BusyLabelComponent } from '../../../loading/src/busy-label/busy-label.component';
import { LoadErrorComponent } from '../../../loading/src/load-error/load-error.component';
import { ConnectionStatusComponent } from '../../../loading/src/connection-status/connection-status.component';

const http = (status: number) => new HttpErrorResponse({ status, url: '/x' });

describe('LoadingGate (mostrar tarde, ocultar no antes de)', () => {
  let now = 0;
  let seen: boolean[];
  let gate: LoadingGate;

  beforeEach(() => {
    jasmine.clock().install();
    now = 0;
    seen = [];
    gate = new LoadingGate(v => seen.push(v), 300, 500, () => now);
  });
  afterEach(() => { gate.dispose(); jasmine.clock().uninstall(); });

  const tick = (ms: number) => { now += ms; jasmine.clock().tick(ms); };

  it('no muestra nada si la carga dura menos de 300 ms', () => {
    gate.set(true);
    tick(250);
    gate.set(false);
    tick(1000);
    expect(seen).toEqual([]);
  });

  it('aparece a los 300 ms y, si se vio, dura al menos 500 ms', () => {
    gate.set(true);
    tick(300);
    expect(seen).toEqual([true]);
    tick(100);
    gate.set(false);           // terminó a los 400 ms: se queda hasta los 800 ms
    tick(399);
    expect(seen).toEqual([true]);
    tick(1);
    expect(seen).toEqual([true, false]);
  });

  it('se oculta enseguida si ya pasó el mínimo', () => {
    gate.set(true);
    tick(300);
    tick(600);
    gate.set(false);
    expect(seen).toEqual([true, false]);
  });

  it('una carga nueva durante la espera de salida mantiene el indicador', () => {
    gate.set(true);
    tick(300);
    gate.set(false);
    tick(100);
    gate.set(true);
    tick(1000);
    expect(seen).toEqual([true]);
  });
});

describe('describeLoadError', () => {
  it('habla de conexión cuando no hubo respuesta (status 0)', () => {
    const info = describeLoadError(http(0), 'los cursos');
    expect(info.kind).toBe('offline');
    expect(info.canRetry).toBeTrue();
    expect(info.message).toContain('los cursos');
  });

  it('no ofrece reintentar lo que no existe o no se puede ver', () => {
    expect(describeLoadError(http(404)).canRetry).toBeFalse();
    expect(describeLoadError(http(403)).kind).toBe('forbidden');
    expect(describeLoadError(http(401)).kind).toBe('session');
  });

  it('separa servidor, saturación y lentitud', () => {
    expect(describeLoadError(http(500)).kind).toBe('server');
    expect(describeLoadError(http(429)).kind).toBe('rate-limit');
    expect(describeLoadError(http(504)).kind).toBe('timeout');
    expect(describeLoadError({ name: 'TimeoutError' }).kind).toBe('timeout');
  });

  it('nunca muestra textos técnicos', () => {
    for (const s of [0, 400, 401, 403, 404, 408, 429, 500, 502, 503]) {
      const { title, message } = describeLoadError(http(s));
      expect(`${title} ${message}`).not.toMatch(/http|failure|error \d|status/i);
    }
  });

  it('isTransientError: solo red y servidor ocupado', () => {
    expect([0, 408, 429, 502, 503, 504].every(s => isTransientError(http(s)))).toBeTrue();
    expect([400, 401, 403, 404, 500].some(s => isTransientError(http(s)))).toBeFalse();
  });
});

describe('retryTransient', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  it('reintenta un fallo pasajero (503) y entrega el resultado', () => {
    let attempts = 0;
    let value: string | undefined;
    defer(() => { attempts++; return attempts < 2 ? throwError(() => http(503)) : of('ok'); })
      .pipe(retryTransient<string>({ count: 2, baseDelay: 10 }))
      .subscribe(v => (value = v));
    jasmine.clock().tick(50);
    expect(attempts).toBe(2);
    expect(value).toBe('ok');
  });

  it('no reintenta un 404', () => {
    let attempts = 0;
    let failed: unknown;
    defer(() => { attempts++; return throwError(() => http(404)); })
      .pipe(retryTransient<string>({ count: 2, baseDelay: 10 }))
      .subscribe({ error: e => (failed = e) });
    jasmine.clock().tick(100);
    expect(attempts).toBe(1);
    expect((failed as HttpErrorResponse).status).toBe(404);
  });
});

describe('optimisticUpdate', () => {
  it('aplica al instante y deshace si falla', async () => {
    const leidas = signal(0);
    let aviso = '';
    const pending = optimisticUpdate(leidas, n => n + 1, () => throwError(() => http(500)), () => (aviso = 'No se guardó'));
    expect(leidas()).toBe(1);
    await pending;
    expect(leidas()).toBe(0);
    expect(aviso).toBe('No se guardó');
  });

  it('mantiene el cambio si la petición funciona', async () => {
    const fav = signal(false);
    await optimisticUpdate(fav, () => true, () => Promise.resolve('ok'));
    expect(fav()).toBeTrue();
  });
});

@Component({
  imports: [SkeletonComponent, BusyLabelComponent, LoadErrorComponent, ConnectionStatusComponent],
  template: `
    <lib-skeleton shape="course-card" [count]="3" label="Cargando cursos" />
    <lib-skeleton shape="text" [lines]="2" />
    <button><lib-busy-label [busy]="busy()" busyText="Entrando…">Empezar gratis</lib-busy-label></button>
    <lib-load-error [error]="error()" what="los cursos" (retry)="retries = retries + 1" />
    <lib-connection-status [online]="online()" />
  `,
})
class HostComponent {
  readonly busy = signal(false);
  readonly error = signal<unknown>(http(503));
  readonly online = signal(true);
  retries = 0;
}

describe('componentes de carga', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('el esqueleto con etiqueta se anuncia una vez; sin etiqueta es decorativo', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [cards, text] = fixture.nativeElement.querySelectorAll('lib-skeleton');
    expect(cards.getAttribute('role')).toBe('status');
    expect(cards.textContent).toContain('Cargando cursos');
    expect(cards.querySelectorAll('.sk-card').length).toBe(3);
    expect(text.getAttribute('aria-hidden')).toBe('true');
  });

  it('el botón ocupado conserva ambos textos en la misma celda (no cambia de ancho)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();
    const label: HTMLElement = fixture.nativeElement.querySelector('lib-busy-label');
    expect(label.classList).toContain('bl--busy');
    expect(label.querySelector('.bl__idle')?.textContent).toContain('Empezar gratis');
    expect(label.querySelector('.bl__busy')?.textContent).toContain('Entrando…');
  });

  it('el error explica y ofrece «Reintentar»', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement.querySelector('lib-load-error');
    expect(el.querySelector('lib-empty-state')?.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('Inténtalo');
    (el.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.retries).toBe(1);
  });

  it('el aviso de conexión aparece sin red y confirma cuando vuelve', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement.querySelector('lib-connection-status');
    expect(el.textContent?.trim()).toBe('');
    fixture.componentInstance.online.set(false);
    await fixture.whenStable();
    expect(el.textContent).toContain('Sin conexión');
    fixture.componentInstance.online.set(true);
    await fixture.whenStable();
    expect(el.textContent).toContain('Conexión recuperada');
  });
});
