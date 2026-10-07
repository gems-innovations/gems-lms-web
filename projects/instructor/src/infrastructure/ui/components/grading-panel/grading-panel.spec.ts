import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { GradingPanel } from './grading-panel';
import type { IAssignmentEntry, ISubmissionRow, IGradeSubmitEvent } from '../../../../domain/model/instructor.model';

describe('GradingPanel with a rubric', () => {
  let fixture: ComponentFixture<GradingPanel>;
  let el: HTMLElement;

  const assignment = {
    block: {
      id: '9', type: 'assignment', title: 'Tarea', duration: 0, order: 1, isRequired: true,
      rubric: [
        { id: 'r1', criterion: 'Contenido', maxPoints: 60 },
        { id: 'r2', criterion: 'Forma', maxPoints: 40 },
      ],
    },
    lessonTitle: 'Lección', moduleTitle: 'Módulo', submittedCount: 1, pendingCount: 1, gradedCount: 0,
  } as unknown as IAssignmentEntry;

  const submission = {
    id: '30', blockId: '9', lessonId: '1', courseId: '3', submittedAt: new Date(), status: 'pending',
    student: { id: '5', firstName: 'María', lastName: 'López', email: 'maria@unal.edu.co' },
  } as ISubmissionRow;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideMarkdown()] });
    fixture = TestBed.createComponent(GradingPanel);
    fixture.componentRef.setInput('selectedAssignment', assignment);
    fixture.componentRef.setInput('selectedSubmission', submission);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  async function setPoints(index: number, value: string): Promise<void> {
    const input = el.querySelectorAll<HTMLInputElement>('.gpanel__criterion-points')[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('computes the grade from the criteria and emits the rubric scores', async () => {
    const events: IGradeSubmitEvent[] = [];
    fixture.componentInstance.gradeSubmit.subscribe(e => events.push(e));
    expect(el.querySelectorAll('.gpanel__criterion').length).toBe(2);
    expect(el.querySelector('.gpanel__grade-number')).toBeNull();

    await setPoints(0, '45');
    await setPoints(1, '30');
    expect(el.querySelector('.gpanel__rubric .gpanel__grade-display')!.textContent).toContain('75');

    const save = Array.from(el.querySelectorAll<HTMLButtonElement>('lib-button button')).find(b => b.textContent!.includes('Guardar'))!;
    save.click();
    expect(events.length).toBe(1);
    expect(events[0].grade).toBe(75);
    expect(events[0].rubricScores).toEqual([{ criterionId: 'r1', score: 45 }, { criterionId: 'r2', score: 30 }]);
  });

  it('does not submit while a criterion is out of range', async () => {
    const events: IGradeSubmitEvent[] = [];
    fixture.componentInstance.gradeSubmit.subscribe(e => events.push(e));
    await setPoints(0, '61');
    await setPoints(1, '10');
    expect(el.querySelector('.gpanel__rubric-error')).not.toBeNull();
    Array.from(el.querySelectorAll<HTMLButtonElement>('lib-button button')).find(b => b.textContent!.includes('Guardar'))!.click();
    expect(events.length).toBe(0);
  });
});
