/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FILEDOM_EXAMPLES_BUNDLES?: string;
  readonly FILEDOM_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
