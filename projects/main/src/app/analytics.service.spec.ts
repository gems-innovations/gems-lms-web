import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService, toAnalyticsPath } from './analytics.service';
import {
  INTERNAL_KEY, arrivalEvent, eventSlug, internalFlagFrom, isAutomatedTraffic, isoWeek, localDay, parseVisitState, returnBucket, visitEvents,
} from './analytics-taxonomy';

describe('toAnalyticsPath', () => {
  it('quita la query y el fragmento', () => {
    expect(toAnalyticsPath('/learn/catalog?q=docker#top')).toBe('/learn/catalog');
  });

  it('agrupa ids numéricos y uuid', () => {
    expect(toAnalyticsPath('/learn/courses/13/community?tab=forum')).toBe('/learn/courses/:id/community');
    expect(toAnalyticsPath('/education/courses/3f2b1c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/edit')).toBe('/education/courses/:id/edit');
  });

  it('oculta tokens largos', () => {
    expect(toAnalyticsPath('/auth/reset/abcDEF1234567890xyz')).toBe('/auth/reset/:token');
  });

  it('conserva la raíz', () => {
    expect(toAnalyticsPath('/')).toBe('/');
  });
});

describe('AnalyticsService', () => {
  type TWin = { goatcounter?: unknown };
  let count: jasmine.Spy;
  let service: AnalyticsService;

  beforeEach(() => {
    localStorage.removeItem(INTERNAL_KEY);
    count = jasmine.createSpy('count');
    (window as unknown as TWin).goatcounter = { count };
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    delete (window as unknown as TWin).goatcounter;
    localStorage.removeItem(INTERNAL_KEY);
  });

  it('envía la acción como evento, con nombres antiguos y con detalle en el path', () => {
    service.event('taps-ver');
    service.event('taps/ver/redstone');
    expect(count).toHaveBeenCalledWith({ path: 'taps-ver', title: 'taps-ver', event: true });
    expect(count).toHaveBeenCalledWith({ path: 'taps/ver/redstone', title: 'taps/ver/redstone', event: true });
  });

  it('no cuenta nada en un navegador del equipo', () => {
    localStorage.setItem(INTERNAL_KEY, 't');
    expect(service.isInternal()).toBeTrue();
    service.event('cuenta-creada');
    expect(count).not.toHaveBeenCalled();
  });

  it('guarda las acciones hasta que carga count.js', () => {
    delete (window as unknown as TWin).goatcounter;
    const script = document.createElement('script');
    script.id = 'goatcounter-script';
    document.body.appendChild(script);
    try {
      service.event('taps-responder');
      service.event('taps-completar');
      expect(count).not.toHaveBeenCalled();
      (window as unknown as TWin).goatcounter = { count };
      script.dispatchEvent(new Event('load'));
      expect(count.calls.allArgs().map(([v]) => v.path)).toEqual(['taps-responder', 'taps-completar']);
    } finally {
      script.remove();
    }
  });
});

describe('taxonomía de eventos', () => {
  const HOST = 'lms.gemsinnovations.com';

  it('eventSlug deja un segmento seguro', () => {
    expect(eventSlug('Redstone Básico!')).toBe('redstone-basico');
    expect(eventSlug('')).toBe('otro');
    expect(eventSlug('a'.repeat(60)).length).toBe(40);
  });

  it('isAutomatedTraffic descarta rastreadores e iPhone anteriores a iOS 14, y deja pasar a las personas y a Playwright', () => {
    expect(isAutomatedTraffic('Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1')).toBeTrue();
    expect(isAutomatedTraffic('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBeTrue();
    expect(isAutomatedTraffic('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBeTrue();
    expect(isAutomatedTraffic('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1')).toBeFalse();
    expect(isAutomatedTraffic('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Version/14.0 Mobile/15E148 Safari/604.1')).toBeFalse();
    expect(isAutomatedTraffic('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36')).toBeFalse();
    expect(isAutomatedTraffic('')).toBeFalse();
  });

  it('internalFlagFrom lee ?interno', () => {
    expect(internalFlagFrom('?interno=1')).toBeTrue();
    expect(internalFlagFrom('?utm_source=x&interno=0')).toBeFalse();
    expect(internalFlagFrom('?utm_source=x')).toBeNull();
  });

  it('arrivalEvent prioriza utm, luego el referente, y agrega el video', () => {
    expect(arrivalEvent('?utm_source=YouTube&utm_content=Redstone-1', '', HOST)).toBe('llegada/youtube/redstone-1');
    expect(arrivalEvent('?r=cofre-3', 'https://www.youtube.com/', HOST)).toBe('llegada/youtube/cofre-3');
    expect(arrivalEvent('', 'https://l.instagram.com/?u=x', HOST)).toBe('llegada/instagram');
    expect(arrivalEvent('', 'https://www.google.com.pe/', HOST)).toBe('llegada/google');
    expect(arrivalEvent('?t=redstone', '', HOST)).toBe('llegada/compartido');
    expect(arrivalEvent('', '', HOST)).toBe('llegada/directo');
    expect(arrivalEvent('', 'https://ejemplo.org/', HOST)).toBe('llegada/otro');
  });

  it('arrivalEvent ignora la navegación desde el propio sitio', () => {
    expect(arrivalEvent('', 'https://lms.gemsinnovations.com/retos', HOST)).toBeNull();
    expect(arrivalEvent('', 'https://knowledgecraft.gemsinnovations.com/', HOST)).toBeNull();
  });

  it('isoWeek usa la semana ISO (el jueves decide el año)', () => {
    expect(isoWeek('2026-10-18')).toBe('2026-s42');
    expect(isoWeek('2027-01-01')).toBe('2026-s53');
    expect(isoWeek('2024-12-30')).toBe('2025-s01');
  });

  it('visitEvents: primera visita, regreso D1 y D7 una sola vez por tramo', () => {
    const first = visitEvents('2026-10-18', null);
    expect(first.events).toEqual(['visita/nueva']);
    expect(visitEvents('2026-10-18', first.state).events).toEqual([]);

    const d1 = visitEvents('2026-10-19', first.state);
    expect(d1.events).toEqual(['regreso/d1/2026-s42']);
    expect(visitEvents('2026-10-19', d1.state).events).toEqual([]);

    const d7 = visitEvents('2026-10-26', d1.state);
    expect(d7.events).toEqual(['regreso/d7-13/2026-s42']);
    expect(d7.state.regresos).toEqual(['d1', 'd7-13']);
    expect(visitEvents('2026-12-01', d7.state).events).toEqual([]);
  });

  it('returnBucket y parseVisitState toleran datos raros', () => {
    expect(returnBucket(0)).toBeNull();
    expect(returnBucket(3)).toBe('d2-6');
    expect(returnBucket(20)).toBe('d14-29');
    expect(parseVisitState('no-json')).toBeNull();
    expect(parseVisitState('{"primera":"2026-10-18"}')).toEqual({ primera: '2026-10-18', regresos: [] });
    expect(visitEvents('2026-10-18', { primera: 'basura', regresos: [] }).events).toEqual(['visita/nueva']);
  });

  it('localDay da la fecha local', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
