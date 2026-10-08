import { EUserRole, mapUser, toApiRole, toUserRole } from 'auth/core';

describe('user mapper', () => {
  it('maps the API user to the front model', () => {
    const user = mapUser({
      userId: 7, firstName: 'Ana', lastName: 'Pérez', username: 'ana', email: 'ana@x.edu', role: 'INSTRUCTOR',
      institutionId: null, avatarUrl: null, active: true, createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z',
    });
    expect(user.id).toBe('7');
    expect(user.role).toBe(EUserRole.INSTRUCTOR);
    expect(user.institutionId).toBeUndefined();
    expect(user.avatarUrl).toBeUndefined();
    expect(user.isActive).toBeTrue();
    expect(user.createdAt).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('converts roles in both directions', () => {
    expect(toUserRole('SUPER_ADMIN')).toBe(EUserRole.SUPER_ADMIN);
    expect(toApiRole(EUserRole.STUDENT)).toBe('STUDENT');
  });
});
