/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DOMDOC_EXAMPLES_BUNDLES?: string;
  readonly DOMDOC_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
