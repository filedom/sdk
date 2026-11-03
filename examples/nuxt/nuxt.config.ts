import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { defineNuxtConfig } from "nuxt/config";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

function withSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

const baseURL = withSlash(process.env.FILEDOM_BASE || "/sdk/docs/examples/nuxt/");

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2026-10-31",
  app: {
    baseURL,
    head: { title: "filedom Nuxt" },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [excludeEngineWasm(), tailwindcss()],
    envPrefix: ["VITE_", "FILEDOM_"],
    define: {
      "import.meta.env.FILEDOM_EXAMPLES_BUNDLES": JSON.stringify(process.env.FILEDOM_EXAMPLES_BUNDLES ?? ""),
    },
  },
});
