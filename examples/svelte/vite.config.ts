import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

/** Public path for this example. The site build sets FILEDOM_BASE; local builds use the same default. */
function publicBase(): string {
  const value = process.env.FILEDOM_BASE || "/sdk-docs/examples/svelte/";
  const withLeading = value.startsWith("/") ? value : `/${value}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export default defineConfig({
  base: publicBase(),
  envPrefix: ["VITE_", "FILEDOM_"],
  plugins: [excludeEngineWasm(), tailwindcss(), svelte()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
