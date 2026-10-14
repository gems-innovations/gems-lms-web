/** Subdominios que son de la plataforma y no de una institución. */
const RESERVED = new Set(['www', 'lms', 'api', 'app', 'admin', 'auth', 'edu', 'mail', 'static', 'assets', 'cdn',
  // Ambientes y utilidades: nunca son una institución.
  'dev', 'qa', 'pdn', 'prod', 'staging', 'test', 'preview']);

/**
 * Nombre único de la institución, tomado del subdominio: `unal.gemsinnovations.com` → `unal`.
 * En desarrollo sirve `unal.localhost`. Devuelve null en el dominio principal o en cualquier otro host.
 */
export function resolveTenantSlug(host: string | null | undefined, baseDomain: string): string | null {
  const name = (host ?? '').split(':')[0].trim().toLowerCase();
  if (!name) return null;
  const base = baseDomain.trim().toLowerCase().replace(/^\./, '');
  for (const suffix of [base, 'localhost']) {
    if (!suffix || !name.endsWith(`.${suffix}`)) continue;
    const label = name.slice(0, -(suffix.length + 1));
    if (/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(label) && !RESERVED.has(label)) return label;
  }
  return null;
}
