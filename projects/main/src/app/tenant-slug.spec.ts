import { resolveTenantSlug } from './tenant-slug';

describe('resolveTenantSlug', () => {
  const base = 'gemsinnovations.com';

  it('takes the institution name from the subdomain', () => {
    expect(resolveTenantSlug('unal.gemsinnovations.com', base)).toBe('unal');
    expect(resolveTenantSlug('UNAL.gemsinnovations.com:443', base)).toBe('unal');
  });

  it('supports *.localhost for development', () => {
    expect(resolveTenantSlug('unal.localhost:4200', base)).toBe('unal');
  });

  it('ignores the platform hosts', () => {
    expect(resolveTenantSlug('lms.gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug('www.gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug('gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug('qa.gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug('dev.gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug('localhost:4200', base)).toBeNull();
  });

  it('ignores other domains and nested subdomains', () => {
    expect(resolveTenantSlug('unal.example.com', base)).toBeNull();
    expect(resolveTenantSlug('a.b.gemsinnovations.com', base)).toBeNull();
    expect(resolveTenantSlug(null, base)).toBeNull();
  });
});
