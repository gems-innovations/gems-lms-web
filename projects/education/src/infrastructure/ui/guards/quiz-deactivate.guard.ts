import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanDeactivateQuiz {
  canDeactivate(): Observable<boolean> | boolean;
}

export const quizDeactivateGuard: CanDeactivateFn<CanDeactivateQuiz> = component =>
  component.canDeactivate();
