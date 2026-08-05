import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SurveyService, GroupService } from 'education';
import type {
  ICourseSurvey, ISurveySection, ISurveyResponse, TSurveyQuestionType,
} from 'education';

export interface IScaleStat {
  questionId: string;
  label: string;
  sectionTitle: string;
  avg: number;
  count: number;
  distribution: number[];   // conteo por valor 1..10 (índice 0 = valor 1)
}

export interface ITextAnswerGroup {
  questionId: string;
  label: string;
  answers: { studentName: string; text: string }[];
}

type TSurveyMode = 'edit' | 'results';

let uid = 0;
const newId = (prefix: string): string => `${prefix}-${Date.now()}-${uid++}`;

@Injectable()
export class SurveyEditorUseCase {
  private readonly surveyService = inject(SurveyService);
  private readonly groupService  = inject(GroupService);

  private readonly _survey    = signal<ICourseSurvey | null>(null);
  private readonly _responses = signal<ISurveyResponse[]>([]);
  private readonly _isLoading = signal(true);
  private readonly _isSaving  = signal(false);
  private readonly _mode      = signal<TSurveyMode>('edit');
  private courseId = '';

  readonly survey    = this._survey.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving  = this._isSaving.asReadonly();
  readonly mode      = this._mode.asReadonly();
  readonly responseCount = computed(() => this._responses().length);

  readonly scaleStats = computed<IScaleStat[]>(() => {
    const survey = this._survey();
    const responses = this._responses();
    if (!survey) return [];
    const stats: IScaleStat[] = [];
    for (const sec of survey.sections) {
      for (const q of sec.questions) {
        if (q.type !== 'scale') continue;
        const values = responses
          .map(r => r.answers.find(a => a.questionId === q.id)?.value)
          .filter((v): v is number => typeof v === 'number');
        const dist = Array(10).fill(0);
        values.forEach(v => { if (v >= 1 && v <= 10) dist[v - 1]++; });
        stats.push({
          questionId: q.id, label: q.label, sectionTitle: sec.title,
          avg: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0,
          count: values.length,
          distribution: dist,
        });
      }
    }
    return stats;
  });

  readonly textAnswers = computed<ITextAnswerGroup[]>(() => {
    const survey = this._survey();
    const responses = this._responses();
    if (!survey) return [];
    const groups: ITextAnswerGroup[] = [];
    for (const sec of survey.sections) {
      for (const q of sec.questions) {
        if (q.type !== 'text') continue;
        const answers = responses
          .map(r => ({ studentName: r.studentName, text: String(r.answers.find(a => a.questionId === q.id)?.value ?? '').trim() }))
          .filter(a => a.text.length > 0);
        groups.push({ questionId: q.id, label: q.label, answers });
      }
    }
    return groups;
  });

  init(courseId: string, groupId?: string): void {
    this.courseId = courseId;
    this._isLoading.set(true);
    forkJoin({
      survey:    this.surveyService.getSurvey(courseId),
      responses: this.surveyService.getResponses(courseId),
      group:     this.groupService.getGroup(groupId ?? ''),
    }).subscribe(({ survey, responses, group }) => {
      this._survey.set(survey ?? this.blankSurvey(courseId));
      // Filtra las respuestas a los estudiantes del grupo/cohorte (si aplica).
      const studentSet = group ? new Set(group.studentIds) : null;
      this._responses.set(studentSet ? responses.filter(r => studentSet.has(r.studentId)) : responses);
      this._isLoading.set(false);
    });
  }

  private blankSurvey(courseId: string): ICourseSurvey {
    return {
      id: newId('sv'), courseId,
      title: 'Encuesta de retroalimentación del curso',
      description: 'Tu opinión nos ayuda a mejorar el curso.',
      sections: [], isPublished: false,
    };
  }

  setMode(mode: TSurveyMode): void { this._mode.set(mode); }

  private patch(fn: (s: ICourseSurvey) => ICourseSurvey): void {
    this._survey.update(s => (s ? fn(s) : s));
  }

  setTitle(title: string): void { this.patch(s => ({ ...s, title })); }
  setDescription(description: string): void { this.patch(s => ({ ...s, description })); }

  addSection(): void {
    this.patch(s => ({
      ...s,
      sections: [...s.sections, { id: newId('sec'), title: 'Nueva sección', description: '', questions: [] }],
    }));
  }
  removeSection(sectionId: string): void {
    this.patch(s => ({ ...s, sections: s.sections.filter(sec => sec.id !== sectionId) }));
  }
  updateSection(sectionId: string, patch: Partial<ISurveySection>): void {
    this.patch(s => ({ ...s, sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, ...patch } : sec) }));
  }

  addQuestion(sectionId: string, type: TSurveyQuestionType): void {
    this.patch(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId
        ? { ...sec, questions: [...sec.questions, { id: newId('q'), type, label: '' }] }
        : sec),
    }));
  }
  removeQuestion(sectionId: string, questionId: string): void {
    this.patch(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId
        ? { ...sec, questions: sec.questions.filter(q => q.id !== questionId) }
        : sec),
    }));
  }
  setQuestionLabel(sectionId: string, questionId: string, label: string): void {
    this.patch(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId
        ? { ...sec, questions: sec.questions.map(q => q.id === questionId ? { ...q, label } : q) }
        : sec),
    }));
  }
  setQuestionType(sectionId: string, questionId: string, type: TSurveyQuestionType): void {
    this.patch(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId
        ? { ...sec, questions: sec.questions.map(q => q.id === questionId ? { ...q, type } : q) }
        : sec),
    }));
  }

  save(): void {
    const survey = this._survey();
    if (!survey) return;
    this._isSaving.set(true);
    this.surveyService.saveSurvey(survey).subscribe(saved => {
      this._survey.set(saved);
      this._isSaving.set(false);
    });
  }

  togglePublish(): void {
    const survey = this._survey();
    if (!survey) return;
    const next = !survey.isPublished;
    // Guarda los cambios actuales antes de (des)publicar.
    this.surveyService.saveSurvey({ ...survey, isPublished: next }).subscribe(() => {
      this.surveyService.publishSurvey(this.courseId, next).subscribe(updated => {
        if (updated) this._survey.set(updated);
      });
    });
  }
}
