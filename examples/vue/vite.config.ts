import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

function publicBase(fallback: string): string {
  const raw = process.env.FILEDOM_BASE || fallback;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig({
  base: publicBase("/sdk/docs/examples/vue/"),
  envPrefix: ["VITE_", "FILEDOM_"],
  plugins: [excludeEngineWasm(), vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
