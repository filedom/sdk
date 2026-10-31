import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { defineNuxtConfig } from "nuxt/config";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

function withSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

const baseURL = withSlash(process.env.DOMDOC_BASE || "/sdk-docs/examples/nuxt/");

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2026-10-31",
  app: {
    baseURL,
    head: { title: "domdoc Nuxt" },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [excludeEngineWasm(), tailwindcss()],
    envPrefix: ["VITE_", "DOMDOC_"],
    define: {
      "import.meta.env.DOMDOC_EXAMPLES_BUNDLES": JSON.stringify(process.env.DOMDOC_EXAMPLES_BUNDLES ?? ""),
    },
  },
});
