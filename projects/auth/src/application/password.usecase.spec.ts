import { PASSWORD_RULE, PasswordUseCase } from './password.usecase';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserService } from '../infrastructure/services/user.service';
import { AuthSessionService } from 'auth/core';

describe('PASSWORD_RULE', () => {
  it('accepts what the API accepts', () => {
    expect(PASSWORD_RULE.test('Clave123!')).toBeTrue();
    expect(PASSWORD_RULE.test('aB3$xxxx')).toBeTrue();
  });

  it('rejects short passwords or ones missing a required kind of character', () => {
    expect(PASSWORD_RULE.test('aB3!xxx')).toBeFalse();     // 7 characters
    expect(PASSWORD_RULE.test('clave123!')).toBeFalse();   // no uppercase
    expect(PASSWORD_RULE.test('CLAVE123!')).toBeFalse();   // no lowercase
    expect(PASSWORD_RULE.test('Claveabc!')).toBeFalse();   // no digit
    expect(PASSWORD_RULE.test('Clave1234')).toBeFalse();   // no symbol
    expect(PASSWORD_RULE.test('Clave123#')).toBeFalse();   // # is not one of @$!%*?&
  });
});

describe('PasswordUseCase session renewal', () => {
  let useCase: PasswordUseCase;
  let users: jasmine.SpyObj<UserService>;
  let session: any;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    users = jasmine.createSpyObj('UserService', ['changePassword', 'login']);
    session = {
      user: () => ({ email: 'ana@unal.edu.co' }), mustChangePassword: () => true,
      saveSession: jasmine.createSpy('saveSession'), getHomeRoute: () => '/student',
    };
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({ providers: [
      { provide: UserService, useValue: users },
      { provide: AuthSessionService, useValue: session },
      { provide: Router, useValue: router },
    ] });
    useCase = TestBed.inject(PasswordUseCase);
  });

  it('obtains a fresh token with the new password before navigating', () => {
    const user = { id: '7' } as any;
    users.changePassword.and.returnValue(of(undefined));
    users.login.and.returnValue(of({ user, token: 'fresh-token', mustChangePassword: false }));
    useCase.changePassword('Old1!aaa', 'New1!aaa');
    expect(users.login).toHaveBeenCalledWith({ email: 'ana@unal.edu.co', password: 'New1!aaa' });
    expect(session.saveSession).toHaveBeenCalledWith(user, 'fresh-token', false);
    expect(router.navigate).toHaveBeenCalledWith(['/student']);
  });

  it('does not navigate or save a session when renewal fails', () => {
    users.changePassword.and.returnValue(of(undefined));
    users.login.and.returnValue(throwError(() => new Error('Unavailable')));
    useCase.changePassword('Old1!aaa', 'New1!aaa');
    expect(session.saveSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(useCase.error()).toBeTruthy();
  });
});
