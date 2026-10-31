import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const { excludeEngineWasm } = createRequire(import.meta.url)("../exclude-engine-wasm.cjs") as {
  excludeEngineWasm: () => { name: string };
};

const base = process.env.DOMDOC_BASE || "/sdk-docs/examples/astro/";

export default defineConfig({
  output: "static",
  trailingSlash: "always",
  base,
  vite: {
    plugins: [excludeEngineWasm(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    define: {
      "import.meta.env.DOMDOC_EXAMPLES_BUNDLES": JSON.stringify(process.env.DOMDOC_EXAMPLES_BUNDLES ?? ""),
    },
  },
});
