import { Injectable, computed, signal } from '@angular/core';
import { IInstitution } from '../model/institution';

export interface IInstitutionState {
  institutions: IInstitution[];
  selectedInstitution: IInstitution | null;
}

const INITIAL_STATE: IInstitutionState = {
  institutions: [],
  selectedInstitution: null
};

@Injectable({
  providedIn: 'root'
})
export class InstitutionState {
  private readonly _state = signal<IInstitutionState>(INITIAL_STATE);

  //#region Computed
  readonly institutions = computed(() => this._state().institutions);
  readonly selectedInstitution = computed(() => this._state().selectedInstitution);
  //#endregion

  //#region Setters
  setInstitutions(institutions: IInstitution[]): void {
    this._state.update(state => ({
      ...state,
      institutions
    }));
  }

  setSelectedInstitution(institution: IInstitution | null): void {
    this._state.update(state => ({
      ...state,
      selectedInstitution: institution
    }));
  }
  //#endregion
}