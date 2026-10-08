import { browserStorage } from 'shared/core';

describe('browserStorage', () => {
  const key = 'gems-test-browser-storage';

  it('stores, reads and removes values', () => {
    browserStorage.set(key, '1');
    expect(browserStorage.get(key)).toBe('1');
    browserStorage.remove(key);
    expect(browserStorage.get(key)).toBeNull();
  });

  it('never throws when the browser blocks storage', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'removeItem').and.throwError('blocked');
    expect(() => browserStorage.set(key, '1')).not.toThrow();
    expect(browserStorage.get(key)).toBeNull();
    expect(() => browserStorage.remove(key)).not.toThrow();
  });
});
