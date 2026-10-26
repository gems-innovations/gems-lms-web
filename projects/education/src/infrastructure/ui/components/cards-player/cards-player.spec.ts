import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICard } from '../../../../domain/model/course.model';
import { CardsPlayerComponent } from './cards-player';

const CARDS: ICard[] = [
  { kind: 'idea', label: 'Idea', title: 'Primera', text: 'Texto' },
  { kind: 'question', label: 'Pruébalo', question: '¿2+2?', options: ['3', '4'], answer: 1, why: 'Porque suma.' },
  { kind: 'steps', label: 'Pasos', title: 'Receta', steps: ['uno', 'dos'] },
];

describe('CardsPlayerComponent', () => {
  let fixture: ComponentFixture<CardsPlayerComponent>;
  let el: HTMLElement;
  let done: number;

  const next = () => (el.querySelector('.cp__btn--next') as HTMLButtonElement);

  beforeEach(() => {
    fixture = TestBed.createComponent(CardsPlayerComponent);
    fixture.componentRef.setInput('cards', CARDS);
    done = 0;
    fixture.componentInstance.completed.subscribe(() => done++);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('las ideas dejan avanzar; la pregunta no, hasta responder', () => {
    expect(next().disabled).toBeFalse();
    next().click(); fixture.detectChanges();
    expect(next().disabled).toBeTrue();
    (el.querySelectorAll('.card__opt')[1] as HTMLButtonElement).click(); fixture.detectChanges();
    expect(next().disabled).toBeFalse();
    expect(el.querySelector('.card__why')?.textContent).toContain('Porque suma.');
  });

  it('los pasos aparecen uno a uno y avisan solo al terminar todas las cartas', () => {
    next().click(); fixture.detectChanges();
    (el.querySelectorAll('.card__opt')[1] as HTMLButtonElement).click(); fixture.detectChanges();
    next().click(); fixture.detectChanges();
    expect(el.querySelectorAll('.card__step').length).toBe(0);
    expect(next().disabled).toBeTrue();
    (el.querySelector('.cp__btn--sub') as HTMLButtonElement).click(); fixture.detectChanges();
    (el.querySelector('.cp__btn--sub') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(el.querySelectorAll('.card__step').length).toBe(2);
    expect(done).toBe(0);
    next().click(); fixture.detectChanges();
    expect(done).toBe(1);
    expect(el.textContent).toContain('1 de 1 bien al primer intento');
    expect(next()).withContext('en la pantalla final no se pide «Responde para seguir»').toBeNull();
  });
});
