import { mapNotification } from './notification.service';

describe('mapNotification', () => {
  const base = { id: 1, type: 'SUBMISSION' as never, title: 't', message: 'm', courseId: 5, referenceId: null, read: false };

  it('lee la hora sin zona del API como UTC', () => {
    expect(mapNotification({ ...base, createdAt: '2026-10-29T22:36:00' }).createdAt.toISOString()).toBe('2026-10-29T22:36:00.000Z');
  });

  it('respeta la zona cuando el API ya la manda', () => {
    expect(mapNotification({ ...base, createdAt: '2026-10-29T17:36:00-05:00' }).createdAt.toISOString()).toBe('2026-10-29T22:36:00.000Z');
  });
});
