// Extensión de tipos para import.meta.env
interface ImportMetaEnv {
  readonly API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
