import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from 'shared/core';
import { EmptyStateComponent } from './empty-state.component';
import { EMPTY_STATE_LIMITS, EMPTY_STATES, EmptyStateCopy } from './empty-states.copy';
import { EMPTY_STATE_ICONS } from './empty-state.icons';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <lib-empty-state
      [copy]="copy()"
      [title]="title()"
      [actionLabel]="actionLabel()"
      [actionLink]="actionLink()"
      [secondaryLink]="secondaryLink()"
      [headingLevel]="level()"
      [params]="params()"
      [autofocusAction]="autofocus()"
      (action)="actions = actions + 1"
      (secondaryAction)="secondaries = secondaries + 1" />
  `,
})
class HostComponent {
  readonly copy = signal<EmptyStateCopy | undefined>(EMPTY_STATES.student.myCourses);
  readonly title = signal<string | undefined>(undefined);
  readonly actionLabel = signal<string | undefined>(undefined);
  readonly actionLink = signal<string | undefined>(undefined);
  readonly secondaryLink = signal<string | undefined>(undefined);
  readonly level = signal<2 | 3 | 4>(3);
  readonly params = signal<Record<string, string | number> | undefined>(undefined);
  readonly autofocus = signal(false);
  actions = 0;
  secondaries = 0;
}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const el = (): HTMLElement => fixture.nativeElement.querySelector('lib-empty-state');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(I18nService).set('es'));

  it('pinta título, descripción y las dos acciones del catálogo', () => {
    const copy = EMPTY_STATES.student.myCourses;
    expect(el().querySelector('h3')?.textContent?.trim()).toBe(copy.title);
    expect(el().querySelector('.es__desc')?.textContent?.trim()).toBe(copy.description);
    const buttons = el().querySelectorAll('.es__btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe(copy.action);
    expect(buttons[1].textContent?.trim()).toBe(copy.secondary);
    expect(el().querySelector('.es__tile svg')).not.toBeNull();
  });

  it('enlaza título y descripción para lectores de pantalla y marca el tipo', () => {
    const title = el().querySelector('h3')!;
    expect(el().getAttribute('aria-labelledby')).toBe(title.id);
    expect(el().getAttribute('aria-describedby')).toBe(el().querySelector('.es__desc')!.id);
    expect(el().getAttribute('data-kind')).toBe('first-use');
    expect(el().getAttribute('role')).toBe('group');
    expect(el().querySelector('.es__art')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('anuncia los sin resultados como estado y los errores como alerta', () => {
    host.copy.set(EMPTY_STATES.common.noResults);
    fixture.detectChanges();
    expect(el().getAttribute('role')).toBe('status');
    host.copy.set(EMPTY_STATES.common.error);
    fixture.detectChanges();
    expect(el().getAttribute('role')).toBe('alert');
    expect(el().getAttribute('data-kind')).toBe('error');
  });

  it('los inputs explícitos ganan al catálogo y una etiqueta vacía oculta la acción', () => {
    host.title.set('Otro título');
    host.actionLabel.set('');
    fixture.detectChanges();
    expect(el().querySelector('h3')?.textContent?.trim()).toBe('Otro título');
    const buttons = el().querySelectorAll('.es__btn');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent?.trim()).toBe(EMPTY_STATES.student.myCourses.secondary);
  });

  it('emite action y secondaryAction al pulsar los botones', () => {
    const [primary, secondary] = Array.from(el().querySelectorAll<HTMLButtonElement>('button.es__btn'));
    primary.click();
    secondary.click();
    expect(host.actions).toBe(1);
    expect(host.secondaries).toBe(1);
  });

  it('con actionLink dibuja enlaces navegables', () => {
    host.actionLink.set('/learn/catalog');
    host.secondaryLink.set('/taps');
    fixture.detectChanges();
    const links = el().querySelectorAll<HTMLAnchorElement>('a.es__btn');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/learn/catalog');
    expect(links[1].getAttribute('href')).toBe('/taps');
  });

  it('respeta el nivel de encabezado pedido', () => {
    host.level.set(2);
    fixture.detectChanges();
    expect(el().querySelector('h2.es__title')).not.toBeNull();
    expect(el().querySelector('h3')).toBeNull();
  });

  it('reemplaza marcadores y traduce cuando hay traducción', () => {
    host.copy.set(EMPTY_STATES.common.noSearchResultsFor);
    host.params.set({ q: 'álgebra' });
    fixture.detectChanges();
    expect(el().querySelector('.es__desc')?.textContent).toContain('No encontramos «álgebra»');
    host.copy.set({ kind: 'info', icon: 'inbox', title: 'Sin resultados', description: '' });
    TestBed.inject(I18nService).set('en');
    fixture.detectChanges();
    expect(el().querySelector('.es__title')?.textContent?.trim()).toBe('No results');
    expect(el().querySelector('.es__desc')).toBeNull();
  });

  it('puede llevar el foco a la acción principal', () => {
    host.autofocus.set(true);
    fixture.detectChanges();
    const cmp = fixture.debugElement.children[0].componentInstance as EmptyStateComponent;
    cmp.focusAction();
    expect(document.activeElement?.classList.contains('es__btn--primary')).toBeTrue();
  });

  it('sigue funcionando con el uso anterior (title + description + actionLabel)', () => {
    host.copy.set(undefined);
    host.title.set('Sin grupos');
    host.actionLabel.set('Crear');
    fixture.detectChanges();
    expect(el().getAttribute('data-kind')).toBe('info');
    expect(el().querySelector('.es__title')?.textContent?.trim()).toBe('Sin grupos');
    expect(el().querySelectorAll('.es__btn').length).toBe(1);
  });
});

describe('EMPTY_STATES (catálogo de textos)', () => {
  const entries = Object.entries(EMPTY_STATES).flatMap(([role, group]) =>
    Object.entries(group as Record<string, EmptyStateCopy>).map(([key, copy]) => [`${role}.${key}`, copy] as const));

  it('cumple los límites de longitud: título ≤ 40, texto ≤ 120, botón ≤ 24', () => {
    const tooLong = entries.filter(([, c]) =>
      c.title.length > EMPTY_STATE_LIMITS.title
      || c.description.length > EMPTY_STATE_LIMITS.description
      || (c.action?.length ?? 0) > EMPTY_STATE_LIMITS.action
      || (c.secondary?.length ?? 0) > EMPTY_STATE_LIMITS.action).map(([k]) => k);
    expect(tooLong).toEqual([]);
  });

  it('cada estado tiene un icono conocido y una descripción que explica el porqué', () => {
    for (const [key, c] of entries) {
      expect(EMPTY_STATE_ICONS[c.icon]).withContext(key).toBeDefined();
      expect(c.description.trim().length).withContext(key).toBeGreaterThan(20);
    }
  });

  it('los de sin resultados ofrecen limpiar o borrar (salvo la paleta de comandos)', () => {
    const missing = entries.filter(([k, c]) => c.kind === 'no-results' && !c.action && k !== 'public.search');
    expect(missing.map(([k]) => k)).toEqual([]);
  });

  it('no usa emojis', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    const withEmoji = entries.filter(([, c]) =>
      [c.title, c.description, c.action ?? '', c.secondary ?? ''].some(t => emoji.test(t))).map(([k]) => k);
    expect(withEmoji).toEqual([]);
  });
});
