/// <reference types="vite/client" />

declare global {
  namespace App {}

  interface ImportMetaEnv {
    readonly FILEDOM_EXAMPLES_BUNDLES?: string;
  }
}

export {};
