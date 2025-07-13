declare module '*.css';

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MGDRIVE_API_BASE_URL: string;
  readonly VITE_AISHA_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}