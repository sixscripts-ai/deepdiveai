/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GEMINI_API_KEY: string;
  // Other environment variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}