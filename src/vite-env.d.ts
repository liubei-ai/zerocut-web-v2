/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DESKTOP_OAUTH_AK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
