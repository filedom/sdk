import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

const base = process.env.DOMDOC_BASE || "/sdk-docs/examples/solid/";

export default defineConfig({
  base,
  plugins: [excludeEngineWasm(), tailwindcss(), solid()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    "import.meta.env.DOMDOC_EXAMPLES_BUNDLES": JSON.stringify(process.env.DOMDOC_EXAMPLES_BUNDLES ?? ""),
  },
});
