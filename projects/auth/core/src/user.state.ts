import { computed, Injectable, signal } from '@angular/core';
import { IUser } from './user.model';

export interface IUserState {
  users: IUser[];
  currentUser: IUser | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserState {
  private readonly _state = signal<IUserState>({
    users: [],
    currentUser: null,
  });

  //#region Computed
  readonly currentUser = computed(() => this._state().currentUser);
  //#endregion

  //#region Setters
  setCurrentUser(user: IUser) {
    this._state.update(state => ({
      ...state,
      currentUser: user,
      lastUpdated: new Date()
    }));
  }

  clearCurrentUser() {
    this._state.update(state => ({ ...state, currentUser: null }));
  }
  //#endregion
}
