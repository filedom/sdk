import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

const base = process.env.FILEDOM_BASE || "/sdk-docs/examples/lit/";

export default defineConfig({
  base,
  plugins: [excludeEngineWasm(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    "import.meta.env.FILEDOM_EXAMPLES_BUNDLES": JSON.stringify(process.env.FILEDOM_EXAMPLES_BUNDLES ?? ""),
  },
});
