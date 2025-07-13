declare module '*.css';

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MGDRIVE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}