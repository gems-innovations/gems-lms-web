import { TestBed, ComponentFixture } from '@angular/core/testing';
import { GradebookPanel } from './gradebook-panel';
import type { IGradebookItem } from 'education';
import type { IGradebookStudentRow } from '../../../../domain/model/instructor.model';

describe('GradebookPanel', () => {
  let fixture: ComponentFixture<GradebookPanel>;
  let el: HTMLElement;

  const items: IGradebookItem[] = [
    { blockId: '7', lessonId: '1', type: 'quiz', title: 'Quiz', weight: 1 },
    { blockId: '9', lessonId: '1', type: 'assignment', title: 'Tarea', weight: 3 },
  ];
  const rows: IGradebookStudentRow[] = [{
    studentId: '5', enrollmentId: '50', enrollmentStatus: 'active',
    student: { id: '5', firstName: 'María', lastName: 'López', email: 'maria@unal.edu.co' },
    cells: [
      { blockId: '7', score: 80, state: 'graded', attempts: 2 },
      { blockId: '9', score: null, state: 'pending', attempts: 0, submissionId: '30' },
    ],
    currentGrade: 80, finalGrade: 20,
  }];

  beforeEach(() => {
    fixture = TestBed.createComponent(GradebookPanel);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('shows each evaluation with its share of the grade and the weighted grades', () => {
    const headers = Array.from(el.querySelectorAll('thead th')).map(th => th.textContent!.replace(/\s+/g, ' ').trim());
    expect(headers[1]).toContain('Peso 1 · 25%');
    expect(headers[2]).toContain('Peso 3 · 75%');
    const cells = Array.from(el.querySelectorAll('tbody td')).map(td => td.textContent!.trim());
    expect(cells).toEqual(['80', 'Por calificar', '80', '20']);
  });

  it('opens a pending submission and emits the edited weights', () => {
    const opened: unknown[] = [];
    const saved: unknown[] = [];
    fixture.componentInstance.openSubmission.subscribe(e => opened.push(e));
    fixture.componentInstance.saveWeights.subscribe(w => saved.push(w));

    (el.querySelector('.gbook__pending') as HTMLButtonElement).click();
    expect(opened).toEqual([{ blockId: '9', studentId: '5' }]);

    const buttons = () => Array.from(el.querySelectorAll('lib-button button')) as HTMLButtonElement[];
    buttons().find(b => b.textContent!.includes('Editar pesos'))!.click();
    fixture.detectChanges();
    const input = el.querySelector('.gbook__weight-input') as HTMLInputElement;
    input.value = '2';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttons().find(b => b.textContent!.includes('Guardar pesos'))!.click();
    expect(saved).toEqual([{ '7': 2, '9': 3 }]);
  });
});
