import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { defineConfig } from "vite";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

export default defineConfig({
  plugins: [excludeEngineWasm(), tailwindcss(), sveltekit()],
  envPrefix: ["VITE_", "FILEDOM_"],
});
