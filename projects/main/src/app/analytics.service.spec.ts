import { toAnalyticsPath } from './analytics.service';

describe('toAnalyticsPath', () => {
  it('quita la query y el fragmento', () => {
    expect(toAnalyticsPath('/learn/catalog?q=docker#top')).toBe('/learn/catalog');
  });

  it('agrupa ids numéricos y uuid', () => {
    expect(toAnalyticsPath('/learn/courses/13/community?tab=forum')).toBe('/learn/courses/:id/community');
    expect(toAnalyticsPath('/education/courses/3f2b1c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/edit')).toBe('/education/courses/:id/edit');
  });

  it('oculta tokens largos', () => {
    expect(toAnalyticsPath('/auth/reset/abcDEF1234567890xyz')).toBe('/auth/reset/:token');
  });

  it('conserva la raíz', () => {
    expect(toAnalyticsPath('/')).toBe('/');
  });
});
