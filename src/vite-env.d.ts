/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NATIVE_PHONE_AUTH_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
