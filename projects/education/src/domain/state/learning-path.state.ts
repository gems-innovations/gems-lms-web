import { Injectable, signal, computed } from '@angular/core';
import { ILearningPath } from '../model/learning-path.model';

interface ILearningPathStateData {
  learningPaths: ILearningPath[];
  selectedLearningPath: ILearningPath | null;
}

const INITIAL: ILearningPathStateData = {
  learningPaths: [],
  selectedLearningPath: null
};

@Injectable({ providedIn: 'root' })
export class LearningPathState {
  private readonly _state = signal<ILearningPathStateData>(INITIAL);

  readonly learningPaths = computed(() => this._state().learningPaths);
  readonly selectedLearningPath = computed(() => this._state().selectedLearningPath);

  setLearningPaths(learningPaths: ILearningPath[]): void {
    this._state.update(s => ({ ...s, learningPaths }));
  }

  setSelectedLearningPath(lp: ILearningPath | null): void {
    this._state.update(s => ({ ...s, selectedLearningPath: lp }));
  }

  updateLearningPath(lp: ILearningPath): void {
    this._state.update(s => ({
      ...s,
      learningPaths: s.learningPaths.map(l => (l.id === lp.id ? lp : l)),
      selectedLearningPath: s.selectedLearningPath?.id === lp.id ? lp : s.selectedLearningPath
    }));
  }

  removeLearningPath(id: string): void {
    this._state.update(s => ({
      ...s,
      learningPaths: s.learningPaths.filter(l => l.id !== id),
      selectedLearningPath: s.selectedLearningPath?.id === id ? null : s.selectedLearningPath
    }));
  }
}
