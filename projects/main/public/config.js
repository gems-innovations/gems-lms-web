// Runtime configuration, loaded by index.html before the app.
// In production, set the API (api-gateway) URL here, e.g.:
//   globalThis.API_BASE_URL = 'https://api.example.com/api/v1';
// When the app is served by its SSR server (npm run serve:ssr:main), this file is generated from the
// API_BASE_URL environment variable instead.
// Institutions get their own home at <slug>.<TENANT_BASE_DOMAIN>; set it here for static hosting:
//   globalThis.TENANT_BASE_DOMAIN = 'gemsinnovations.com';  (default) Without a value the app uses http://localhost:8080/api/v1.
// Feature flag tapsCreador (PR-W0): true adds the "Preguntas" step (question editor) to /crear. Off by default here; in production
// deploy/40-gems-config.sh turns it on (TAPS_CREADOR=0 turns it off). In development, /crear?editor=1 also turns it on.
globalThis.tapsCreador ??= false;   // ??= so a test can switch it on before this file runs
